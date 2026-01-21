/**
 * File Storage Configuration and Utilities
 * Supports local filesystem and cloud storage (S3, GCS, etc.)
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs';
  basePath?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileHash: string;
  mimeType: string;
  storageType: string;
}

// Storage configuration from environment
// Use /tmp for serverless environments (Netlify, Vercel), public/uploads for local dev
const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const defaultBasePath = isServerless
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'public', 'uploads');

export const STORAGE_CONFIG: StorageConfig = {
  type: (process.env.STORAGE_TYPE as 'local' | 's3' | 'gcs') || 'local',
  basePath: process.env.STORAGE_BASE_PATH || defaultBasePath,
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION || 'us-east-1',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  endpoint: process.env.STORAGE_ENDPOINT,
};

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `file_${timestamp}_${randomBytes}`;
}

/**
 * Calculate file hash (SHA256)
 */
export async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Get storage path for a file
 */
export function getStoragePath(fileId: string, fileName: string): string {
  const ext = path.extname(fileName);
  return `${fileId}${ext}`;
}

/**
 * Local filesystem storage operations
 */
export class LocalStorage {
  private basePath: string;

  constructor(basePath: string = STORAGE_CONFIG.basePath || 'uploads') {
    this.basePath = basePath;
  }

  /**
   * Ensure storage directory exists
   */
  async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }

  /**
   * Save file to local storage
   */
  async saveFile(fileId: string, fileName: string, buffer: Buffer): Promise<string> {
    await this.ensureDirectory();
    const storagePath = getStoragePath(fileId, fileName);
    const fullPath = path.join(this.basePath, storagePath);
    await fs.writeFile(fullPath, buffer);
    return storagePath;
  }

  /**
   * Read file from local storage
   */
  async readFile(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, storagePath);
    return await fs.readFile(fullPath);
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(storagePath: string): Promise<{ size: number; createdAt: Date }> {
    const fullPath = path.join(this.basePath, storagePath);
    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
    };
  }

  /**
   * List all files in storage
   */
  async listFiles(): Promise<string[]> {
    await this.ensureDirectory();
    return await fs.readdir(this.basePath);
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAgeInDays: number = 30): Promise<number> {
    const files = await this.listFiles();
    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      try {
        const stats = await this.getFileStats(file);
        const age = now - stats.createdAt.getTime();

        if (age > maxAge) {
          await this.deleteFile(file);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    return deletedCount;
  }
}

/**
 * Get storage instance based on configuration
 */
export async function getStorage(): Promise<LocalStorage | any> {
  if (STORAGE_CONFIG.type === 's3') {
    // Dynamically import S3Storage only when needed
    const { S3Storage } = await import('./s3-storage');
    return new S3Storage(STORAGE_CONFIG);
  }
  return new LocalStorage(STORAGE_CONFIG.basePath);
}

/**
 * Save file with metadata
 */
export async function saveFileWithMetadata(
  fileName: string,
  buffer: Buffer,
  uploadedBy?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<FileMetadata> {
  const fileId = generateFileId();
  const fileHash = await calculateFileHash(buffer);
  const fileSize = buffer.length;
  const storage = await getStorage();

  const filePath = await storage.saveFile(fileId, fileName, buffer);

  return {
    fileId,
    fileName,
    filePath,
    fileSize,
    fileHash,
    mimeType: 'application/sla',
    storageType: STORAGE_CONFIG.type,
  };
}

/**
 * Delete file by ID
 */
export async function deleteFileById(fileId: string, fileName: string): Promise<void> {
  const storage = await getStorage();
  const storagePath = getStoragePath(fileId, fileName);
  await storage.deleteFile(storagePath);
}
