'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import EmailEntry from '@/components/EmailEntry';
import QuoteDisplay from '@/components/QuoteDisplay';
import PrintOptions, { PrintOptionsData } from '@/components/PrintOptions';
import { QuoteResponse, STLData } from '@/types';

type Step = 'upload' | 'options' | 'email' | 'quote';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadData, setUploadData] = useState<{
    fileName: string;
    fileSize: number;
    fileHash: string;
    stlData: STLData;
  } | null>(null);
  const [printOptions, setPrintOptions] = useState<PrintOptionsData>({
    material: 'PLA',
    infillPercentage: 20,
    quality: 'standard',
    rushOrder: false,
  });
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleUploadSuccess = (data: {
    fileName: string;
    fileSize: number;
    fileHash: string;
    stlData: STLData;
  }) => {
    setUploadData(data);
    setCurrentStep('options');
    setError('');
  };

  const handleOptionsComplete = () => {
    setCurrentStep('email');
  };

  const handleEmailSubmit = async (email: string) => {
    if (!uploadData) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/calculate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
          fileHash: uploadData.fileHash,
          stlData: uploadData.stlData,
          ...printOptions,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message);
      }

      setQuote(result.data);
      setCurrentStep('quote');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate quote');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setUploadData(null);
    setQuote(null);
    setError('');
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            3D Print Quote System
          </h1>
          <p className="text-lg text-gray-600">
            Upload your STL file and get an instant quote
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['Upload', 'Options', 'Email', 'Quote'].map((step, index) => {
              const stepValue: Step = step.toLowerCase() as Step;
              const isActive = currentStep === stepValue;
              const isCompleted =
                ['upload', 'options', 'email', 'quote'].indexOf(currentStep) >
                ['upload', 'options', 'email', 'quote'].indexOf(stepValue);

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        font-semibold transition-colors
                        ${
                          isActive
                            ? 'bg-primary-600 text-white'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }
                      `}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span
                      className={`
                        text-sm mt-2 font-medium
                        ${isActive ? 'text-primary-600' : 'text-gray-600'}
                      `}
                    >
                      {step}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`
                        flex-1 h-1 mx-2
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 'upload' && (
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={setError}
            />
          )}

          {currentStep === 'options' && uploadData && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>File uploaded:</strong> {uploadData.fileName}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Volume:</strong> {uploadData.stlData.volume.toFixed(2)} cm³
                </p>
              </div>

              <PrintOptions
                onOptionsChange={setPrintOptions}
                disabled={loading}
              />

              <button
                onClick={handleOptionsComplete}
                disabled={loading}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Continue to Email
              </button>
            </div>
          )}

          {currentStep === 'email' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Material:</strong> {printOptions.material} |{' '}
                  <strong>Quality:</strong> {printOptions.quality} |{' '}
                  <strong>Infill:</strong> {printOptions.infillPercentage}%
                </p>
              </div>

              <EmailEntry onEmailSubmit={handleEmailSubmit} disabled={loading} />

              <button
                onClick={() => setCurrentStep('options')}
                disabled={loading}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Back to Options
              </button>
            </div>
          )}

          {currentStep === 'quote' && quote && (
            <div className="space-y-6">
              <QuoteDisplay quote={quote} />

              <button
                onClick={handleStartOver}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                Get Another Quote
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Calculating your quote...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact us at support@3dpquote.com</p>
        </div>
      </div>
    </main>
  );
}
