# Netlify Environment Variables Setup Guide

## Quick Setup Checklist

Follow these steps to configure your environment variables in Netlify:

### Step 1: Access Netlify Environment Variables

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your **3dp-auto-quote** site
3. Navigate to: **Site settings → Environment variables**
4. Click **Add a variable** for each variable below

---

## Required Environment Variables

### Database Configuration

**Variable:** `DATABASE_URL`

**Value:** Your Supabase PostgreSQL connection string (Transaction pooling mode)

```
postgresql://postgres.cmpuempocorplayelrvc:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**How to get this:**
1. Go to Supabase dashboard: https://app.supabase.com/project/cmpuempocorplayelrvc
2. Settings → Database → Connection String
3. Select **"Transaction"** mode (for serverless/Netlify)
4. Copy the URL and replace `[YOUR-PASSWORD]` with your database password

**⚠️ Important:** Use the **Transaction pooling** connection string, not the Direct connection.

---

### Email Configuration (Resend - Recommended)

**Variable:** `RESEND_API_KEY`

**Value:** `re_xxxxxxxxxx` (Get from Resend dashboard)

**How to get this:**
1. Sign up at https://resend.com
2. Go to **API Keys** → Create API Key
3. Copy the key (starts with `re_`)

**Variable:** `EMAIL_FROM`

**Value:** `noreply@idw3d.com`

**Variable:** `EMAIL_FROM_NAME`

**Value:** `IDW3D Quote System`

**Domain Verification (for sending from @idw3d.com):**
1. In Resend: Go to **Domains** → Add Domain
2. Enter: `idw3d.com`
3. Add the DNS records (DKIM, SPF) to your DNS provider
4. Wait for verification (~1 hour)
5. You can now send from `noreply@idw3d.com`

**Alternative - For Testing (skip domain verification):**
- Use `EMAIL_FROM = onboarding@resend.dev` for testing
- This works immediately without domain verification
- Switch to your custom domain later

---

### Email Configuration (Gmail Fallback - Optional)

If you prefer Gmail or want a backup:

**Variable:** `EMAIL_HOST`
**Value:** `smtp.gmail.com`

**Variable:** `EMAIL_PORT`
**Value:** `587`

**Variable:** `EMAIL_USER`
**Value:** `your-email@gmail.com`

**Variable:** `EMAIL_PASSWORD`
**Value:** `xxxx xxxx xxxx xxxx` (16-character app password)

**How to get Gmail App Password:**
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and generate password
4. Copy the 16-character password

---

### Application Settings

**Variable:** `NEXT_PUBLIC_APP_URL`

**Value:** `https://quote.idw3d.com`

*(Use your Netlify URL during initial setup: `https://your-site-name.netlify.app`)*

---

**Variable:** `MAX_FILE_SIZE_MB`

**Value:** `50`

---

### Security Keys (Generate New Random Strings)

**Variable:** `JWT_SECRET`

**Value:** 64-character random hex string

**Generate with:**
```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6...` (64 characters)

---

**Variable:** `ADMIN_API_KEY`

**Value:** 32-character random hex string

**Generate with:**
```bash
openssl rand -hex 16
```

Example output: `a1b2c3d4...` (32 characters)

---

### Optional: File Storage (AWS S3)

Only add these if you want to use S3 instead of local storage:

**Variable:** `STORAGE_TYPE`
**Value:** `s3`

**Variable:** `STORAGE_BUCKET`
**Value:** `idw3d-quote-uploads`

**Variable:** `STORAGE_REGION`
**Value:** `us-east-1`

**Variable:** `STORAGE_ACCESS_KEY_ID`
**Value:** Your AWS access key

**Variable:** `STORAGE_SECRET_ACCESS_KEY`
**Value:** Your AWS secret key

---

### Optional: Pricing Overrides

Only add these if you want to customize pricing:

**Variable:** `BASE_PRICE_PER_CM3`
**Value:** `0.15`

**Variable:** `MATERIAL_COST_MULTIPLIER`
**Value:** `1.2`

**Variable:** `RUSH_ORDER_MULTIPLIER`
**Value:** `1.5`

**Variable:** `CLEANUP_MAX_FILE_AGE_DAYS`
**Value:** `30`

**Variable:** `CLEANUP_ENABLED`
**Value:** `true`

---

## Step 2: Initialize Database Schema

After adding `DATABASE_URL`, you need to push the database schema to Supabase.

### Option A: Run Locally

```bash
# Install dependencies
npm install

# Push schema to Supabase
npm run db:push

# Optional: Seed initial data
npm run db:seed
```

### Option B: Via Netlify Build (One-time)

1. In Netlify: **Site settings → Build & deploy → Build settings**
2. **Build command:** Temporarily change to:
   ```
   npm run db:push && npm run build
   ```
3. **Trigger deploy:** Deploys → Trigger deploy
4. **After successful deploy:** Change build command back to:
   ```
   npm run build
   ```

---

## Step 3: Trigger Deployment

1. **Automatic:** Push a commit to GitHub, OR
2. **Manual:** Netlify dashboard → Deploys → Trigger deploy → Deploy site

---

## Step 4: Verify Setup

### Check Build Logs
- Netlify dashboard → Deploys → [Latest deploy] → Deploy log
- Look for successful build completion

### Test the Application

1. **Visit your site:** https://quote.idw3d.com (or your Netlify URL)
2. **Upload STL file** → Should process successfully
3. **Email verification:**
   - Enter your email
   - Check inbox for 6-digit code
   - Verify code works
4. **Generate quote:**
   - Select material and options
   - Should display itemized quote

### Check Function Logs

- Netlify dashboard → Functions → Select a function → Logs
- Look for any errors or issues

---

## Environment Variable Summary Checklist

**Required (Minimum to run):**
- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `RESEND_API_KEY` - Resend API key (or Gmail SMTP settings)
- [ ] `EMAIL_FROM` - Sending email address
- [ ] `EMAIL_FROM_NAME` - Display name for emails
- [ ] `NEXT_PUBLIC_APP_URL` - Your domain URL
- [ ] `MAX_FILE_SIZE_MB` - File size limit
- [ ] `JWT_SECRET` - Session encryption key
- [ ] `ADMIN_API_KEY` - Admin operations key

**Optional (Enhance functionality):**
- [ ] `STORAGE_TYPE` / `STORAGE_BUCKET` / etc. - S3 configuration
- [ ] Pricing override variables
- [ ] Debug/logging variables

---

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Ensure you used the **Transaction pooling** URL from Supabase
- Check that your Supabase project is active
- Test connection locally: `npm run db:push`

### "Email not sending"
- For Resend: Verify API key is valid
- For Resend: Check domain verification status
- For testing: Use `EMAIL_FROM = onboarding@resend.dev`
- Check Netlify function logs for specific errors

### "Build fails"
- Check Node version is 18+ in Netlify: Site settings → Build & deploy → Environment
- Verify all required environment variables are set
- Review build logs for specific error messages

### "Session expires immediately"
- Ensure `JWT_SECRET` is set and is exactly 64 characters
- Clear browser cookies and try again

---

## Security Best Practices

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Rotate secrets regularly:**
   - `JWT_SECRET` - every 90 days
   - `ADMIN_API_KEY` - every 90 days
   - Database passwords - every 180 days
3. **Use environment-specific keys:**
   - Different keys for development vs production
   - Use Netlify's environment scopes if needed

---

## Quick Command Reference

```bash
# Generate JWT_SECRET (64 chars)
openssl rand -hex 32

# Generate ADMIN_API_KEY (32 chars)
openssl rand -hex 16

# Push database schema
npm run db:push

# Open Prisma Studio (view database)
npm run db:studio

# Run cleanup job
npm run cleanup

# Test locally with Netlify environment
netlify dev
```

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs/guides/database
- **Resend Docs:** https://resend.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Prisma Docs:** https://www.prisma.io/docs

---

**Last Updated:** 2026-01-20
