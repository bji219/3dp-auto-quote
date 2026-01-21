# Supabase Database Setup Guide

## Quick Setup

### 1. Get Connection Strings from Supabase

Go to your Supabase project → Settings → Database

You'll see two types of connection strings:

#### **Transaction Pooler (Pooled Connection)**
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
- Use this for **Netlify/serverless environments**
- Supports thousands of concurrent connections
- Uses PgBouncer connection pooling
- Add `&pgbouncer=true` at the end

#### **Direct Connection (Session Mode)**
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```
- Use this for **migrations and Prisma Studio**
- Direct connection to PostgreSQL
- Port 5432 (not 6543)

### 2. Configure Environment Variables

#### **For Netlify (Production)**

Go to Netlify Dashboard → Site Settings → Environment Variables

Add these two variables:

```bash
# Transaction pooler for serverless functions
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct connection for migrations (optional, used by deploy scripts)
DIRECT_DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important notes:**
- Replace `[PASSWORD]` with your actual database password
- Add `&connection_limit=1` to the pooled connection
- Keep both URLs - Prisma uses `DATABASE_URL` for queries and `DIRECT_DATABASE_URL` for migrations

#### **For Local Development**

Update your `.env` file:

```bash
# Use transaction pooler for consistency with production
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection for migrations and Prisma Studio
DIRECT_DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Or use direct connection for local dev:**

```bash
# Simpler for local development
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 3. Run Database Migrations

After configuring the connection strings:

```bash
# Generate Prisma Client (already done)
npx prisma generate

# Push schema to Supabase (creates tables)
npx prisma db push

# Or run migrations (if you have migration files)
npx prisma migrate deploy

# Verify with Prisma Studio
npx prisma studio
```

### 4. Seed the Database (Optional)

```bash
npm run db:seed
```

## Troubleshooting

### Error: "Can't reach database server"

**Check:**
1. Is your password correct in the connection string?
2. Did you replace `[PASSWORD]` with the actual password?
3. Are you using the right port (6543 for pooler, 5432 for direct)?
4. Is `?pgbouncer=true` included in the pooled URL?

**Test connection:**
```bash
# Test with psql
psql "postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Test with Prisma
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Error: "Prepared statements are not supported"

**Cause:** Using transaction pooler without `pgbouncer=true` flag

**Solution:**
```bash
# Add pgbouncer flag to DATABASE_URL
DATABASE_URL="...?pgbouncer=true&connection_limit=1"
```

### Error: "Connection pool timeout"

**Cause:** Too many concurrent connections

**Solution:**
Add connection limit to your DATABASE_URL:
```bash
DATABASE_URL="...?connection_limit=1"
```

For Netlify, each function invocation gets 1 connection, which is automatically cleaned up.

### Error: "SSL connection required"

**Solution:**
Add SSL mode to connection string:
```bash
DATABASE_URL="...?sslmode=require"
```

### Migrations failing in production

**Cause:** Transaction pooler doesn't support migrations

**Solution:**
Use direct connection for migrations:
```bash
# In Netlify or locally
DIRECT_DATABASE_URL="..." npx prisma migrate deploy
```

Or add DIRECT_DATABASE_URL to Netlify environment variables.

## Connection String Parameters Explained

### For Serverless (Netlify/Vercel)
```
postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1
```

- `host:6543` - Transaction pooler port
- `pgbouncer=true` - Tell Prisma to use pooler-compatible mode
- `connection_limit=1` - One connection per serverless function
- `sslmode=require` - (Optional) Force SSL

### For Migrations/Admin
```
postgresql://user:pass@host:5432/db
```

- `host:5432` - Direct PostgreSQL port
- No special parameters needed

## Prisma Configuration

Your `prisma/schema.prisma` should look like this:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

## Verifying Setup

### 1. Check Prisma can connect

```bash
npx prisma db execute --stdin <<< "SELECT NOW();"
```

Should return current timestamp.

### 2. Check tables exist

```bash
npx prisma studio
```

Should show your Quote, FileUpload, EmailVerification tables.

### 3. Test insert

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Quote\";"
```

Should return a count (0 if empty).

## Supabase Dashboard

You can also:
- View tables: Supabase Dashboard → Table Editor
- Run SQL: Supabase Dashboard → SQL Editor
- View logs: Supabase Dashboard → Logs

## Next Steps

After database is configured:

1. ✅ Prisma schema updated to PostgreSQL
2. ✅ Connection strings added to Netlify
3. ✅ Migrations run with `npx prisma db push`
4. 🔲 Test file upload on production
5. 🔲 Verify data persists in Supabase
6. 🔲 Configure file storage (S3/R2) for uploads

## Common Supabase Gotchas

1. **Transaction Pooler Limitations:**
   - Can't use prepared statements with `PREPARE`
   - Can't use advisory locks
   - Can't use temporary tables
   - **Solution:** Add `?pgbouncer=true` to tell Prisma to work around these

2. **Connection String Format:**
   - Use `postgres.xxx` (not `db.xxx`) in hostname
   - Include project reference in hostname
   - Password may contain special characters (URL-encode them)

3. **SSL Requirement:**
   - Supabase requires SSL by default
   - Add `?sslmode=require` if you get SSL errors

4. **Row Level Security (RLS):**
   - RLS is enabled by default on new tables
   - May need to disable for service role access
   - Or use service role key (not recommended for client-side)

## Support

If you continue having issues:
- Check Supabase status: https://status.supabase.com
- Supabase docs: https://supabase.com/docs/guides/database
- Prisma + Supabase guide: https://www.prisma.io/docs/guides/database/supabase
