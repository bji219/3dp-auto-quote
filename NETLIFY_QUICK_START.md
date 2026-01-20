# 🚀 Netlify Quick Start - Copy & Paste These Variables

## Step 1: Go to Netlify Environment Variables

1. Open your Netlify dashboard: https://app.netlify.com
2. Select your **3dp-auto-quote** site
3. Navigate to: **Site settings → Environment variables**
4. Click **Add a variable** for each variable below

---

## Step 2: Add These Variables (Copy & Paste)

### ✅ Required Variables

**Variable Name:** `DATABASE_URL`
**Value:**
```
postgresql://postgres.cmpuempocorplayelrvc:46z4EkSB3Pq7rYwN@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

---

**Variable Name:** `RESEND_API_KEY`
**Value:** (Get from https://resend.com - sign up and create API key)
```
re_xxxxxxxxxx
```

**Variable Name:** `EMAIL_FROM`
**Value:** (Use this for testing, no domain verification needed)
```
onboarding@resend.dev
```

**Variable Name:** `EMAIL_FROM_NAME`
**Value:**
```
IDW3D Quote System
```

---

**Variable Name:** `NEXT_PUBLIC_APP_URL`
**Value:**
```
https://quote.idw3d.com
```

**Variable Name:** `MAX_FILE_SIZE_MB`
**Value:**
```
50
```

---

**Variable Name:** `JWT_SECRET`
**Value:**
```
0665cc8098314795bb417ae4bb6056b85e5fdd70bcde82a410b3236bf6eb3ee1
```

**Variable Name:** `ADMIN_API_KEY`
**Value:**
```
231241a62b01514acd8571a27677b435
```

---

## Step 3: Get Resend API Key

1. Go to https://resend.com
2. Click **Sign Up** (free account)
3. After signup, go to **API Keys** in dashboard
4. Click **Create API Key**
5. Copy the key (starts with `re_`)
6. Paste it as the value for `RESEND_API_KEY` in Netlify

**For testing:** Use `EMAIL_FROM = onboarding@resend.dev` (works immediately)

**For production:** Verify your domain in Resend:
- Add Domain → `idw3d.com`
- Add DNS records (DKIM, SPF)
- Wait for verification (~1 hour)
- Change `EMAIL_FROM` to `noreply@idw3d.com`

---

## Step 4: Initialize Database Schema

After adding all environment variables, initialize your database:

**Option A - Run Locally:**
```bash
# Clone repo if you haven't already
git clone https://github.com/bji219/3dp-auto-quote.git
cd 3dp-auto-quote

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your DATABASE_URL
nano .env

# Push schema to Supabase
npm run db:push

# Optional: Seed initial data
npm run db:seed
```

**Option B - Via Netlify Build (Easiest):**
1. Add all environment variables to Netlify first
2. Go to: **Site settings → Build & deploy → Build settings**
3. Change **Build command** to:
   ```
   npm run db:push && npm run build
   ```
4. Go to **Deploys** → **Trigger deploy**
5. Wait for deployment to complete
6. Change **Build command** back to:
   ```
   npm run build
   ```

---

## Step 5: Configure Subdomain (quote.idw3d.com)

### In Your DNS Provider (for idw3d.com):

Add a **CNAME record**:
- **Type:** CNAME
- **Name/Host:** `quote`
- **Value/Points to:** `<your-site-name>.netlify.app` (find this in Netlify dashboard)
- **TTL:** 3600 or Auto

### In Netlify:

1. Go to **Domain settings**
2. Click **Add custom domain**
3. Enter: `quote.idw3d.com`
4. Click **Verify** (may need to wait for DNS propagation)
5. Netlify will auto-provision SSL certificate

DNS propagation takes 1-48 hours (usually < 1 hour)

---

## Step 6: Deploy

**Trigger deployment:**
- **Option A:** Push a commit to GitHub
- **Option B:** Netlify dashboard → **Deploys** → **Trigger deploy**

**Monitor build:**
- Watch build logs in Netlify dashboard
- Check for any errors

---

## Step 7: Test Your Application

1. **Visit:** https://quote.idw3d.com (or your Netlify URL)

2. **Test File Upload:**
   - Click or drag-drop an STL file
   - Should show upload progress
   - Should display 3D preview

3. **Test Email Verification:**
   - Enter your email address
   - Check inbox for 6-digit verification code
   - Enter code to verify
   - Should create session

4. **Test Quote Generation:**
   - Select material (PLA, ABS, etc.)
   - Select quality (Draft, Standard, High)
   - Choose infill percentage
   - Click "Generate Quote"
   - Should display itemized pricing

---

## 📋 Checklist

- [ ] Added `DATABASE_URL` to Netlify
- [ ] Created Resend account and API key
- [ ] Added `RESEND_API_KEY` to Netlify
- [ ] Added `EMAIL_FROM` to Netlify
- [ ] Added `EMAIL_FROM_NAME` to Netlify
- [ ] Added `NEXT_PUBLIC_APP_URL` to Netlify
- [ ] Added `MAX_FILE_SIZE_MB` to Netlify
- [ ] Added `JWT_SECRET` to Netlify
- [ ] Added `ADMIN_API_KEY` to Netlify
- [ ] Ran `npm run db:push` to initialize database
- [ ] Added DNS CNAME record (`quote` → `your-site.netlify.app`)
- [ ] Added custom domain in Netlify (`quote.idw3d.com`)
- [ ] Triggered deployment
- [ ] Tested file upload
- [ ] Tested email verification
- [ ] Tested quote generation

---

## 🆘 Troubleshooting

**"Database connection failed"**
- Double-check `DATABASE_URL` has no spaces
- Verify you used the Transaction pooling URL (port :6543)
- Test locally: `npm run db:push`

**"Email not sending"**
- Check `RESEND_API_KEY` is valid
- Verify you're using `onboarding@resend.dev` for testing
- Check Netlify function logs for errors

**"Build fails"**
- Verify Node version is 18+ in Netlify settings
- Check all environment variables are set
- Review build logs for specific errors

**"Session expires immediately"**
- Ensure `JWT_SECRET` is exactly 64 characters
- Clear browser cookies and try again

**DNS not working**
- Wait longer (DNS can take up to 48 hours)
- Verify CNAME record is correct
- Use https://dnschecker.org to check propagation

---

## 📞 Support

- **Full Documentation:** See `CLAUDE.md` and `NETLIFY_SETUP.md` in repo
- **Supabase Dashboard:** https://app.supabase.com/project/cmpuempocorplayelrvc
- **Resend Dashboard:** https://resend.com/emails
- **Netlify Dashboard:** https://app.netlify.com

---

**Last Updated:** 2026-01-20
