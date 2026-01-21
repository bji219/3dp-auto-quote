# Netlify + Supabase Integration Setup

## What Changed

Your site now uses the **Netlify Supabase Integration**, which automatically manages your database connection and provides these environment variables:

- `SUPABASE_DATABASE_URL` - Connection string for your database
- `SUPABASE_ANON_KEY` - Public anonymous key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (for server-side)
- `SUPABASE_JWT_SECRET` - JWT signing secret

## Current Configuration

### ✅ What's Already Set Up

1. **Netlify Supabase Integration** - Installed and active
2. **Prisma Schema** - Updated to use `SUPABASE_DATABASE_URL`
3. **Prisma Client** - Configured with fallback logic
4. **Local Development** - Migrated to use `SUPABASE_DATABASE_URL`

### 🔧 Required Environment Variables

The Netlify integration provides these **automatically**:
- ✅ `SUPABASE_DATABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_JWT_SECRET`

You still need to **manually add** these in Netlify:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://quote.idw3d.com

# JWT Secret (use SUPABASE_JWT_SECRET or create your own)
JWT_SECRET=<your-jwt-secret>

# Email (Gmail SMTP or Resend)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@idw3d.com
EMAIL_FROM_NAME=IDW3D Quote System

# File Storage (S3 or local /tmp)
STORAGE_TYPE=local
# For production, use S3:
# STORAGE_TYPE=s3
# STORAGE_BUCKET=quote-idw3d-uploads
# STORAGE_ACCESS_KEY_ID=...
# STORAGE_SECRET_ACCESS_KEY=...
```

## Local Development Setup

### 1. Update Your .env File

Your `.env` should now use `SUPABASE_DATABASE_URL`:

```bash
# Database - Get from Supabase Dashboard → Settings → Database
SUPABASE_DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# JWT Secret
JWT_SECRET="your-random-32-character-secret"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (Gmail SMTP)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"
EMAIL_FROM="noreply@idw3d.com"
EMAIL_FROM_NAME="3D Print Quote"

# Storage
STORAGE_TYPE="local"
```

### 2. Initialize Database

If you haven't already, push the schema to Supabase:

```bash
npx prisma db push
```

This creates all the tables in your Supabase database.

### 3. Verify Connection

```bash
# Test database connection
npx prisma studio

# Should open at http://localhost:5555
# You should see: Quote, FileUpload, EmailVerification, etc.
```

## Netlify Deployment

### Current Status

After the latest push, Netlify should successfully build because:
1. ✅ Prisma uses `SUPABASE_DATABASE_URL` (provided by integration)
2. ✅ Fallback logic handles missing DATABASE_URL
3. ✅ Build-time placeholder prevents undefined errors

### Next Deploy

The build should now succeed. After it deploys:

1. **Verify Database Connection**
   - Check Netlify Function Logs
   - Look for successful Prisma queries

2. **Test File Upload**
   - Go to https://quote.idw3d.com
   - Upload an STL file
   - Should process without 500 error

3. **Check Supabase Data**
   - Go to Supabase Dashboard → Table Editor
   - Look for records in FileUpload table

## Troubleshooting

### Build Still Failing with "Invalid value undefined"

**Cause:** Prisma schema not regenerated

**Solution:**
```bash
npx prisma generate
git add node_modules/.prisma
git commit -m "Regenerate Prisma client"
git push
```

### Local Development: "Error: P1001: Can't reach database"

**Cause:** Wrong connection string in .env

**Solution:**
1. Get connection string from Supabase Dashboard
2. Make sure it's the **Transaction Pooler** (port 6543)
3. Include `?pgbouncer=true` at the end

Example:
```
SUPABASE_DATABASE_URL="postgresql://postgres.abc:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Production: 500 Error on Upload

**Possible Causes:**
1. Database tables not created
2. Missing environment variables
3. File storage path issues

**Solutions:**

**1. Create Tables:**
```bash
# Locally, push schema to Supabase
SUPABASE_DATABASE_URL="your-connection-string" npx prisma db push
```

**2. Check Netlify Environment:**
- Site Settings → Environment Variables
- Verify all required variables are set

**3. File Storage:**
- Files stored in `/tmp` on Netlify (ephemeral)
- For persistence, configure S3 (see TROUBLESHOOTING.md)

### "Prepared statements are not supported"

**Cause:** Missing `pgbouncer=true` flag

**Solution:**
Add to your connection string:
```
?pgbouncer=true
```

Full example:
```
postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Migration from Manual Setup

If you previously had `DATABASE_URL` manually configured:

1. **Remove from Netlify:**
   - Site Settings → Environment Variables
   - Delete: `DATABASE_URL`
   - Delete: `DIRECT_DATABASE_URL`

2. **Netlify Integration Provides:**
   - Automatically sets `SUPABASE_DATABASE_URL`
   - No manual connection string needed
   - Updates automatically if you change Supabase password

3. **Keep Other Variables:**
   - JWT_SECRET
   - EMAIL_* variables
   - STORAGE_* variables
   - NEXT_PUBLIC_APP_URL

## Verifying Everything Works

### ✅ Checklist

- [ ] Netlify build succeeds
- [ ] Can access https://quote.idw3d.com
- [ ] Can upload STL file without 500 error
- [ ] File appears in Supabase Table Editor
- [ ] Can calculate quote successfully
- [ ] Email verification sends (if configured)

### 📊 Monitoring

**Netlify Function Logs:**
```
Netlify Dashboard → Functions → [Latest] → Logs
```

**Supabase Logs:**
```
Supabase Dashboard → Logs → Postgres Logs
```

**Check for:**
- Database queries executing
- No connection errors
- Files being saved to database

## Next Steps

Once the build succeeds:

1. ✅ Test STL upload flow
2. ✅ Verify data persists in Supabase
3. 🔲 Configure S3 for file storage (optional)
4. 🔲 Set up custom domain (quote.idw3d.com)
5. 🔲 Configure email service (Resend recommended)
6. 🔲 Add link from main site (www.idw3d.com)

## Resources

- **Netlify Supabase Integration:** https://docs.netlify.com/integrations/supabase/
- **Prisma + Supabase:** https://www.prisma.io/docs/guides/database/supabase
- **Troubleshooting:** See TROUBLESHOOTING.md in this repo
