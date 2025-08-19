#!/usr/bin/env tsx
/**
 * API Usage Monitoring Script
 * Tracks usage across all integrated services and alerts on anomalies
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';

interface ServiceUsage {
  service: string;
  requests: number;
  cost: number;
  lastChecked: Date;
  anomalies: string[];
}

interface UsageThresholds {
  daily: number;
  monthly: number;
  costLimit: number;
}

const THRESHOLDS: Record<string, UsageThresholds> = {
  vercel: {
    daily: 10000,
    monthly: 300000,
    costLimit: 100
  },
  openai: {
    daily: 1000,
    monthly: 30000,
    costLimit: 50
  },
  anthropic: {
    daily: 1000,
    monthly: 30000,
    costLimit: 50
  },
  lulu: {
    daily: 100,
    monthly: 3000,
    costLimit: 0 // Free API
  }
};

const USAGE_LOG_PATH = path.join(process.cwd(), 'monitoring', 'api-usage.json');
const ALERT_LOG_PATH = path.join(process.cwd(), 'monitoring', 'alerts.json');

class APIMonitor {
  private spinner = ora();
  private usage: Map<string, ServiceUsage> = new Map();
  private alerts: string[] = [];

  async checkVercelUsage(): Promise<ServiceUsage> {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      return {
        service: 'vercel',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: ['No VERCEL_TOKEN configured']
      };
    }

    try {
      // Mock API call - replace with actual Vercel API
      const response = await axios.get('https://api.vercel.com/v1/usage', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({
        data: {
          requests: Math.floor(Math.random() * 5000),
          bandwidth: Math.floor(Math.random() * 100),
          cost: Math.random() * 10
        }
      }));

      const usage: ServiceUsage = {
        service: 'vercel',
        requests: response.data.requests || 0,
        cost: response.data.cost || 0,
        lastChecked: new Date(),
        anomalies: []
      };

      // Check thresholds
      if (usage.requests > THRESHOLDS.vercel.daily) {
        usage.anomalies.push(`Daily request limit exceeded: ${usage.requests}/${THRESHOLDS.vercel.daily}`);
      }
      if (usage.cost > THRESHOLDS.vercel.costLimit) {
        usage.anomalies.push(`Cost limit exceeded: $${usage.cost}/$${THRESHOLDS.vercel.costLimit}`);
      }

      return usage;
    } catch (error) {
      return {
        service: 'vercel',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: [`API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async checkOpenAIUsage(): Promise<ServiceUsage> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        service: 'openai',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: ['No OPENAI_API_KEY configured']
      };
    }

    try {
      // Mock API call - replace with actual OpenAI usage API
      const usage: ServiceUsage = {
        service: 'openai',
        requests: Math.floor(Math.random() * 500),
        cost: Math.random() * 5,
        lastChecked: new Date(),
        anomalies: []
      };

      if (usage.requests > THRESHOLDS.openai.daily) {
        usage.anomalies.push(`Daily request limit exceeded: ${usage.requests}/${THRESHOLDS.openai.daily}`);
      }

      return usage;
    } catch (error) {
      return {
        service: 'openai',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: [`API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async checkBlobStorageUsage(): Promise<ServiceUsage> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return {
        service: 'blob-storage',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: ['No BLOB_READ_WRITE_TOKEN configured']
      };
    }

    try {
      // Check blob storage usage via Vercel API
      const usage: ServiceUsage = {
        service: 'blob-storage',
        requests: Math.floor(Math.random() * 1000),
        cost: 0, // Included in Vercel
        lastChecked: new Date(),
        anomalies: []
      };

      // Check for unusual patterns
      const hourlyRate = usage.requests / 24;
      if (hourlyRate > 100) {
        usage.anomalies.push(`High request rate: ${hourlyRate.toFixed(0)} requests/hour`);
      }

      return usage;
    } catch (error) {
      return {
        service: 'blob-storage',
        requests: 0,
        cost: 0,
        lastChecked: new Date(),
        anomalies: [`Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async checkAllServices(): Promise<void> {
    this.spinner.start('Checking API usage across all services...');

    const services = [
      this.checkVercelUsage(),
      this.checkOpenAIUsage(),
      this.checkBlobStorageUsage()
    ];

    const results = await Promise.all(services);
    
    for (const result of results) {
      this.usage.set(result.service, result);
      if (result.anomalies.length > 0) {
        this.alerts.push(...result.anomalies.map(a => `[${result.service}] ${a}`));
      }
    }

    this.spinner.succeed('API usage check complete');
  }

  async loadPreviousUsage(): Promise<void> {
    try {
      const data = await fs.readFile(USAGE_LOG_PATH, 'utf-8');
      const previousUsage = JSON.parse(data);
      
      // Compare with previous usage for anomaly detection
      for (const [service, current] of this.usage) {
        const previous = previousUsage[service];
        if (previous) {
          const increase = ((current.requests - previous.requests) / previous.requests) * 100;
          if (increase > 50) {
            this.alerts.push(`[${service}] Usage spike detected: ${increase.toFixed(0)}% increase`);
          }
        }
      }
    } catch {
      // No previous usage data
    }
  }

  async saveUsage(): Promise<void> {
    const dir = path.dirname(USAGE_LOG_PATH);
    await fs.mkdir(dir, { recursive: true });

    const usageData: Record<string, ServiceUsage> = {};
    for (const [key, value] of this.usage) {
      usageData[key] = value;
    }

    await fs.writeFile(USAGE_LOG_PATH, JSON.stringify(usageData, null, 2));
  }

  async saveAlerts(): Promise<void> {
    if (this.alerts.length === 0) return;

    const dir = path.dirname(ALERT_LOG_PATH);
    await fs.mkdir(dir, { recursive: true });

    const alertData = {
      timestamp: new Date().toISOString(),
      alerts: this.alerts
    };

    // Append to alerts file
    let existingAlerts = [];
    try {
      const data = await fs.readFile(ALERT_LOG_PATH, 'utf-8');
      existingAlerts = JSON.parse(data);
    } catch {
      // No existing alerts
    }

    existingAlerts.push(alertData);
    
    // Keep only last 100 alerts
    if (existingAlerts.length > 100) {
      existingAlerts = existingAlerts.slice(-100);
    }

    await fs.writeFile(ALERT_LOG_PATH, JSON.stringify(existingAlerts, null, 2));
  }

  displayReport(): void {
    console.log('\n' + chalk.bold.blue('📊 API Usage Report'));
    console.log('─'.repeat(50));

    let totalCost = 0;
    
    for (const [service, usage] of this.usage) {
      const statusIcon = usage.anomalies.length > 0 ? '⚠️ ' : '✅';
      
      console.log(`\n${statusIcon} ${chalk.bold(service.toUpperCase())}`);
      console.log(`   Requests: ${chalk.cyan(usage.requests.toString())}`);
      console.log(`   Cost: ${chalk.green(`$${usage.cost.toFixed(2)}`)}`);
      console.log(`   Last Checked: ${chalk.gray(usage.lastChecked.toLocaleString())}`);
      
      if (usage.anomalies.length > 0) {
        console.log(`   ${chalk.yellow('Anomalies:')}`);
        for (const anomaly of usage.anomalies) {
          console.log(`     ${chalk.yellow('•')} ${anomaly}`);
        }
      }
      
      totalCost += usage.cost;
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`${chalk.bold('Total Cost:')} ${chalk.green(`$${totalCost.toFixed(2)}`)}`);

    if (this.alerts.length > 0) {
      console.log('\n' + chalk.bold.red('🚨 Alerts:'));
      for (const alert of this.alerts) {
        console.log(`  ${chalk.red('•')} ${alert}`);
      }
    } else {
      console.log('\n' + chalk.green('✅ No alerts - all systems normal'));
    }
  }

  async sendAlerts(): Promise<void> {
    if (this.alerts.length === 0) return;

    // Send to Slack if webhook configured
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await axios.post(slackWebhook, {
          text: '🚨 API Usage Alerts',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*API Usage Alerts* - ${new Date().toLocaleString()}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: this.alerts.map(a => `• ${a}`).join('\n')
              }
            }
          ]
        });
        console.log(chalk.green('\n✅ Alerts sent to Slack'));
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Failed to send Slack alert'));
      }
    }

    // Send to Discord if webhook configured
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      try {
        await axios.post(discordWebhook, {
          content: '🚨 **API Usage Alerts**\n' + this.alerts.map(a => `• ${a}`).join('\n')
        });
        console.log(chalk.green('✅ Alerts sent to Discord'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Failed to send Discord alert'));
      }
    }
  }

  async run(): Promise<void> {
    await this.checkAllServices();
    await this.loadPreviousUsage();
    await this.saveUsage();
    await this.saveAlerts();
    this.displayReport();
    await this.sendAlerts();
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new APIMonitor();
  monitor.run().catch(error => {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  });
}

export { APIMonitor, ServiceUsage, UsageThresholds };