# Deployment Guide

This guide covers deploying the 3D Print Quote system to Netlify at `quote.idw3d.com`.

## Prerequisites

- Netlify account
- GitHub repository connected
- Domain `idw3d.com` configured in Netlify DNS (or access to DNS provider)

## Step 1: Create New Netlify Site

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select `bji219/3dp-auto-quote` repository
4. Select branch: `main`
5. Build settings (should auto-detect from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Base directory: (leave empty)

## Step 2: Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

### Database
```
DATABASE_URL=<your-production-database-url>
```
**Note:** For production, use PostgreSQL instead of SQLite:
- Option 1: [Neon](https://neon.tech/) (free tier available)
- Option 2: [Supabase](https://supabase.com/) (free tier available)
- Option 3: [PlanetScale](https://planetscale.com/)

### Email Configuration
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=intelligentdesignworkslimited@gmail.com
EMAIL_PASSWORD=<your-gmail-app-password>
EMAIL_FROM=intelligentdesignworkslimited@gmail.com
EMAIL_FROM_NAME=IDW3D Print Quote
```

### Application Settings
```
NEXT_PUBLIC_APP_URL=https://quote.idw3d.com
MAX_FILE_SIZE_MB=50
SKIP_EMAIL_VERIFICATION=false
```

### Security
```
JWT_SECRET=<generate-new-secret-for-production>
ADMIN_API_KEY=<generate-new-key-for-production>
```

To generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### File Storage (Optional - S3)
```
STORAGE_TYPE=s3
STORAGE_BUCKET=<your-bucket-name>
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=<your-access-key>
STORAGE_SECRET_ACCESS_KEY=<your-secret-key>
```

### Pricing Configuration
```
BASE_PRICE_PER_CM3=0.15
MATERIAL_COST_MULTIPLIER=1.2
RUSH_ORDER_MULTIPLIER=1.5
```

### Cleanup Settings
```
CLEANUP_MAX_FILE_AGE_DAYS=30
CLEANUP_ENABLED=true
```

## Step 3: Set Up Subdomain

### Option A: Using Netlify DNS (if idw3d.com uses Netlify DNS)

1. Go to your main site's Netlify dashboard
2. Domain Settings → Domains → "Add a domain alias"
3. Enter: `quote.idw3d.com`
4. Netlify will automatically configure DNS

### Option B: Using External DNS Provider

1. In your DNS provider (e.g., Cloudflare, GoDaddy, etc.), add a CNAME record:
   - **Type:** CNAME
   - **Name:** quote
   - **Value:** `<your-netlify-site>.netlify.app`
   - **TTL:** Auto or 3600

2. In Netlify Dashboard → Domain Settings → Add custom domain:
   - Enter: `quote.idw3d.com`
   - Verify DNS configuration

3. Enable HTTPS:
   - Netlify will automatically provision Let's Encrypt SSL certificate
   - Wait 1-24 hours for DNS propagation

## Step 4: Database Setup (Production)

### Using Neon (PostgreSQL - Free Tier)

1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Update `DATABASE_URL` in Netlify environment variables
5. Run migrations:
   ```bash
   # Locally, with production DATABASE_URL
   npm run db:migrate:prod
   npm run db:seed
   ```

### Update Prisma Schema for PostgreSQL

In `prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then regenerate Prisma client:
```bash
npm run db:generate
git add prisma/schema.prisma
git commit -m "Update database provider for production"
git push
```

## Step 5: Configure CORS (if needed)

If the main site at `www.idw3d.com` needs to make API calls to `quote.idw3d.com`:

Create `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Origin', 'https://www.idw3d.com');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## Step 6: Link from Main Site

Add a link in your main site's navigation:

```html
<a href="https://quote.idw3d.com" class="get-quote-btn">
  Get a Quote
</a>
```

## Step 7: Deploy

1. Push changes to GitHub `main` branch
2. Netlify will automatically build and deploy
3. Monitor build logs in Netlify dashboard
4. Test at `quote.idw3d.com` once deployed

## Matching Styles with Main Site

To maintain consistent styling:

1. Extract main site's CSS variables
2. Copy to `src/app/globals.css`:
   ```css
   :root {
     --primary-color: #...;
     --secondary-color: #...;
     /* etc */
   }
   ```

3. Or include main site's stylesheet:
   ```html
   <link rel="stylesheet" href="https://www.idw3d.com/styles/main.css">
   ```

## Monitoring

- Set up [Netlify Analytics](https://docs.netlify.com/monitor-sites/analytics/)
- Configure [Netlify Functions logs](https://docs.netlify.com/functions/logs/)
- Set up error tracking (e.g., Sentry)

## Troubleshooting

### Build Fails
- Check Netlify build logs
- Ensure all environment variables are set
- Verify Node version (18+)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure database accepts connections from Netlify IPs
- Check SSL requirements for production database

### Email Not Sending
- Verify Gmail app password is correct
- Check email credentials in environment variables
- Review Netlify function logs for errors

## Cost Considerations

### Free Tier Limits
- **Netlify:** 100GB bandwidth/month, 300 build minutes/month
- **Neon:** 0.5GB storage, 10GB data transfer
- **Estimated cost:** $0/month for small traffic

### Scaling
If you exceed free tiers:
- **Netlify Pro:** $19/month (1TB bandwidth)
- **Neon Scale:** $19/month (10GB storage)
- **S3 Storage:** ~$0.023/GB/month

## Security Checklist

- [ ] Generate new JWT_SECRET for production
- [ ] Generate new ADMIN_API_KEY for production
- [ ] Use strong database password
- [ ] Enable HTTPS (automatic with Netlify)
- [ ] Set up rate limiting (consider Cloudflare)
- [ ] Configure CSP headers
- [ ] Review .gitignore (ensure .env not committed)
- [ ] Set up automated backups for database
