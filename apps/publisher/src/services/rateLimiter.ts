/**
 * Rate limiter service for KDP publishing
 * Enforces daily limits with persistent JSON storage
 * (Designed to be easily migrated to SQLite in the future)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

export interface RateLimitConfig {
  dailyLimit: number;
  resetHour?: number; // Hour of day to reset (0-23, default 0 for midnight)
}

export interface RateLimitStatus {
  platform: string;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  resetTime: Date;
  lastPublish?: Date;
}

export interface RateLimitRecord {
  platform: string;
  date: string; // YYYY-MM-DD format
  count: number;
  publishes: Array<{
    bookSlug: string;
    timestamp: string;
  }>;
}

export interface RateLimitDatabase {
  records: RateLimitRecord[];
  lastUpdated: string;
}

export class RateLimitExceededError extends Error {
  constructor(
    public platform: string, 
    public currentCount: number,
    public limit: number,
    public resetTime: Date
  ) {
    super(`Daily rate limit exceeded for ${platform}. ${currentCount}/${limit} books published today. Resets at ${resetTime.toISOString()}`);
    this.name = 'RateLimitExceededError';
  }
}

export class RateLimiterService {
  private dbPath: string;
  private config: Map<string, RateLimitConfig> = new Map();

  constructor(dbPath?: string) {
    // Default to publisher directory + rate-limits.json
    this.dbPath = dbPath || path.join(process.cwd(), 'rate-limits.json');
    
    // Set default configs
    this.config.set('kdp', { dailyLimit: 3, resetHour: 0 }); // KDP's 3 books/day limit
    this.config.set('lulu', { dailyLimit: 10, resetHour: 0 }); // More generous limit for Lulu
  }

  /**
   * Set rate limit configuration for a platform
   */
  setConfig(platform: string, config: RateLimitConfig): void {
    this.config.set(platform, config);
    Logger.debug(`Rate limit config updated for ${platform}: ${config.dailyLimit}/day`);
  }

  /**
   * Check if publish is allowed and consume quota if so
   * Throws RateLimitExceededError if limit exceeded
   */
  async checkAndConsumeQuota(platform: string, bookSlug: string): Promise<void> {
    const config = this.config.get(platform);
    if (!config) {
      throw new Error(`No rate limit configuration found for platform: ${platform}`);
    }

    const status = await this.getStatus(platform);
    
    if (status.remaining <= 0) {
      throw new RateLimitExceededError(
        platform, 
        status.currentCount,
        status.dailyLimit,
        status.resetTime
      );
    }

    // Consume quota by recording the publish
    await this.recordPublish(platform, bookSlug);
    
    Logger.info(`Rate limit check passed for ${platform}: ${status.currentCount + 1}/${status.dailyLimit} books today`);
  }

  /**
   * Get current rate limit status for a platform
   */
  async getStatus(platform: string): Promise<RateLimitStatus> {
    const config = this.config.get(platform);
    if (!config) {
      throw new Error(`No rate limit configuration found for platform: ${platform}`);
    }

    const today = this.getTodayString();
    const db = await this.loadDatabase();
    const todayRecord = db.records.find(r => r.platform === platform && r.date === today);
    
    const currentCount = todayRecord?.count || 0;
    const resetTime = this.getNextResetTime(config.resetHour || 0);
    const lastPublish = todayRecord?.publishes.length ? 
      new Date(todayRecord.publishes[todayRecord.publishes.length - 1].timestamp) : 
      undefined;

    return {
      platform,
      currentCount,
      dailyLimit: config.dailyLimit,
      remaining: Math.max(0, config.dailyLimit - currentCount),
      resetTime,
      lastPublish
    };
  }

  /**
   * Get status for all configured platforms
   */
  async getAllStatus(): Promise<RateLimitStatus[]> {
    const statuses: RateLimitStatus[] = [];
    
    for (const platform of this.config.keys()) {
      try {
        const status = await this.getStatus(platform);
        statuses.push(status);
      } catch (error) {
        Logger.error(`Failed to get status for ${platform}`, error as Error);
      }
    }

    return statuses;
  }

  /**
   * Record a successful publish
   */
  private async recordPublish(platform: string, bookSlug: string): Promise<void> {
    const today = this.getTodayString();
    const timestamp = new Date().toISOString();
    
    const db = await this.loadDatabase();
    
    // Find or create today's record for this platform
    let todayRecord = db.records.find(r => r.platform === platform && r.date === today);
    
    if (!todayRecord) {
      todayRecord = {
        platform,
        date: today,
        count: 0,
        publishes: []
      };
      db.records.push(todayRecord);
    }

    // Add the publish record
    todayRecord.count += 1;
    todayRecord.publishes.push({
      bookSlug,
      timestamp
    });

    // Update database timestamp
    db.lastUpdated = timestamp;

    // Save to disk
    await this.saveDatabase(db);
    
    Logger.debug(`Recorded publish for ${platform}: ${bookSlug} (${todayRecord.count} total today)`);
  }

  /**
   * Clean up old records (optional, can help with file size)
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<void> {
    const db = await this.loadDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = this.formatDate(cutoffDate);

    const originalCount = db.records.length;
    db.records = db.records.filter(record => record.date >= cutoffString);
    const removedCount = originalCount - db.records.length;

    if (removedCount > 0) {
      db.lastUpdated = new Date().toISOString();
      await this.saveDatabase(db);
      Logger.info(`Cleaned up ${removedCount} old rate limit records (older than ${daysToKeep} days)`);
    }
  }

  /**
   * Load database from JSON file
   */
  private async loadDatabase(): Promise<RateLimitDatabase> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const db = JSON.parse(data) as RateLimitDatabase;
      return db;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create new database
        const newDb: RateLimitDatabase = {
          records: [],
          lastUpdated: new Date().toISOString()
        };
        await this.saveDatabase(newDb);
        return newDb;
      }
      throw new Error(`Failed to load rate limit database: ${error.message}`);
    }
  }

  /**
   * Save database to JSON file
   */
  private async saveDatabase(db: RateLimitDatabase): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      // Write with pretty formatting for debugging
      const data = JSON.stringify(db, null, 2);
      await fs.writeFile(this.dbPath, data, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save rate limit database: ${(error as Error).message}`);
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayString(): string {
    return this.formatDate(new Date());
  }

  /**
   * Format date as YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the next reset time based on reset hour
   */
  private getNextResetTime(resetHour: number): Date {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setHours(resetHour, 0, 0, 0);
    
    // If reset time has passed today, set for tomorrow
    if (resetTime <= now) {
      resetTime.setDate(resetTime.getDate() + 1);
    }

    return resetTime;
  }

  /**
   * Get database file path (useful for debugging)
   */
  getDatabasePath(): string {
    return this.dbPath;
  }
}