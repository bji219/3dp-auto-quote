# Database Setup and File Storage Guide

This document provides comprehensive information about the database schema, file storage configuration, migrations, and cleanup jobs.

## Database Schema

### Core Models

#### Quote
Stores all quote requests with pricing and file information.

**Fields:**
- `id` - Unique identifier (cuid)
- `email` - Customer email address
- `emailVerified` - Whether email was verified
- `fileId` - Reference to uploaded file
- `fileName`, `filePath`, `fileSize`, `fileHash` - File metadata
- `volume`, `surfaceArea`, `boundingBox` - STL analysis metrics
- `material`, `quality`, `infillPercentage`, `rushOrder` - Pricing options
- `baseCost`, `materialCost`, `laborCost`, `totalCost` - Cost breakdown
- `status` - Quote status (pending, verified, accepted, rejected, completed)
- `validUntil` - Quote expiration date (7 days from creation)
- `ipAddress`, `userAgent` - Request metadata
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `email` - Fast lookup by customer email
- `status` - Query quotes by status
- `createdAt` - Sort by creation date
- `fileId` - Link to uploaded files

#### FileUpload
Tracks all uploaded STL files with metadata and storage information.

**Fields:**
- `id` - Unique identifier (cuid)
- `fileId` - Custom file identifier (file_timestamp_hash)
- `fileName` - Original filename
- `filePath` - Storage path (local or cloud)
- `fileSize` - Size in bytes
- `fileHash` - SHA256 hash for deduplication
- `mimeType` - File MIME type
- `storageType` - Storage backend (local, s3, gcs)
- `volume`, `surfaceArea`, `boundingBox` - Cached STL metrics
- `uploadedBy`, `ipAddress`, `userAgent` - Upload metadata
- `lastAccessedAt` - Last time file was accessed
- `markedForDeletion` - Whether file is scheduled for cleanup
- `deletedAt` - When file was deleted
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `fileId` - Fast lookup by file ID
- `fileHash` - Deduplication checks
- `uploadedBy` - Find user's files
- `createdAt` - Sort by upload date
- `lastAccessedAt` - Cleanup old files
- `markedForDeletion` - Find files to delete

#### EmailVerification
Stores email verification codes and their status.

**Fields:**
- `id` - Unique identifier
- `email` - Email address to verify
- `code` - 6-digit verification code
- `expiresAt` - Code expiration time (15 minutes)
- `verified` - Whether code was verified
- `verifiedAt` - When code was verified
- `ipAddress`, `userAgent` - Request metadata
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `email` - Lookup by email
- `code` - Verify code quickly
- `expiresAt` - Cleanup expired codes

#### VerificationAttempt
Tracks verification attempts for rate limiting.

**Fields:**
- `id` - Unique identifier
- `email` - Email address
- `ipAddress` - Request IP address
- `successful` - Whether attempt succeeded
- `createdAt` - Attempt timestamp

**Indexes:**
- `[email, createdAt]` - Rate limiting by email
- `[ipAddress, createdAt]` - Rate limiting by IP

#### UserSession
Manages JWT session tokens.

**Fields:**
- `id` - Unique identifier
- `email` - User email
- `token` - JWT token (unique)
- `expiresAt` - Session expiration (24 hours)
- `isActive` - Whether session is active
- `ipAddress`, `userAgent` - Session metadata
- `lastActivity` - Last activity timestamp
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `email` - Find user sessions
- `token` - Validate tokens quickly
- `expiresAt` - Cleanup expired sessions

#### Material
Stores available 3D printing materials.

**Fields:**
- `name` - Material name (PLA, ABS, etc.)
- `costPerCm3` - Cost per cubic centimeter
- `density` - Material density (g/cm³)
- `color` - Available colors
- `available` - Whether material is currently available
- `description` - Material description

#### PricingRule
Configurable pricing rules (discounts, multipliers, etc.).

**Fields:**
- `name` - Rule name
- `ruleType` - Type (volume_discount, rush_multiplier, etc.)
- `parameters` - JSON configuration
- `active` - Whether rule is active

#### MailingListSubscriber
Tracks newsletter subscribers.

**Fields:**
- `email` - Subscriber email (unique)
- `isSubscribed` - Subscription status
- `source` - Subscription source
- `tags` - Segmentation tags (JSON)
- `subscribedAt`, `unsubscribedAt`, `lastEmailSent` - Timestamps

## File Storage

### Configuration

The system supports multiple storage backends:

1. **Local Filesystem** (default for development)
2. **AWS S3** (recommended for production)
3. **S3-compatible** (MinIO, DigitalOcean Spaces, etc.)
4. **Google Cloud Storage** (GCS)

### Environment Variables

```env
# Local Storage
STORAGE_TYPE="local"
STORAGE_BASE_PATH="./public/uploads"

# AWS S3
STORAGE_TYPE="s3"
STORAGE_BUCKET="my-bucket"
STORAGE_REGION="us-east-1"
STORAGE_ACCESS_KEY_ID="AKIAXXXXXXXX"
STORAGE_SECRET_ACCESS_KEY="xxxxxxxx"

# S3-compatible (e.g., MinIO)
STORAGE_TYPE="s3"
STORAGE_BUCKET="my-bucket"
STORAGE_ENDPOINT="https://minio.example.com"
STORAGE_ACCESS_KEY_ID="minioadmin"
STORAGE_SECRET_ACCESS_KEY="minioadmin"
```

### File Organization

Files are stored with a unique identifier:
```
file_{timestamp}_{random_hash}.stl
```

Example: `file_1704067200000_a1b2c3d4e5f6g7h8.stl`

### Deduplication

Files are deduplicated using SHA256 hashes. If the same file is uploaded twice, the system can detect and reuse the existing file.

## Database Migrations

### Running Migrations

**Development:**
```bash
npm run db:migrate        # Create and apply migration
npm run db:push          # Push schema without migration
```

**Production:**
```bash
npm run db:migrate:prod  # Apply pending migrations
```

### Creating Migrations

1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Name your migration descriptively

**Example:**
```bash
$ npm run db:migrate
✔ Enter a name for the new migration: › add_file_upload_model
```

### Reset Database (Development Only)

```bash
npm run db:reset  # Drops database, runs migrations, runs seed
```

## Seed Data

The system includes seed data for:
- 7 materials (PLA, ABS, PETG, TPU, Nylon, Carbon Fiber, Resin)
- Pricing rules (volume discounts, quality multipliers)

**Run seeding:**
```bash
npm run db:seed
```

## Cleanup Jobs

Automated cleanup jobs remove old data and files to prevent storage bloat.

### What Gets Cleaned Up

1. **Expired Verification Codes** - Codes older than 1 hour
2. **Old Verification Attempts** - Attempts older than 7 days
3. **Expired Sessions** - Sessions expired >24 hours ago
4. **Expired Quotes** - Pending/rejected quotes >30 days old
5. **Old Files** - Uploaded files >30 days old
6. **Orphaned Files** - Files without database records

### Running Cleanup

**Manual (via CLI):**
```bash
npm run cleanup
```

**Manual (via API):**
```bash
# Get cleanup statistics
curl -H "X-Admin-Key: your-admin-key" \
  http://localhost:3000/api/admin/cleanup

# Run cleanup
curl -X POST \
  -H "X-Admin-Key: your-admin-key" \
  http://localhost:3000/api/admin/cleanup
```

**Automated (via Cron):**
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/project && npm run cleanup >> /var/log/cleanup.log 2>&1
```

**Automated (via Vercel Cron):**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/admin/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

### Cleanup Configuration

```env
CLEANUP_MAX_FILE_AGE_DAYS=30  # Delete files older than 30 days
CLEANUP_ENABLED=true          # Enable/disable cleanup
ADMIN_API_KEY="secret"        # Protect cleanup endpoint
```

## Database Maintenance

### Backing Up Data

**SQLite (Development):**
```bash
# Copy database file
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db

# Or use SQLite backup
sqlite3 prisma/dev.db ".backup 'backup.db'"
```

**PostgreSQL (Production):**
```bash
# Dump database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### Monitoring Database Size

```bash
# SQLite
du -h prisma/dev.db

# PostgreSQL
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('dbname'));"
```

### Vacuum Database (SQLite)

```bash
sqlite3 prisma/dev.db "VACUUM;"
```

## Production Checklist

- [ ] Set `DATABASE_URL` to PostgreSQL connection string
- [ ] Configure S3 or cloud storage for files
- [ ] Set strong `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set strong `ADMIN_API_KEY` (use: `openssl rand -base64 32`)
- [ ] Run `npm run db:migrate:prod` to apply migrations
- [ ] Run `npm run db:seed` to populate materials
- [ ] Set up cron job for daily cleanup
- [ ] Configure database backups
- [ ] Set up monitoring and alerting
- [ ] Enable SSL for database connections
- [ ] Configure file storage CDN (optional)

## Troubleshooting

### Migration Issues

**"Migration failed"**
- Check database connection
- Ensure no conflicting schema changes
- Try `npm run db:push` for development

**"Database is locked"**
- Close Prisma Studio
- Check for running processes
- Restart database connection

### File Storage Issues

**"Cannot save file"**
- Check storage permissions
- Verify storage credentials
- Ensure directory exists (local)
- Check bucket permissions (S3)

**"File not found"**
- Check `filePath` in database
- Verify file exists in storage
- Check storage configuration

### Cleanup Issues

**"Cleanup job failed"**
- Check database connection
- Verify file storage access
- Review cleanup logs
- Check disk space

## Performance Optimization

### Database Indexes

All critical queries are indexed:
- Email lookups (quotes, sessions, verifications)
- Status queries (quotes by status)
- Date-based queries (cleanup, expiration)
- File lookups (fileId, hash)

### Query Optimization

```typescript
// Good: Use indexes
await prisma.quote.findMany({
  where: { email, status: 'pending' }
});

// Bad: No index
await prisma.quote.findMany({
  where: { totalCost: { gt: 100 } }
});
```

### Connection Pooling (Production)

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

## API Reference

### Cleanup Endpoint

**GET /api/admin/cleanup**
Get cleanup statistics without performing cleanup.

**POST /api/admin/cleanup**
Run all cleanup jobs and return results.

**Authentication:**
```http
X-Admin-Key: your-admin-api-key
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "expiredCodes": 15,
    "expiredSessions": 8,
    "expiredQuotes": 42,
    "oldFiles": 103,
    "orphanedFiles": 5,
    "totalRecordsDeleted": 65,
    "totalFilesDeleted": 108
  }
}
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/performance-tips.html)
