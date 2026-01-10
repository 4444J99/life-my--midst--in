/**
 * Environment Configuration Management
 * 
 * This module provides type-safe, centralized configuration for all environments.
 * Supports: development, staging, production
 */

import { z } from 'zod';

// ═════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════

export const EnvironmentSchema = z.enum(['development', 'staging', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  user: z.string(),
  password: z.string(), // allow-secret
  database: z.string(),
  ssl: z.boolean().default(false),
  maxConnections: z.number().default(20),
  idleTimeout: z.number().default(30000),
  connectionTimeout: z.number().default(5000),
  statement_timeout: z.number().default(30000),
});

export const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(), // allow-secret
  db: z.number().default(0),
  maxRetries: z.number().default(3),
  retryDelayBase: z.number().default(100),
  keyPrefix: z.string().default(''),
  tls: z.boolean().default(false),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'text']).default('json'),
  colorize: z.boolean().default(false),
  timestamp: z.boolean().default(true),
  requestLogging: z.boolean().default(true),
  slowQueryThreshold: z.number().default(1000), // ms
});

export const SecurityConfigSchema = z.object({
  corsOrigins: z.string().array(),
  csrfProtection: z.boolean().default(true),
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 min
    maxRequests: z.number().default(100),
  }),
  jwt: z.object({
    secret: z.string(), // allow-secret
    expiresIn: z.string().default('24h'),
    refreshExpiresIn: z.string().default('7d'),
  }),
  encryption: z.object({
    algorithm: z.string().default('aes-256-gcm'),
    keyDerivation: z.string().default('pbkdf2'),
  }),
});

export const StorageConfigSchema = z.object({
  type: z.enum(['s3', 'local', 'gcs']).default('local'),
  bucketName: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  localPath: z.string().default('./storage'),
  retentionDays: z.number().default(30),
});

export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  type: z.enum(['prometheus', 'datadog', 'cloudwatch']).default('prometheus'),
  metricsPort: z.number().default(9090),
  samplingRate: z.number().default(0.1), // 10%
  tracing: z.object({
    enabled: z.boolean().default(true),
    sampleRate: z.number().default(0.01), // 1%
    serviceName: z.string(),
  }),
  alerting: z.object({
    enabled: z.boolean().default(true),
    slackWebhook: z.string().optional(),
    emailTo: z.string().array().optional(),
  }),
});

export const EnvironmentConfigSchema = z.object({
  environment: EnvironmentSchema,
  nodeEnv: z.enum(['development', 'staging', 'production']),
  debug: z.boolean().default(false),
  
  // Service URLs
  apiUrl: z.string().url(),
  webUrl: z.string().url(),
  orchestratorUrl: z.string().url(),
  
  // Services
  api: z.object({
    port: z.number().default(3001),
    host: z.string().default('0.0.0.0'),
    workerThreads: z.number().default(4),
    gracefulShutdownTimeout: z.number().default(30000), // ms
  }),
  web: z.object({
    port: z.number().default(3000),
    host: z.string().default('0.0.0.0'),
    staticCacheMaxAge: z.number().default(31536000), // 1 year
  }),
  orchestrator: z.object({
    port: z.number().default(3002),
    host: z.string().default('0.0.0.0'),
    taskTimeout: z.number().default(300000), // 5 min
    maxConcurrentTasks: z.number().default(10),
  }),
  
  // Database
  database: DatabaseConfigSchema,
  
  // Cache
  redis: RedisConfigSchema,
  
  // Logging
  logging: LoggingConfigSchema,
  
  // Security
  security: SecurityConfigSchema,
  
  // Storage
  storage: StorageConfigSchema,
  
  // Monitoring
  monitoring: MonitoringConfigSchema,
  
  // Feature flags
  features: z.record(z.boolean()).default({}),
  
  // External services
  externalServices: z.object({
    linkedin: z.object({
      enabled: z.boolean().default(false),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(), // allow-secret
      apiUrl: z.string().url().optional(),
    }),
    indeed: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(), // allow-secret
      apiUrl: z.string().url().optional(),
    }),
    angellist: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(), // allow-secret
      apiUrl: z.string().url().optional(),
    }),
  }).default({}),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// ═════════════════════════════════════════════════════════════════════════
// ENVIRONMENT DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════

export const DEVELOPMENT_CONFIG: EnvironmentConfig = {
  environment: 'development',
  nodeEnv: 'development',
  debug: true,
  
  apiUrl: 'http://localhost:3001',
  webUrl: 'http://localhost:3000',
  orchestratorUrl: 'http://localhost:3002',
  
  api: {
    port: 3001,
    host: '0.0.0.0',
    workerThreads: 2,
    gracefulShutdownTimeout: 10000,
  },
  web: {
    port: 3000,
    host: '0.0.0.0',
    staticCacheMaxAge: 0, // No caching in dev
  },
  orchestrator: {
    port: 3002,
    host: '0.0.0.0',
    taskTimeout: 600000, // Longer timeout for debugging
    maxConcurrentTasks: 5,
  },
  
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'midst_dev',
    password: process.env.DATABASE_PASSWORD || '', // allow-secret
    database: process.env.DATABASE_NAME || 'midst_dev',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: 5,
    idleTimeout: 10000,
  },
  
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'dev:',
  },
  
  logging: {
    level: 'debug',
    format: 'text',
    colorize: true,
    timestamp: true,
    requestLogging: true,
    slowQueryThreshold: 100, // Very low threshold in dev
  },
  
  security: {
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    csrfProtection: false, // Disabled in dev for testing
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 1000, // Very permissive in dev
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production', // allow-secret
      expiresIn: '7d', // Longer in dev
      refreshExpiresIn: '30d',
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
    },
  },
  
  storage: {
    type: 'local',
    localPath: './storage',
    retentionDays: 7,
  },
  
  monitoring: {
    enabled: false, // Usually disabled in dev
    type: 'prometheus',
    metricsPort: 9090,
    tracing: {
      enabled: false,
      sampleRate: 1.0, // Sample all in dev for visibility
      serviceName: 'in-midst-my-life-dev',
    },
    alerting: {
      enabled: false,
    },
  },
  
  features: {
    hunterProtocol: true,
    batchApplications: true,
    mockJobData: true, // Use mock data in dev
    analyticsTracking: false,
  },
  
  externalServices: {
    linkedin: {
      enabled: false,
    },
    indeed: {
      enabled: false,
    },
    angellist: {
      enabled: false,
    },
  },
};

export const STAGING_CONFIG: EnvironmentConfig = {
  environment: 'staging',
  nodeEnv: 'production',
  debug: false,
  
  apiUrl: process.env.API_URL || 'https://api-staging.in-midst-my-life.dev',
  webUrl: process.env.WEB_URL || 'https://staging.in-midst-my-life.dev',
  orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://orchestrator:3002',
  
  api: {
    port: 3001,
    host: '0.0.0.0',
    workerThreads: 4,
    gracefulShutdownTimeout: 30000,
  },
  web: {
    port: 3000,
    host: '0.0.0.0',
    staticCacheMaxAge: 3600, // 1 hour
  },
  orchestrator: {
    port: 3002,
    host: '0.0.0.0',
    taskTimeout: 300000,
    maxConcurrentTasks: 10,
  },
  
  database: {
    host: process.env.DB_HOST || 'postgres-staging',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'midst_staging',
    password: process.env.DB_PASSWORD!, // allow-secret
    database: process.env.DB_NAME || 'midst_staging',
    ssl: true,
    maxConnections: 20,
    idleTimeout: 30000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis-staging',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD, // allow-secret
    db: 0,
    keyPrefix: 'staging:',
    tls: true,
  },
  
  logging: {
    level: 'info',
    format: 'json',
    colorize: false,
    timestamp: true,
    requestLogging: true,
    slowQueryThreshold: 500,
  },
  
  security: {
    corsOrigins: [
      'https://staging.in-midst-my-life.dev',
      'https://api-staging.in-midst-my-life.dev',
    ],
    csrfProtection: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 300,
    },
    jwt: {
      secret: process.env.JWT_SECRET!, // allow-secret
      expiresIn: '24h',
      refreshExpiresIn: '7d',
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
    },
  },

  storage: {
    type: 's3',
    bucketName: process.env.S3_BUCKET || 'in-midst-staging',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: process.env.AWS_ACCESS_KEY, // allow-secret
    secretKey: process.env.AWS_SECRET_KEY, // allow-secret
    retentionDays: 30,
  },
  
  monitoring: {
    enabled: true,
    type: 'prometheus',
    metricsPort: 9090,
    samplingRate: 0.1, // 10%
    tracing: {
      enabled: true,
      sampleRate: 0.1,
      serviceName: 'in-midst-my-life-staging',
    },
    alerting: {
      enabled: true,
      slackWebhook: process.env.SLACK_WEBHOOK_STAGING,
      emailTo: ['devops@example.com'],
    },
  },
  
  features: {
    hunterProtocol: true,
    batchApplications: true,
    mockJobData: false, // Use real APIs in staging
    analyticsTracking: true,
  },
  
  externalServices: {
    linkedin: {
      enabled: process.env.LINKEDIN_ENABLED === 'true',
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET, // allow-secret
    },
    indeed: {
      enabled: process.env.INDEED_ENABLED === 'true',
      apiKey: process.env.INDEED_API_KEY, // allow-secret
    },
    angellist: {
      enabled: process.env.ANGELLIST_ENABLED === 'true',
      apiKey: process.env.ANGELLIST_API_KEY, // allow-secret
    },
  },
};

export const PRODUCTION_CONFIG: EnvironmentConfig = {
  environment: 'production',
  nodeEnv: 'production',
  debug: false,
  
  apiUrl: process.env.API_URL || 'https://api.in-midst-my-life.dev',
  webUrl: process.env.WEB_URL || 'https://in-midst-my-life.dev',
  orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://orchestrator:3002',
  
  api: {
    port: 3001,
    host: '0.0.0.0',
    workerThreads: 8,
    gracefulShutdownTimeout: 45000,
  },
  web: {
    port: 3000,
    host: '0.0.0.0',
    staticCacheMaxAge: 31536000, // 1 year with cache busting
  },
  orchestrator: {
    port: 3002,
    host: '0.0.0.0',
    taskTimeout: 300000,
    maxConcurrentTasks: 20,
  },
  
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!, // allow-secret
    database: process.env.DB_NAME!,
    ssl: true,
    maxConnections: 50,
    idleTimeout: 60000,
    connectionTimeout: 10000,
    statement_timeout: 30000,
  },

  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD!, // allow-secret
    db: 0,
    keyPrefix: 'prod:',
    tls: true,
    maxRetries: 3,
  },
  
  logging: {
    level: 'info',
    format: 'json',
    colorize: false,
    timestamp: true,
    requestLogging: true,
    slowQueryThreshold: 1000,
  },
  
  security: {
    corsOrigins: [
      'https://in-midst-my-life.dev',
      'https://api.in-midst-my-life.dev',
      'https://www.in-midst-my-life.dev',
    ],
    csrfProtection: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
    jwt: {
      secret: process.env.JWT_SECRET!, // allow-secret
      expiresIn: '24h',
      refreshExpiresIn: '7d',
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
    },
  },

  storage: {
    type: 's3',
    bucketName: process.env.S3_BUCKET!,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: process.env.AWS_ACCESS_KEY!, // allow-secret
    secretKey: process.env.AWS_SECRET_KEY!, // allow-secret
    retentionDays: 90,
  },
  
  monitoring: {
    enabled: true,
    type: 'datadog',
    metricsPort: 9090,
    samplingRate: 0.01, // 1%
    tracing: {
      enabled: true,
      sampleRate: 0.01,
      serviceName: 'in-midst-my-life-production',
    },
    alerting: {
      enabled: true,
      slackWebhook: process.env.SLACK_WEBHOOK_PRODUCTION,
      emailTo: ['alerts@example.com', 'devops@example.com'],
    },
  },
  
  features: {
    hunterProtocol: true,
    batchApplications: true,
    mockJobData: false,
    analyticsTracking: true,
  },
  
  externalServices: {
    linkedin: {
      enabled: true,
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!, // allow-secret
      apiUrl: 'https://api.linkedin.com/v2',
    },
    indeed: {
      enabled: true,
      apiKey: process.env.INDEED_API_KEY!, // allow-secret
      apiUrl: 'https://api.indeed.com/v1',
    },
    angellist: {
      enabled: true,
      apiKey: process.env.ANGELLIST_API_KEY!, // allow-secret
      apiUrl: 'https://api.angel.co/v1',
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURATION MANAGER
// ═════════════════════════════════════════════════════════════════════════

export class ConfigManager {
  private static instance: ConfigManager;
  private config: EnvironmentConfig;
  private environment: Environment;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private detectEnvironment(): Environment {
    const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';
    
    if (env === 'staging' || env === 'stage') {
      return 'staging';
    }
    if (env === 'production' || env === 'prod') {
      return 'production';
    }
    return 'development';
  }

  private loadConfiguration(): EnvironmentConfig {
    switch (this.environment) {
      case 'staging':
        return STAGING_CONFIG;
      case 'production':
        return PRODUCTION_CONFIG;
      case 'development':
      default:
        return DEVELOPMENT_CONFIG;
    }
  }

  private validateConfiguration(): void {
    try {
      EnvironmentConfigSchema.parse(this.config);
    } catch (error) {
      console.error('Configuration validation failed:', error);
      process.exit(1);
    }
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isStaging(): boolean {
    return this.environment === 'staging';
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }

  getFeature(featureName: string): boolean {
    return this.config.features[featureName] ?? false;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
export const config = configManager.getConfig();
