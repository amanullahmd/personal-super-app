# Railway Deployment Guide

## Overview
This guide explains how to deploy the Aura Super App monorepo to Railway with separate services for API and Admin panel, plus a PostgreSQL database.

## Architecture
- **API Service**: `aura-api` - Node.js/Fastify backend
- **Admin Service**: `aura-admin` - React admin panel 
- **Database**: PostgreSQL with pgvector extension
- **Mobile**: `aura-mobile` - Not deployed on Railway (mobile app)

## Deployment Steps

### 1. Set up Railway Project
1. Create a new Railway project from your GitHub repository
2. Railway will detect the monorepo structure

### 2. Configure Services

#### API Service (aura-api)
- **Builder**: Nixpacks (auto-detected)
- **Start Command**: `npm run start`
- **Port**: 3000
- **Health Check**: `/health`

#### Admin Service (aura-admin)
- **Builder**: Nixpacks (auto-detected)
- **Start Command**: `npm run start` (served by nginx)
- **Port**: 80

#### Database Service
- **Type**: PostgreSQL
- **Version**: Latest
- **Extensions**: pgvector (required for AI features)

### 3. Environment Variables

#### API Service Required Variables:
```bash
# Database (auto-provided by Railway)
DATABASE_URL=${{RAILWAY_PRIVATE_DATABASE_URL}}

# JWT (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# AI Services (add your keys)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional: Redis, Storage, Stripe, etc.
```

#### Admin Service Variables:
```bash
NODE_ENV=production
```

### 4. Database Setup
1. Once database is created, run migrations:
   ```bash
   # In Railway console for API service
   npx prisma migrate deploy
   npx prisma generate
   ```

### 5. Deployment Commands
```bash
# Deploy all services
npm run deploy:all

# Deploy individual services
npm run deploy:api
npm run deploy:admin
```

## Service URLs
After deployment:
- API: `https://your-api-name.up.railway.app`
- Admin: `https://your-admin-name.up.railway.app`
- Database: Available via `RAILWAY_PRIVATE_DATABASE_URL`

## Troubleshooting

### Build Failures
- Check that all dependencies are in package.json
- Verify Dockerfile syntax if using Docker
- Ensure Prisma schema is valid

### Database Connection Issues
- Verify DATABASE_URL is correctly set
- Check if pgvector extension is enabled
- Run `npx prisma db push` to sync schema

### Health Check Failures
- Ensure `/health` endpoint exists in API
- Check that service starts on correct port
- Verify no startup errors in logs

## Monitoring
- Check Railway dashboard for service status
- Monitor build logs for deployment issues
- Set up alerts for service downtime

## Production Considerations
- Use Railway's built-in CI/CD from GitHub
- Set up proper environment variable management
- Configure domain names for production
- Set up monitoring and alerting
- Regular database backups (Railway provides this)
