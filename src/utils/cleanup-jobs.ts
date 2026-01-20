/**
 * Cleanup Jobs for Database and File Storage
 * Run these periodically via cron or scheduled tasks
 */

import { prisma } from '@/lib/prisma';
import { getStorage } from './file-storage';

export interface CleanupStats {
  expiredCodes: number;
  expiredSessions: number;
  expiredQuotes: number;
  oldFiles: number;
  orphanedFiles: number;
  totalRecordsDeleted: number;
  totalFilesDeleted: number;
}

/**
 * Clean up expired verification codes
 * Removes codes that expired more than 1 hour ago
 */
export async function cleanupExpiredVerificationCodes(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await prisma.emailVerification.deleteMany({
    where: {
      expiresAt: {
        lt: oneHourAgo,
      },
    },
  });

  console.log(`Cleaned up ${result.count} expired verification codes`);
  return result.count;
}

/**
 * Clean up old verification attempts
 * Removes attempts older than 7 days
 */
export async function cleanupOldVerificationAttempts(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.verificationAttempt.deleteMany({
    where: {
      createdAt: {
        lt: sevenDaysAgo,
      },
    },
  });

  console.log(`Cleaned up ${result.count} old verification attempts`);
  return result.count;
}

/**
 * Clean up expired sessions
 * Removes sessions that expired more than 24 hours ago
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.userSession.deleteMany({
    where: {
      expiresAt: {
        lt: oneDayAgo,
      },
    },
  });

  console.log(`Cleaned up ${result.count} expired sessions`);
  return result.count;
}

/**
 * Clean up expired quotes
 * Removes quotes that expired more than 30 days ago
 */
export async function cleanupExpiredQuotes(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.quote.deleteMany({
    where: {
      validUntil: {
        lt: thirtyDaysAgo,
      },
      status: {
        in: ['pending', 'rejected'],
      },
    },
  });

  console.log(`Cleaned up ${result.count} expired quotes`);
  return result.count;
}

/**
 * Clean up old uploaded files
 * Removes file records older than specified days
 */
export async function cleanupOldFileRecords(maxAgeInDays: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000);

  // Find old file records
  const oldFiles = await prisma.fileUpload.findMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      markedForDeletion: false,
    },
  });

  // Mark them for deletion first
  await prisma.fileUpload.updateMany({
    where: {
      id: {
        in: oldFiles.map((f) => f.id),
      },
    },
    data: {
      markedForDeletion: true,
    },
  });

  console.log(`Marked ${oldFiles.length} old file records for deletion`);
  return oldFiles.length;
}

/**
 * Delete files marked for deletion
 */
export async function deleteMarkedFiles(): Promise<number> {
  const markedFiles = await prisma.fileUpload.findMany({
    where: {
      markedForDeletion: true,
    },
  });

  const storage = await getStorage();
  let deletedCount = 0;

  for (const file of markedFiles) {
    try {
      // Delete from storage
      await storage.deleteFile(file.filePath);

      // Delete from database
      await prisma.fileUpload.update({
        where: { id: file.id },
        data: {
          deletedAt: new Date(),
        },
      });

      deletedCount++;
    } catch (error) {
      console.error(`Error deleting file ${file.fileId}:`, error);
    }
  }

  console.log(`Deleted ${deletedCount} marked files`);
  return deletedCount;
}

/**
 * Find and clean up orphaned files
 * Files that exist in storage but have no database record
 */
export async function cleanupOrphanedFiles(): Promise<number> {
  const storage = await getStorage();

  // Only works with local storage
  if (!(storage instanceof (await import('./file-storage')).LocalStorage)) {
    console.log('Orphaned file cleanup only supported for local storage');
    return 0;
  }

  const localStorage = storage as any;
  const files = await localStorage.listFiles();
  let deletedCount = 0;

  for (const fileName of files) {
    // Extract fileId from filename (format: file_timestamp_hash.ext)
    const match = fileName.match(/^(file_\d+_[a-f0-9]+)/);
    if (!match) continue;

    const fileId = match[1];

    // Check if file exists in database
    const dbFile = await prisma.fileUpload.findUnique({
      where: { fileId },
    });

    if (!dbFile) {
      // Orphaned file - delete it
      try {
        await localStorage.deleteFile(fileName);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting orphaned file ${fileName}:`, error);
      }
    }
  }

  console.log(`Cleaned up ${deletedCount} orphaned files`);
  return deletedCount;
}

/**
 * Update last accessed time for files
 */
export async function updateFileAccessTime(fileId: string): Promise<void> {
  await prisma.fileUpload.update({
    where: { fileId },
    data: {
      lastAccessedAt: new Date(),
    },
  });
}

/**
 * Run all cleanup jobs
 */
export async function runAllCleanupJobs(): Promise<CleanupStats> {
  console.log('Starting cleanup jobs...');

  const stats: CleanupStats = {
    expiredCodes: 0,
    expiredSessions: 0,
    expiredQuotes: 0,
    oldFiles: 0,
    orphanedFiles: 0,
    totalRecordsDeleted: 0,
    totalFilesDeleted: 0,
  };

  try {
    // Clean up expired verification codes
    stats.expiredCodes = await cleanupExpiredVerificationCodes();

    // Clean up old verification attempts
    const oldAttempts = await cleanupOldVerificationAttempts();

    // Clean up expired sessions
    stats.expiredSessions = await cleanupExpiredSessions();

    // Clean up expired quotes
    stats.expiredQuotes = await cleanupExpiredQuotes();

    // Mark old files for deletion
    stats.oldFiles = await cleanupOldFileRecords(30);

    // Delete marked files
    stats.totalFilesDeleted = await deleteMarkedFiles();

    // Clean up orphaned files
    stats.orphanedFiles = await cleanupOrphanedFiles();

    stats.totalRecordsDeleted =
      stats.expiredCodes +
      oldAttempts +
      stats.expiredSessions +
      stats.expiredQuotes +
      stats.oldFiles;

    console.log('Cleanup jobs completed:', stats);
  } catch (error) {
    console.error('Error running cleanup jobs:', error);
    throw error;
  }

  return stats;
}

/**
 * Get cleanup statistics without performing cleanup
 */
export async function getCleanupStats(): Promise<{
  expiredCodes: number;
  expiredSessions: number;
  expiredQuotes: number;
  oldFiles: number;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [expiredCodes, expiredSessions, expiredQuotes, oldFiles] = await Promise.all([
    prisma.emailVerification.count({
      where: { expiresAt: { lt: oneHourAgo } },
    }),
    prisma.userSession.count({
      where: { expiresAt: { lt: oneDayAgo } },
    }),
    prisma.quote.count({
      where: {
        validUntil: { lt: thirtyDaysAgo },
        status: { in: ['pending', 'rejected'] },
      },
    }),
    prisma.fileUpload.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        markedForDeletion: false,
      },
    }),
  ]);

  return {
    expiredCodes,
    expiredSessions,
    expiredQuotes,
    oldFiles,
  };
}
