# Email Verification System

Comprehensive email verification flow with 6-digit codes, rate limiting, session tokens, and mailing list integration.

## Features

- ✅ 6-digit verification codes
- ✅ 15-minute code expiry
- ✅ Rate limiting (max 3 attempts per hour)
- ✅ JWT session tokens (24-hour expiry)
- ✅ Automatic mailing list subscription
- ✅ Welcome emails
- ✅ Multiple email service support (Resend, SendGrid, SMTP)
- ✅ IP address and user agent tracking
- ✅ Automatic cleanup of expired data

## Flow Diagram

```
1. User enters email
   ↓
2. POST /api/auth/send-code
   ↓
3. System generates 6-digit code
   ↓
4. Code saved to database (expires in 15 min)
   ↓
5. Email sent to user
   ↓
6. User receives code
   ↓
7. POST /api/auth/verify-code with code
   ↓
8. Code validated
   ↓
9. User added to mailing list
   ↓
10. Session token (JWT) returned
   ↓
11. Welcome email sent (async)
```

## API Endpoints

### 1. Send Verification Code

**Endpoint**: `POST /api/auth/send-code`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresAt": "2026-01-17T12:30:00.000Z",
  "attemptsRemaining": 2
}
```

**Response** (Rate Limited):
```json
{
  "success": false,
  "message": "Too many verification attempts. Please try again later.",
  "attemptsRemaining": 0,
  "resetAt": "2026-01-17T13:00:00.000Z"
}
```

**Rate Limit**: 3 requests per email per hour

### 2. Verify Code

**Endpoint**: `POST /api/auth/verify-code`

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Email verified successfully",
  "session": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-01-18T12:15:00.000Z"
  },
  "user": {
    "email": "user@example.com"
  }
}
```

**Response** (Invalid Code):
```json
{
  "success": false,
  "message": "Invalid or expired verification code",
  "attemptsRemaining": 2
}
```

### 3. Validate Session

**Endpoint**: `POST /api/auth/validate-session` or `GET /api/auth/validate-session`

**Request** (POST):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request** (GET):
```
Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (Valid):
```json
{
  "success": true,
  "valid": true,
  "message": "Session is valid",
  "user": {
    "email": "user@example.com"
  },
  "session": {
    "expiresAt": "2026-01-18T12:15:00.000Z",
    "lastActivity": "2026-01-17T14:30:00.000Z"
  }
}
```

**Response** (Invalid):
```json
{
  "success": false,
  "valid": false,
  "message": "Invalid or expired session"
}
```

### 4. Logout

**Endpoint**: `POST /api/auth/logout`

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Or via Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Database Schema

### EmailVerification
Stores verification codes with expiry.

```prisma
model EmailVerification {
  id          String   @id @default(cuid())
  email       String
  code        String   // 6-digit code
  expiresAt   DateTime // Expires in 15 minutes
  verified    Boolean  @default(false)
  verifiedAt  DateTime?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### VerificationAttempt
Tracks attempts for rate limiting.

```prisma
model VerificationAttempt {
  id          String   @id @default(cuid())
  email       String
  ipAddress   String?
  successful  Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### UserSession
Stores active sessions.

```prisma
model UserSession {
  id          String   @id @default(cuid())
  email       String
  token       String   @unique
  expiresAt   DateTime
  isActive    Boolean  @default(true)
  ipAddress   String?
  userAgent   String?
  lastActivity DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### MailingListSubscriber
Manages email subscriptions.

```prisma
model MailingListSubscriber {
  id            String   @id @default(cuid())
  email         String   @unique
  isSubscribed  Boolean  @default(true)
  source        String?  // e.g., 'email_verification'
  tags          Json?    // e.g., ['verified_user']
  subscribedAt  DateTime @default(now())
  unsubscribedAt DateTime?
  lastEmailSent DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Configuration

### Environment Variables

```bash
# JWT Secret (required)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Email Service (choose one)
# Option 1: Resend (recommended)
RESEND_API_KEY="re_xxxxxxxxxx"

# Option 2: SendGrid
SENDGRID_API_KEY="SG.xxxxxxxxxx"

# Option 3: SMTP (fallback)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Email Settings
EMAIL_FROM="noreply@3dpquote.com"
EMAIL_FROM_NAME="3D Print Quote"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Constants

```typescript
const VERIFICATION_CONFIG = {
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 15,
  MAX_ATTEMPTS_PER_HOUR: 3,
  SESSION_EXPIRY_HOURS: 24,
  JWT_SECRET: process.env.JWT_SECRET,
};
```

## Email Services

### Resend (Recommended)

```bash
# Sign up at https://resend.com
# Get your API key
RESEND_API_KEY="re_xxxxxxxxxx"
```

**Pros**:
- Modern API
- Great developer experience
- Excellent deliverability
- Free tier: 3,000 emails/month
- Built-in email templates

**Setup**:
1. Sign up at https://resend.com
2. Verify your domain
3. Get API key from dashboard
4. Add to `.env`

### SendGrid

```bash
# Sign up at https://sendgrid.com
# Get your API key
SENDGRID_API_KEY="SG.xxxxxxxxxx"
```

**Pros**:
- Mature service
- Extensive features
- Good analytics
- Free tier: 100 emails/day

**Setup**:
1. Sign up at https://sendgrid.com
2. Create API key
3. Verify sender identity
4. Add to `.env`

### SMTP (Fallback)

Works with Gmail, Outlook, or any SMTP server.

**Gmail Setup**:
1. Enable 2FA
2. Generate App Password
3. Use in `EMAIL_PASSWORD`

## Rate Limiting

Prevents abuse by limiting verification attempts.

**Rules**:
- Maximum 3 attempts per email per hour
- Applies to both sending and verifying codes
- Tracked by email and IP address
- Automatic reset after 1 hour

**Implementation**:
```typescript
const rateLimit = await checkRateLimit(email, ipAddress);

if (!rateLimit.allowed) {
  return { error: 'Too many attempts', resetAt: rateLimit.resetAt };
}
```

## Session Management

### Token Generation

```typescript
const token = generateSessionToken(email, 24); // 24 hours
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Validation

```typescript
const result = verifySessionToken(token);
if (result.valid) {
  console.log(`User: ${result.email}`);
}
```

### Session Storage

Tokens are stored in database for tracking:
- Active/inactive status
- Last activity timestamp
- IP address and user agent
- Expiry date

### Token Invalidation

```typescript
await invalidateSession(token);
// Marks session as inactive in database
```

## Mailing List Integration

Users are automatically subscribed upon email verification.

### Features

- **Auto-subscribe**: On successful verification
- **Source tracking**: Tracks where they subscribed from
- **Tagging**: Flexible tag system for segmentation
- **Unsubscribe**: Easy unsubscribe mechanism
- **Stats**: Get subscriber statistics

### Usage

```typescript
// Subscribe user
await subscribeToMailingList(email, {
  source: 'email_verification',
  tags: ['verified_user'],
});

// Add tags
await addSubscriberTags(email, ['quote_request', 'pla_material']);

// Check if subscribed
const isUserSubscribed = await isSubscribed(email);

// Get statistics
const stats = await getSubscriberStats();
// {
//   totalSubscribers: 1234,
//   activeSubscribers: 1100,
//   unsubscribed: 134,
//   recentSubscribers: 50
// }
```

## Security Considerations

### Code Generation

- Uses `crypto.randomBytes()` for cryptographic randomness
- 6-digit codes provide 1,000,000 combinations
- Combined with 15-minute expiry and rate limiting

### Rate Limiting

- Prevents brute force attacks
- 3 attempts per hour = very low success probability
- IP-based tracking for additional protection

### Session Tokens

- JWT with HS256 signing
- 24-hour expiry
- Stored in database for revocation
- Updated on each validation

### IP and User Agent Tracking

- Logs IP address for each attempt
- Tracks user agent string
- Useful for fraud detection and analytics

## Cleanup

Automatic cleanup of expired data to maintain database performance.

### Functions

```typescript
// Clean up expired verification codes
await cleanupExpiredVerifications();

// Clean up expired sessions
await cleanupExpiredSessions();

// Clean up old attempts (>24 hours)
await cleanupOldAttempts();
```

### Recommended Schedule

Run cleanup daily via cron job:

```typescript
// Example: Daily cleanup at 2 AM
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  const codes = await cleanupExpiredVerifications();
  const sessions = await cleanupExpiredSessions();
  const attempts = await cleanupOldAttempts();

  console.log(`Cleaned up: ${codes} codes, ${sessions} sessions, ${attempts} attempts`);
});
```

## Frontend Integration

### Step 1: Send Code

```typescript
async function sendCode(email: string) {
  const response = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (data.success) {
    console.log('Code sent! Expires at:', data.expiresAt);
  } else {
    console.error('Error:', data.message);
  }
}
```

### Step 2: Verify Code

```typescript
async function verifyCode(email: string, code: string) {
  const response = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const data = await response.json();

  if (data.success) {
    // Save token to localStorage or cookies
    localStorage.setItem('authToken', data.session.token);
    console.log('Verified! User:', data.user.email);
  } else {
    console.error('Invalid code:', data.message);
  }
}
```

### Step 3: Use Session

```typescript
async function makeAuthenticatedRequest(url: string) {
  const token = localStorage.getItem('authToken');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}
```

## Testing

Comprehensive test suite included.

```bash
# Run verification tests
npm test -- verification.test.ts

# Run with coverage
npm run test:coverage -- verification.test.ts
```

**Test Coverage**:
- Code generation (random and secure)
- Code creation and verification
- Rate limiting (allow/block)
- Session token generation and validation
- Session management (create/validate/invalidate)
- Cleanup functions
- Configuration validation

## Common Issues

### Email Not Received

1. **Check spam folder**
2. **Verify email service configuration**
3. **Check server logs for errors**
4. **Verify domain/sender identity** (Resend/SendGrid)

### Rate Limit Errors

- Wait for reset time (shown in error response)
- Check for multiple requests from same IP
- Review rate limiting configuration

### Invalid Token Errors

- Token may be expired (24 hours)
- Token may have been invalidated (logout)
- Check JWT secret is correct
- Verify token is being sent correctly

## Best Practices

1. **Use HTTPS** in production for secure token transmission
2. **Rotate JWT secret** periodically
3. **Monitor rate limits** for suspicious activity
4. **Clean up expired data** regularly
5. **Log verification attempts** for security audits
6. **Use environment variables** for all secrets
7. **Implement CSRF protection** for state-changing operations
8. **Add email verification** before sensitive operations

## Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Configure email service (Resend/SendGrid)
- [ ] Set up domain verification for email service
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up cron job for cleanup
- [ ] Monitor email deliverability
- [ ] Test verification flow end-to-end
- [ ] Set up error alerting
- [ ] Review security logs

## Support

For questions or issues:
1. Check this documentation
2. Review test examples
3. Check server logs
4. Open an issue on GitHub
