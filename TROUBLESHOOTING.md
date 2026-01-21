# Troubleshooting Guide

## STL Upload Failures

### Production Issues (quote.idw3d.com)

#### 1. Database Not Configured (500 Error)

**Symptoms:**
- 500 Internal Server Error on `/api/upload`
- Error logs show database connection failures

**Solution:**
Set up production database in Netlify:

1. **Option A: Neon (Recommended - Free PostgreSQL)**
   ```bash
   # Go to https://neon.tech
   # Create account and new project
   # Create database: quote_production
   # Copy connection string
   ```

2. **Add to Netlify Environment Variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `DATABASE_URL=postgresql://user:pass@host/database`
   - Redeploy site

3. **Run Migrations:**
   ```bash
   # Locally, with production DATABASE_URL
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   # Or push schema directly
   DATABASE_URL="your-production-url" npx prisma db push
   ```

#### 2. File Storage Issues

**Symptoms:**
- Files upload but disappear
- "File not found" errors after upload
- Files work initially but break on next request

**Cause:**
Netlify filesystem is read-only except `/tmp`, and `/tmp` is cleared between function invocations.

**Solution:**

**Short-term (Development/Testing):**
- Files stored in `/tmp` will work temporarily but be lost
- Good for testing the flow without setting up S3

**Long-term (Production):**
Use AWS S3 or Cloudflare R2 for persistent storage:

1. **Set up S3 bucket:**
   ```bash
   # Create S3 bucket: quote-idw3d-uploads
   # Set bucket policy for public read (optional)
   # Create IAM user with S3 access
   # Get access keys
   ```

2. **Add to Netlify Environment Variables:**
   ```bash
   STORAGE_TYPE=s3
   STORAGE_BUCKET=quote-idw3d-uploads
   STORAGE_REGION=us-east-1
   STORAGE_ACCESS_KEY_ID=your-access-key
   STORAGE_SECRET_ACCESS_KEY=your-secret-key
   ```

3. **Alternative: Cloudflare R2 (S3-compatible, cheaper)**
   ```bash
   STORAGE_TYPE=s3
   STORAGE_BUCKET=quote-uploads
   STORAGE_ENDPOINT=https://your-account.r2.cloudflarestorage.com
   STORAGE_ACCESS_KEY_ID=your-r2-access-key
   STORAGE_SECRET_ACCESS_KEY=your-r2-secret-key
   ```

#### 3. Environment Variables Missing

**Required Variables for Production:**
```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-random-32-character-secret

# App URL
NEXT_PUBLIC_APP_URL=https://quote.idw3d.com

# Email (Gmail SMTP or Resend)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@idw3d.com

# Storage (for production use S3)
STORAGE_TYPE=s3
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret
```

### Development Issues (localhost:3000)

#### 1. "Failed to Process STL File"

**Symptoms:**
- Some STL files fail to upload
- Error: "Invalid STL file" or "Failed to process file"

**Common Causes:**

**A. Corrupted or Invalid STL Files**
- File is not actually an STL (wrong extension)
- Binary STL with incorrect header
- ASCII STL with malformed syntax
- File is corrupted

**Solution:**
- Validate STL in a 3D viewer (Blender, MeshLab)
- Re-export STL from original CAD software
- Try both ASCII and Binary format exports
- Check file isn't corrupted (try re-downloading)

**B. Very Large Files**
- File size exceeds MAX_FILE_SIZE_MB (default 50MB)
- Parsing times out (very complex geometry)

**Solution:**
- Reduce triangle count (decimate mesh)
- Split large models into smaller parts
- Increase timeout in `src/app/api/upload/route.ts`

**C. Invalid Geometry**
- Non-manifold edges (holes in mesh)
- Inverted normals
- Zero-volume objects

**Solution:**
- Run mesh repair in Blender:
  ```
  Edit Mode → Select All → Mesh → Clean Up → Merge by Distance
  Edit Mode → Mesh → Normals → Recalculate Outside
  ```
- Use MeshLab: Filters → Cleaning and Repairing → Remove Duplicate Faces/Vertices

#### 2. Database Connection Failures (Dev)

**Symptoms:**
- "Error: P1001: Can't reach database server"
- SQLite file locked

**Solution:**
```bash
# Reset local database
rm -f prisma/dev.db
npx prisma migrate reset
npx prisma db push
npm run db:seed
```

#### 3. File Upload Permissions

**Symptoms:**
- EACCES: permission denied
- Cannot create directory

**Solution:**
```bash
# Ensure uploads directory exists with correct permissions
mkdir -p public/uploads
chmod 755 public/uploads
```

## Debugging Tools

### View Netlify Function Logs

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link to your site
netlify link

# View real-time logs
netlify dev --live
```

### Test STL Parsing Locally

```javascript
// Create test file: test-stl-parse.js
const { parseSTL } = require('./src/utils/stl-parser-enhanced');
const fs = require('fs');

async function testParse(filePath) {
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  try {
    const result = await parseSTL(arrayBuffer);
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed:', error);
  }
}

testParse('./path/to/your/test.stl');
```

### Check Database Connection

```bash
# Test database connection
npx prisma studio

# View connection string (sanitized)
echo $DATABASE_URL | sed 's/:.*@/:***@/'
```

### Verify Environment Variables

Create a test endpoint to verify configuration (remove after debugging):

```typescript
// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    database: process.env.DATABASE_URL ? 'Configured' : 'Missing',
    storage: process.env.STORAGE_TYPE || 'local (default)',
    email: process.env.EMAIL_HOST ? 'Configured' : 'Missing',
    jwt: process.env.JWT_SECRET ? 'Configured' : 'Missing',
    isNetlify: !!process.env.NETLIFY,
    nodeVersion: process.version,
  });
}
```

Visit `https://quote.idw3d.com/api/debug` to check configuration.

## Common Error Messages

### "Invalid STL file"
- File is corrupted or not a valid STL
- Try re-exporting from CAD software
- Check with 3D viewer first

### "File too large"
- Exceeds 50MB limit
- Reduce polygon count
- Split into smaller parts

### "Failed to process file"
- Check server logs for details
- Often database or storage configuration issue
- Verify environment variables

### "ENOENT: no such file or directory"
- Storage path doesn't exist
- On Netlify: need to configure S3
- On local: create `public/uploads` directory

### "P2002: Unique constraint failed"
- Duplicate fileId or fileHash
- Usually safe to ignore (deduplication working)
- File reused from cache

## Getting Help

If issues persist:

1. **Check Netlify Deploy Logs:**
   - Netlify Dashboard → Deploys → [Latest Deploy] → Deploy log

2. **Check Function Logs:**
   - Netlify Dashboard → Functions → [Function] → Logs

3. **Enable Debug Logging:**
   - Add `console.log` statements
   - Redeploy and check logs

4. **Test Locally First:**
   - Always test uploads locally before production
   - Use `npm run dev` and test with various STL files

5. **Verify File Integrity:**
   - Open STL in Blender/MeshLab
   - Check for mesh errors
   - Re-export if necessary
