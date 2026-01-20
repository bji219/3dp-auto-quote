# 3D Print Auto-Quote System

## Project Overview

This is a full-stack web application that provides instant, automated quotes for 3D printing projects. Users upload STL (stereolithography) files, and the system automatically parses the 3D models, calculates material volume and surface area, and generates itemized cost quotes.

**Live URL:** https://quote.idw3d.com (when subdomain is configured)

**Tech Stack:**
- **Frontend:** Next.js 14 (React 18) with TypeScript and Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Database:** PostgreSQL (production) / SQLite (development)
- **Email:** Resend API (primary) with SMTP fallback
- **File Storage:** Local filesystem (dev) / AWS S3 (production)
- **Deployment:** Netlify with continuous deployment from GitHub

---

## Architecture

### User Journey (4-Step Wizard)

```
1. UPLOAD
   └─> User uploads STL file
   └─> POST /api/upload
   └─> Parse STL, calculate metrics, save file
   └─> Return fileId and metrics

2. PREVIEW
   └─> Display 3D model with Three.js
   └─> Interactive controls (rotate, zoom, pan)

3. VERIFY EMAIL
   └─> User enters email
   └─> POST /api/auth/send-code
   └─> Send 6-digit code via email (15 min expiry)
   └─> User enters code
   └─> POST /api/auth/verify-code
   └─> Create JWT session (24 hour expiry)

4. GENERATE QUOTE
   └─> User selects material, quality, infill, etc.
   └─> POST /api/calculate-quote (auth required)
   └─> Calculate itemized pricing
   └─> Save quote to database
   └─> Display results
```

### Key Features

- **STL File Processing:** Parses both ASCII and Binary STL formats
- **3D Model Analysis:** Calculates volume, surface area, bounding box, and estimated print time
- **Email Verification:** JWT-based authentication with rate limiting
- **Pricing Engine:** Itemized quotes with material costs, labor, shipping, discounts, and surcharges
- **File Deduplication:** SHA256 hashing prevents duplicate file storage
- **Multi-Provider Email:** Fallback chain (Resend → SMTP) for reliability
- **Automatic Cleanup:** Scheduled jobs to remove old files

---

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload and parse STL files |
| `/api/auth/send-code` | POST | Send email verification code |
| `/api/auth/verify-code` | POST | Verify code and create session |
| `/api/auth/validate-session` | POST | Validate JWT session |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/quote/[id]` | GET | Retrieve stored quote by ID |

### Protected Endpoints (Require JWT Authentication)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calculate-quote` | POST | Generate quote from file metrics |

### Admin Endpoints (Require Admin API Key)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/cleanup` | POST | Run file cleanup job |

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Email (choose one)
RESEND_API_KEY="re_xxxxxxxxxx"                    # Recommended
# OR
EMAIL_HOST="smtp.gmail.com"                       # SMTP fallback
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Email Settings
EMAIL_FROM="noreply@idw3d.com"
EMAIL_FROM_NAME="IDW3D Quote System"

# Application
NEXT_PUBLIC_APP_URL="https://quote.idw3d.com"
MAX_FILE_SIZE_MB=50

# Security
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ADMIN_API_KEY="your-admin-api-key-for-cleanup-jobs"

# Pricing (optional overrides)
BASE_PRICE_PER_CM3=0.15
MATERIAL_COST_MULTIPLIER=1.2
RUSH_ORDER_MULTIPLIER=1.5

# File Storage (optional S3)
STORAGE_TYPE="local"                              # or "s3"
STORAGE_BASE_PATH="./public/uploads"
# STORAGE_BUCKET="my-3dp-uploads"                 # for S3
# STORAGE_REGION="us-east-1"                      # for S3
# STORAGE_ACCESS_KEY_ID="your-access-key"         # for S3
# STORAGE_SECRET_ACCESS_KEY="your-secret-key"     # for S3

# Cleanup
CLEANUP_MAX_FILE_AGE_DAYS=30
CLEANUP_ENABLED=true
```

---

## Setup Instructions

### Local Development

```bash
# 1. Clone repository
git clone <repository-url>
cd 3dp-auto-quote

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
npm run db:push          # Push schema to database
npm run db:seed          # Seed initial data (optional)

# 5. Run development server
npm run dev
```

Visit http://localhost:3000

### Production Deployment (Netlify)

1. **Push code to GitHub** (already done)
2. **Configure Netlify:**
   - Connect GitHub repository
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18
3. **Add environment variables** in Netlify dashboard (see below)
4. **Configure custom domain** (see Subdomain Integration section)

---

## Subdomain Integration for idw3d.com

### Step 1: Configure DNS (Netlify DNS or External Provider)

**Option A: If using Netlify DNS:**
1. Go to Netlify dashboard → Domain settings
2. Add custom domain: `quote.idw3d.com`
3. Netlify will automatically provision SSL certificate

**Option B: If using external DNS provider (recommended):**
1. Log in to your DNS provider (GoDaddy, Cloudflare, Route53, etc.)
2. Add a CNAME record:
   - **Host/Name:** `quote`
   - **Points to:** `<your-site-name>.netlify.app`
   - **TTL:** 3600 (or Auto)
3. Go to Netlify → Domain settings → Add custom domain
4. Enter: `quote.idw3d.com`
5. Netlify will detect the CNAME and provision SSL (Let's Encrypt)

**DNS Propagation:** May take 1-48 hours (usually < 1 hour)

### Step 2: Configure Environment Variables in Netlify

Navigate to: **Site settings → Environment variables**

Add the following variables:

#### Database
```
DATABASE_URL = postgresql://username:password@host:5432/database
```

**Recommended PostgreSQL Providers:**
- [Neon](https://neon.tech) - Free tier, serverless
- [Supabase](https://supabase.com) - Free tier, includes dashboard
- [Railway](https://railway.app) - Simple deployment

#### Email Service (Option 1: Resend - Recommended)

```
RESEND_API_KEY = re_xxxxxxxxxx
EMAIL_FROM = noreply@idw3d.com
EMAIL_FROM_NAME = IDW3D Quote System
```

**To get Resend API key:**
1. Sign up at https://resend.com
2. Verify your sending domain (`idw3d.com`) or use `onboarding@resend.dev` for testing
3. Create API key in dashboard
4. Copy key to Netlify environment variables

**To verify your domain in Resend:**
1. Go to Resend dashboard → Domains → Add Domain
2. Enter: `idw3d.com`
3. Add the provided DNS records (DKIM, SPF) to your DNS provider
4. Wait for verification (usually < 1 hour)
5. Now you can send from `noreply@idw3d.com`

#### Email Service (Option 2: Gmail SMTP Fallback)

```
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your-email@gmail.com
EMAIL_PASSWORD = your-app-specific-password
EMAIL_FROM = noreply@idw3d.com
EMAIL_FROM_NAME = IDW3D Quote System
```

**To get Gmail app password:**
1. Enable 2-factor authentication on Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Copy 16-character password to Netlify

#### Application Settings

```
NEXT_PUBLIC_APP_URL = https://quote.idw3d.com
MAX_FILE_SIZE_MB = 50
```

#### Security

```
JWT_SECRET = <generate-random-string-64-chars>
ADMIN_API_KEY = <generate-random-string-32-chars>
```

**Generate secure random strings:**
```bash
# JWT_SECRET (64 characters)
openssl rand -hex 32

# ADMIN_API_KEY (32 characters)
openssl rand -hex 16
```

#### Optional: AWS S3 File Storage

```
STORAGE_TYPE = s3
STORAGE_BUCKET = idw3d-quote-uploads
STORAGE_REGION = us-east-1
STORAGE_ACCESS_KEY_ID = <your-aws-access-key>
STORAGE_SECRET_ACCESS_KEY = <your-aws-secret-key>
```

**To set up S3:**
1. Create S3 bucket in AWS console
2. Create IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
3. Generate access keys
4. Add keys to Netlify environment variables

#### Optional: Pricing Overrides

```
BASE_PRICE_PER_CM3 = 0.15
MATERIAL_COST_MULTIPLIER = 1.2
RUSH_ORDER_MULTIPLIER = 1.5
CLEANUP_MAX_FILE_AGE_DAYS = 30
CLEANUP_ENABLED = true
```

### Step 3: Update Database Schema

After configuring `DATABASE_URL`, run database migrations:

```bash
# Option A: Run locally (requires database access)
npm run db:push

# Option B: Run via Netlify CLI
netlify dev
npm run db:push

# Option C: Add as build command (one-time)
# In Netlify: Build settings → Build command
# Temporarily set to: npm run db:push && npm run build
# Then trigger manual deploy
# Revert build command to: npm run build
```

### Step 4: Trigger Deployment

1. Push a commit to your GitHub repository, or
2. In Netlify dashboard: **Deploys → Trigger deploy → Deploy site**

### Step 5: Verify Deployment

1. **Check build logs** in Netlify dashboard
2. **Test the site:** https://quote.idw3d.com
3. **Test email verification:**
   - Upload an STL file
   - Enter email address
   - Check inbox for verification code
4. **Test quote generation:**
   - Complete verification
   - Select material and options
   - Verify quote displays correctly

---

## Claude API Integration

This project does **NOT** currently use the Anthropic Claude API. However, if you want to integrate Claude for features like:
- Intelligent quote recommendations
- Design feedback on 3D models
- Natural language quote queries
- Automated customer support

### Adding Claude API

1. **Get API Key:**
   - Sign up at https://console.anthropic.com
   - Create API key
   - Add to Netlify: `ANTHROPIC_API_KEY = sk-ant-xxxxx`

2. **Install SDK:**
```bash
npm install @anthropic-ai/sdk
```

3. **Create utility** (`src/utils/claude-ai.ts`):
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeModel(modelData: any) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this 3D model and provide feedback: ${JSON.stringify(modelData)}`
    }]
  });
  return response.content;
}
```

4. **Use in API route:**
```typescript
import { analyzeModel } from '@/utils/claude-ai';

export async function POST(req: Request) {
  const modelAnalysis = await analyzeModel(stlData);
  // Return analysis to user
}
```

---

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Maintenance

### Database Management

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Create migration
npm run db:migrate

# Reset database (WARNING: Deletes all data)
npm run db:reset
```

### File Cleanup

Run manual cleanup of old files:

```bash
npm run cleanup
```

Or schedule via cron job / GitHub Actions:

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Old Files
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run cleanup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}
```

---

## Troubleshooting

### Common Issues

**1. "Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Netlify
- Ensure `prisma generate` ran during build

**2. "Email not sending"**
- Check `RESEND_API_KEY` is valid
- Verify sending domain is verified in Resend
- Check Netlify function logs for errors
- Try SMTP fallback as alternative

**3. "File upload fails"**
- Check `MAX_FILE_SIZE_MB` setting
- Verify Netlify function timeout (default 10s, max 26s on Pro)
- Consider enabling S3 storage for large files

**4. "Session expired immediately"**
- Verify `JWT_SECRET` is set and consistent
- Check system clock is synchronized
- Ensure cookies are enabled in browser

**5. "Build fails on Netlify"**
- Check Node version is 18+ in Netlify settings
- Verify all dependencies are in `package.json`
- Review build logs for specific errors
- Ensure `prisma generate` runs in postinstall

### Debug Mode

Enable verbose logging:

```bash
# .env
DEBUG=true
LOG_LEVEL=debug
```

Check Netlify function logs:
- Netlify dashboard → Functions → Select function → View logs

---

## Security Best Practices

1. **Rotate secrets regularly:**
   - `JWT_SECRET` every 90 days
   - `ADMIN_API_KEY` every 90 days
   - Database passwords every 180 days

2. **Enable rate limiting:**
   - Email verification: 3 attempts per hour (already implemented)
   - API endpoints: Consider adding middleware

3. **Monitor logs:**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Review Netlify function logs weekly

4. **Keep dependencies updated:**
```bash
npm audit
npm update
```

5. **Use HTTPS only:**
   - Netlify automatically provisions SSL
   - Verify `NEXT_PUBLIC_APP_URL` uses `https://`

---

## Performance Optimization

### Current Optimizations

- **File deduplication:** SHA256 hashing prevents duplicate storage
- **STL metrics caching:** Calculations stored in database
- **Lazy AWS SDK loading:** Only loaded when S3 is configured
- **Database indexing:** Optimized queries on frequently accessed fields

### Future Improvements

- Add Redis caching for frequently accessed quotes
- Implement CDN for 3D model previews
- Add lazy loading for large file lists
- Enable incremental static regeneration (ISR) for public pages

---

## Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run tests: `npm run test`
4. Type check: `npm run type-check`
5. Commit: `git commit -m "feat: your feature description"`
6. Push: `git push origin feature/your-feature`
7. Create pull request

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Follow existing patterns and naming conventions
- Add JSDoc comments for public APIs

---

## Support

**Documentation:**
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Resend: https://resend.com/docs
- Three.js: https://threejs.org/docs

**Issues:**
- Report bugs and feature requests via GitHub Issues

---

## License

Private project - All rights reserved

---

## Changelog

### v0.1.0 (Current)
- Initial release
- STL file upload and parsing
- Email verification system
- Automated quote generation
- Support for 7 materials
- Netlify deployment configuration
