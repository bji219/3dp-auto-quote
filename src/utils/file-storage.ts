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
export const STORAGE_CONFIG: StorageConfig = {
  type: (process.env.STORAGE_TYPE as 'local' | 's3' | 'gcs') || 'local',
  basePath: process.env.STORAGE_BASE_PATH || path.join(process.cwd(), 'public', 'uploads'),
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
 * S3-compatible storage operations (AWS S3, MinIO, etc.)
 * Note: Requires @aws-sdk/client-s3 to be installed
 */
export class S3Storage {
  private bucket: string;
  private region: string;
  private client: any; // S3Client from @aws-sdk/client-s3

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || '';
    this.region = config.region || 'us-east-1';

    // Lazy load AWS SDK only when needed
    // This prevents errors when S3 is not configured
    if (config.type === 's3') {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.client = new S3Client({
          region: this.region,
          credentials: config.accessKeyId
            ? {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey || '',
              }
            : undefined,
          endpoint: config.endpoint,
        });
      } catch (error) {
        console.warn('AWS SDK not available. Install @aws-sdk/client-s3 for S3 storage.');
      }
    }
  }

  /**
   * Save file to S3
   */
  async saveFile(fileId: string, fileName: string, buffer: Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const storagePath = getStoragePath(fileId, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      Body: buffer,
      ContentType: 'application/sla',
    });

    await this.client.send(command);
    return storagePath;
  }

  /**
   * Read file from S3
   */
  async readFile(storagePath: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    const response = await this.client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(storagePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    await this.client.send(command);
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(storagePath: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get storage instance based on configuration
 */
export function getStorage(): LocalStorage | S3Storage {
  if (STORAGE_CONFIG.type === 's3') {
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
  const storage = getStorage();

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
  const storage = getStorage();
  const storagePath = getStoragePath(fileId, fileName);
  await storage.deleteFile(storagePath);
}
