'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { STLData } from '@/types';

interface FileUploadZoneProps {
  onUploadComplete: (data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    stlData: STLData;
  }) => void;
  onError?: (error: string) => void;
}

export default function FileUploadZone({ onUploadComplete, onError }: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{
    fileName: string;
    fileSize: number;
    stlData: STLData;
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      onError?.('Please select a valid STL file');
      return;
    }

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.stl')) {
      onError?.('Only STL files are supported');
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      onError?.('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      setUploadedFile({
        fileName: result.data.fileName,
        fileSize: result.data.fileSize,
        stlData: result.data.stlData,
      });

      onUploadComplete(result.data);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [onUploadComplete, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/sla': ['.stl'],
      'model/stl': ['.stl'],
      'model/x.stl-ascii': ['.stl'],
      'model/x.stl-binary': ['.stl'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          md:p-12
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Icon */}
          <svg
            className={`w-16 h-16 ${isDragActive ? 'text-blue-500' : 'text-gray-400'} transition-colors`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {/* Text */}
          <div>
            <p className="text-lg font-semibold text-gray-700">
              {isDragActive ? 'Drop your STL file here' : 'Drag & drop your STL file'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Maximum file size: 50MB
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Uploading and analyzing... {uploadProgress}%
          </p>
        </div>
      )}

      {/* File Info */}
      {uploadedFile && !isUploading && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 truncate">
                {uploadedFile.fileName}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {formatFileSize(uploadedFile.fileSize)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                <div>
                  <span className="text-green-700 font-medium">Volume:</span>
                  <span className="text-green-600 ml-1">
                    {uploadedFile.stlData.volume.toFixed(2)} cm³
                  </span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Surface:</span>
                  <span className="text-green-600 ml-1">
                    {uploadedFile.stlData.surfaceArea.toFixed(2)} cm²
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-green-700 font-medium">Print Time:</span>
                  <span className="text-green-600 ml-1">
                    ~{uploadedFile.stlData.estimatedPrintTime.toFixed(1)} hrs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
