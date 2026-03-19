import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aura_db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
    llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  },

  storage: {
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
} as const;
