'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { STLData, UploadResponse } from '@/types';

interface FileUploadProps {
  onUploadSuccess: (data: {
    fileName: string;
    fileSize: number;
    fileHash: string;
    stlData: STLData;
  }) => void;
  onUploadError?: (error: string) => void;
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setUploadProgress('Uploading file...');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data: UploadResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message);
        }

        if (data.data) {
          setUploadProgress('File parsed successfully!');
          onUploadSuccess(data.data);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadProgress('');
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/sla': ['.stl'],
      'application/vnd.ms-pki.stl': ['.stl'],
      'model/stl': ['.stl'],
      'model/x.stl-ascii': ['.stl'],
      'model/x.stl-binary': ['.stl'],
      'application/octet-stream': ['.stl'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
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
          </div>

          {uploading ? (
            <div>
              <p className="text-lg font-medium text-gray-700">Processing...</p>
              <p className="text-sm text-gray-500 mt-2">{uploadProgress}</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Drop your STL file here' : 'Drag & drop your STL file here'}
              </p>
              <p className="text-sm text-gray-500 mt-2">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Maximum file size: 50MB</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
