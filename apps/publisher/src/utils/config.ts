import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { Logger } from './logger.js';

export interface KdpConfig {
  email?: string;
  password?: string;
  enabled: boolean;
}

export interface LuluConfig {
  apiKey?: string;
  apiSecret?: string;
  sandbox: boolean;
  enabled: boolean;
}

export interface IngramConfig {
  username?: string;
  password?: string;
  enabled: boolean;
}

export interface PublisherConfig {
  kdp: KdpConfig;
  lulu: LuluConfig;
  ingram: IngramConfig;
  defaults: {
    platforms: string[];
    skipValidation: boolean;
    dryRun: boolean;
  };
  paths: {
    contentDir: string;
    generatedDir: string;
    reportsDir: string;
  };
}

export class ConfigManager {
  private static config: PublisherConfig | null = null;

  static async load(customPath?: string): Promise<PublisherConfig> {
    if (this.config) {
      return this.config;
    }

    const defaultConfig: PublisherConfig = {
      kdp: {
        enabled: true,
      },
      lulu: {
        sandbox: true,
        enabled: true,
      },
      ingram: {
        enabled: false,
      },
      defaults: {
        platforms: ['kdp', 'lulu'],
        skipValidation: false,
        dryRun: false,
      },
      paths: {
        contentDir: 'content/translations/books',
        generatedDir: 'generated',
        reportsDir: 'publishing-reports',
      },
    };

    // Try to load config from various sources
    const configPaths = [
      customPath,
      '.publishrc.json',
      join(homedir(), '.brainrot', 'publisher.config.json'),
    ].filter(Boolean) as string[];

    let mergedConfig = { ...defaultConfig };

    for (const configPath of configPaths) {
      try {
        const configContent = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Deep merge configuration
        if (config.kdp) {
          mergedConfig.kdp = { ...mergedConfig.kdp, ...config.kdp };
        }
        if (config.lulu) {
          mergedConfig.lulu = { ...mergedConfig.lulu, ...config.lulu };
        }
        if (config.ingram) {
          mergedConfig.ingram = { ...mergedConfig.ingram, ...config.ingram };
        }
        if (config.defaults) {
          mergedConfig.defaults = { ...mergedConfig.defaults, ...config.defaults };
        }
        if (config.paths) {
          mergedConfig.paths = { ...mergedConfig.paths, ...config.paths };
        }
        
        Logger.debug(`Loaded config from ${configPath}`);
        break;
      } catch (error) {
        // Config file doesn't exist or is invalid, continue to next
        Logger.debug(`No config found at ${configPath}`);
      }
    }

    // Load from environment variables
    if (process.env.LULU_API_KEY) {
      mergedConfig.lulu.apiKey = process.env.LULU_API_KEY;
    }
    if (process.env.LULU_API_SECRET) {
      mergedConfig.lulu.apiSecret = process.env.LULU_API_SECRET;
    }
    if (process.env.KDP_EMAIL) {
      mergedConfig.kdp.email = process.env.KDP_EMAIL;
    }
    if (process.env.KDP_PASSWORD) {
      mergedConfig.kdp.password = process.env.KDP_PASSWORD;
    }

    this.config = mergedConfig;
    return this.config;
  }

  static async save(config: PublisherConfig, path?: string): Promise<void> {
    const savePath = path || join(homedir(), '.brainrot', 'publisher.config.json');
    
    // Don't save sensitive credentials to file
    const configToSave = {
      ...config,
      kdp: {
        ...config.kdp,
        password: undefined,
      },
      lulu: {
        ...config.lulu,
        apiKey: undefined,
        apiSecret: undefined,
      },
      ingram: {
        ...config.ingram,
        password: undefined,
      },
    };

    await writeFile(savePath, JSON.stringify(configToSave, null, 2));
    Logger.success(`Configuration saved to ${savePath}`);
  }

  static get(key: keyof PublisherConfig): any {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call ConfigManager.load() first.');
    }
    return this.config[key];
  }

  static isConfigured(platform: 'kdp' | 'lulu' | 'ingram'): boolean {
    if (!this.config) {
      return false;
    }

    switch (platform) {
      case 'kdp':
        return !!(this.config.kdp?.email && this.config.kdp?.password);
      case 'lulu':
        return !!(this.config.lulu?.apiKey && this.config.lulu?.apiSecret);
      case 'ingram':
        return !!(this.config.ingram?.username && this.config.ingram?.password);
      default:
        return false;
    }
  }
}

// Helper function for fs.writeFile
async function writeFile(path: string, content: string): Promise<void> {
  const { writeFile: fsWriteFile } = await import('fs/promises');
  const { dirname } = await import('path');
  const { mkdir } = await import('fs/promises');
  
  // Ensure directory exists
  await mkdir(dirname(path), { recursive: true });
  await fsWriteFile(path, content);
}