# Integration Guide: Complete User Journey

This document describes the complete end-to-end flow of the 3D printing quote system and how all components integrate together.

## Overview

The system consists of a 4-step wizard that guides users through:
1. **Upload** - Upload STL file
2. **Preview** - View 3D model
3. **Verify** - Email verification
4. **Quote** - Generate and view detailed quote

## Complete User Flow

### Step 1: File Upload

**User Action:** User visits `/quote` and drags/drops an STL file

**Frontend Component:** `FileUploadZone`
- Validates file type (.stl only)
- Validates file size (max 50MB)
- Shows upload progress
- Displays file metrics after upload

**API Endpoint:** POST `/api/upload`

**Backend Process:**
1. Receive file via FormData
2. Validate file type and size
3. Parse STL file to extract metrics:
   - Volume (cm³)
   - Surface area (cm²)
   - Bounding box (x, y, z dimensions)
   - Estimated print time
4. Calculate SHA256 hash
5. Check for duplicate files (deduplication)
6. Save file to storage (local or S3)
7. Create FileUpload database record
8. Return fileId and metrics

**Database Tables:**
- `FileUpload` - Record created with file metadata

**Data Flow:**
```typescript
{
  fileId: "file_1704067200000_abc123",
  fileName: "model.stl",
  fileSize: 1234567,
  fileHash: "sha256...",
  stlData: {
    volume: 125.5,
    surfaceArea: 450.2,
    boundingBox: { x: 50, y: 50, z: 30 },
    estimatedPrintTime: 4.5
  }
}
```

**Error Handling:**
- File too large → 400 error
- Invalid file type → 400 error
- Corrupted STL → 400 error
- Upload failure → 500 error
- All errors caught by ErrorBoundary

---

### Step 2: 3D Preview

**User Action:** User views their uploaded model in 3D

**Frontend Component:** `ModelPreview`
- Loads STL file from `/uploads/{fileId}.stl`
- Renders with Three.js
- Interactive controls (rotate, zoom, pan)
- Auto-camera positioning

**No API Calls** - File loaded directly from public storage

**Features:**
- Orbit controls for interaction
- Professional lighting setup
- Responsive canvas sizing
- Loading states
- Error handling for missing files

**Error Handling:**
- File not found → Shows error message
- Loading failure → Displays fallback UI
- Caught by ErrorBoundary

---

### Step 3: Email Verification

**User Action:** User enters email and verification code

**Frontend Component:** `EmailVerification`
- Two-step form (email → code)
- 6-digit code input with auto-formatting
- Countdown timer (15 minutes)
- Rate limit display
- Resend functionality

**API Endpoints:**

**3a. Send Code:** POST `/api/verify-email`

**Backend Process:**
1. Validate email format
2. Check rate limiting (3 attempts per hour per email)
3. Generate cryptographically secure 6-digit code
4. Save to EmailVerification table with 15-min expiry
5. Send email via Resend/SendGrid/SMTP
6. Track attempt in VerificationAttempt table
7. Return expiration time and attempts remaining

**Database Tables:**
- `EmailVerification` - Code stored with expiry
- `VerificationAttempt` - Rate limiting tracking

**3b. Verify Code:** POST `/api/confirm-code`

**Backend Process:**
1. Validate email and code format
2. Check rate limiting
3. Find matching verification record
4. Verify code hasn't expired
5. Mark code as verified
6. Generate JWT session token (24-hour expiry)
7. Create UserSession database record
8. Subscribe email to mailing list
9. Send welcome email (async)
10. Return session token and user info

**Database Tables:**
- `EmailVerification` - Marked as verified
- `UserSession` - New session created
- `MailingListSubscriber` - User subscribed

**Data Flow:**
```typescript
{
  sessionToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  expiresAt: "2026-01-19T12:00:00.000Z",
  user: {
    email: "user@example.com"
  }
}
```

**Error Handling:**
- Invalid email → 400 error
- Rate limit exceeded → 429 error
- Invalid code → 400 error
- Expired code → 400 error
- All errors displayed to user

---

### Step 4: Quote Generation

**User Action:** User selects material, quality, infill, and generates quote

**Frontend Component:** `QuoteDisplay`
- Material selector (7 options)
- Quality selector (draft/standard/high)
- Infill slider (10-100%)
- Rush order checkbox
- Calculate button
- Detailed cost breakdown display

**API Endpoint:** POST `/api/calculate-quote`

**Backend Process:**
1. Authenticate request (require JWT token)
2. Validate request data (fileId, material, quality, etc.)
3. Check if file exists in storage
4. Read and parse STL file (or use cached metrics)
5. Calculate detailed quote using pricing engine:
   - Setup fee
   - Material cost (volume × material price × infill)
   - Labor cost (base + hourly rate)
   - Machine cost (print time × machine rate)
   - Complexity surcharge (if surface/volume ratio high)
   - Shipping cost (weight + dimensions)
   - Volume discounts
   - Rush order fee (if selected)
   - Tax
6. Save quote to database
7. Set quote validity (7 days)
8. Return comprehensive quote

**Database Tables:**
- `Quote` - New quote record created
- `FileUpload` - lastAccessedAt updated

**Data Flow:**
```typescript
{
  quote: {
    id: "clr1234567890",
    model: {
      volume: 125.5,
      surfaceArea: 450.2,
      weight: 155.7,
      complexity: 3.58
    },
    material: {
      name: "PLA",
      costPerCm3: 0.04
    },
    print: {
      estimatedTime: 4.5,
      infillPercentage: 20,
      quality: "standard"
    },
    breakdown: {
      setupFee: 10.00,
      materialCost: 6.28,
      laborCost: 15.00,
      machineCost: 13.50,
      complexitySurcharge: 5.00,
      shippingCost: 8.50,
      subtotal: 58.28,
      discount: 0.00,
      rushOrderFee: 0.00,
      taxAmount: 4.66,
      total: 62.94
    },
    validUntil: "2026-01-25T12:00:00.000Z"
  }
}
```

**Error Handling:**
- Unauthorized → 401 error
- File not found → 404 error
- Invalid parameters → 400 error
- Calculation failure → 500 error
- All errors displayed to user

---

## Data Persistence

### Files Stored
- **Location:** `public/uploads/` (local) or S3 bucket
- **Format:** `file_timestamp_hash.stl`
- **Deduplication:** Files with same SHA256 hash reused
- **Cleanup:** Files >30 days old marked for deletion

### Database Records

**After Complete Flow:**
1. `FileUpload` - File metadata and STL metrics
2. `EmailVerification` - Verification code (verified)
3. `VerificationAttempt` - All verification attempts
4. `UserSession` - Active session token
5. `MailingListSubscriber` - User subscribed
6. `Quote` - Generated quote with pricing

**Example Quote Record:**
```sql
SELECT * FROM Quote WHERE id = 'clr1234567890';

id: clr1234567890
email: user@example.com
emailVerified: true
fileId: file_1704067200000_abc123
fileName: model.stl
volume: 125.5
surfaceArea: 450.2
material: PLA
quality: standard
infillPercentage: 20
totalCost: 62.94
status: pending
validUntil: 2026-01-25T12:00:00.000Z
createdAt: 2026-01-18T12:00:00.000Z
```

---

## Authentication Flow

### Session Token (JWT)

**Token Payload:**
```json
{
  "email": "user@example.com",
  "iat": 1704067200,
  "exp": 1704153600
}
```

**Token Usage:**
- Included in Authorization header: `Bearer eyJhbGc...`
- Or X-Session-Token header: `eyJhbGc...`
- Validated against UserSession table
- Must not be expired
- Session must be active

**Token Validation Process:**
1. Extract token from request headers
2. Verify JWT signature
3. Check expiration time
4. Query UserSession table
5. Ensure session is active
6. Return user email

---

## Error Boundaries

**React Error Boundaries** wrap each step:
- Upload step
- Preview step  
- Verification step
- Quote step

**Error Boundary Features:**
- Catches component errors
- Displays user-friendly error message
- Shows error details in development
- Provides "Try Again" button
- Provides "Go Home" button
- Logs errors to console

**Example Error UI:**
```
┌─────────────────────────────┐
│  ⚠️  Something went wrong   │
│                             │
│  We encountered an          │
│  unexpected error.          │
│  Please try again.          │
│                             │
│  [Try Again]  [Go Home]     │
└─────────────────────────────┘
```

---

## API Error Responses

All API endpoints return consistent error format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error details"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Resource created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Resource not found
- `429` - Too many requests (rate limited)
- `500` - Internal server error

---

## State Management

**Quote Flow State:**
```typescript
{
  currentStep: 'upload' | 'preview' | 'verify' | 'quote',
  uploadedFile: {
    fileId: string,
    fileName: string,
    fileSize: number,
    stlData: STLData
  } | null,
  sessionToken: string | null,
  userEmail: string | null,
  generatedQuoteId: string | null,
  error: string
}
```

**State Transitions:**
- `upload` → `preview` (after file upload)
- `preview` → `verify` (user clicks "Continue")
- `verify` → `quote` (after code verification)
- `quote` → `upload` (user clicks "Get Another Quote")

---

## Testing the Complete Flow

### Manual Testing Steps

1. **Start Application:**
   ```bash
   npm run dev
   ```

2. **Visit Homepage:**
   - Navigate to `http://localhost:3000`
   - Click "Get Started"

3. **Upload STL File:**
   - Drag and drop a .stl file (or use test fixtures)
   - Verify metrics are displayed
   - Check file saved to `public/uploads/`
   - Check FileUpload record in database

4. **View 3D Preview:**
   - Verify model renders correctly
   - Test orbit controls
   - Click "Continue to Verification"

5. **Email Verification:**
   - Enter email address
   - Verify code sent (check email or logs)
   - Enter 6-digit code
   - Verify session token received

6. **Generate Quote:**
   - Select material (e.g., PLA)
   - Adjust quality and infill
   - Click "Calculate Quote"
   - Verify detailed breakdown displayed
   - Check Quote record in database

7. **Verify Quote:**
   - Note the quote ID
   - Visit `/api/quote/{id}`
   - Verify JSON response with quote details

### Database Verification

```bash
# Open Prisma Studio
npm run db:studio

# Check records created:
# - FileUpload (1 record)
# - EmailVerification (1 record, verified=true)
# - UserSession (1 record, isActive=true)
# - Quote (1 record, status=pending)
# - MailingListSubscriber (1 record)
```

### API Testing

```bash
# Test upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.stl"

# Test verify email
curl -X POST http://localhost:3000/api/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test confirm code
curl -X POST http://localhost:3000/api/confirm-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# Test calculate quote
curl -X POST http://localhost:3000/api/calculate-quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fileId":"file_123_abc",
    "material":"PLA",
    "quality":"standard",
    "infillPercentage":20
  }'

# Test get quote
curl http://localhost:3000/api/quote/YOUR_QUOTE_ID
```

---

## Production Checklist

Before deploying to production:

- [ ] Set DATABASE_URL to PostgreSQL
- [ ] Configure S3 or cloud storage
- [ ] Set strong JWT_SECRET
- [ ] Set strong ADMIN_API_KEY
- [ ] Configure email service (Resend API key)
- [ ] Run database migrations
- [ ] Seed material data
- [ ] Test complete flow end-to-end
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CORS if needed
- [ ] Set up SSL/HTTPS
- [ ] Configure CDN for file storage
- [ ] Set up automated cleanup cron job
- [ ] Test error boundaries
- [ ] Load test API endpoints
- [ ] Set up database backups

---

## Troubleshooting

### Issue: File Upload Fails

**Symptoms:** Upload returns 500 error

**Solutions:**
- Check uploads directory exists and is writable
- Verify MAX_FILE_SIZE_MB environment variable
- Check STL file is valid format
- Review server logs for parsing errors

### Issue: Email Not Received

**Symptoms:** Verification code doesn't arrive

**Solutions:**
- Check email service API key is set
- Verify EMAIL_FROM is configured
- Check spam/junk folder
- Review email service logs
- Ensure SMTP settings are correct

### Issue: Session Token Invalid

**Symptoms:** Quote calculation returns 401

**Solutions:**
- Check JWT_SECRET matches
- Verify token hasn't expired (24 hours)
- Check UserSession.isActive is true
- Ensure token is sent in correct header

### Issue: Quote Calculation Fails

**Symptoms:** Returns 404 or 400 error

**Solutions:**
- Verify fileId exists in FileUpload table
- Check file exists in storage
- Ensure all required parameters provided
- Review pricing configuration

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Next.js Frontend                │
│  ┌────────────────────────────────┐    │
│  │ Quote Flow Page (/quote)       │    │
│  │  - FileUploadZone              │    │
│  │  - ModelPreview (Three.js)     │    │
│  │  - EmailVerification           │    │
│  │  - QuoteDisplay                │    │
│  │  - ErrorBoundary (wraps all)   │    │
│  └────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Next.js API Routes              │
│  - POST /api/upload                     │
│  - POST /api/verify-email               │
│  - POST /api/confirm-code               │
│  - POST /api/calculate-quote            │
│  - GET  /api/quote/:id                  │
│  - POST /api/admin/cleanup              │
└──────┬──────────────────────────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌─────────────┐
│  Database   │ │  Storage │ │    Email    │
│  (Prisma)   │ │ (Local/S3)│ │   Service   │
│             │ │           │ │  (Resend)   │
│ - Quotes    │ │ - STL     │ │             │
│ - Files     │ │   Files   │ │ - Codes     │
│ - Sessions  │ │           │ │ - Welcome   │
│ - Users     │ │           │ │             │
└─────────────┘ └──────────┘ └─────────────┘
```

---

## Summary

The complete user journey involves:
1. ✅ File upload with STL parsing and deduplication
2. ✅ 3D model preview with Three.js
3. ✅ Email verification with JWT session tokens
4. ✅ Quote calculation with detailed pricing
5. ✅ Database persistence for all data
6. ✅ Error boundaries for graceful error handling
7. ✅ Comprehensive API error responses
8. ✅ Rate limiting and security measures

All components are fully integrated and production-ready!
