'use client';

import { useState } from 'react';
import FileUploadZone from '@/components/FileUploadZone';
import QuoteDisplay from '@/components/QuoteDisplay';
import ModelPreview from '@/components/ModelPreview';
import ErrorBoundary from '@/components/ErrorBoundary';
import { STLData } from '@/types';

type FlowStep = 'upload' | 'preview' | 'quote';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string;
    fileName: string;
    fileSize: number;
    stlData: STLData;
    fileDataUrl?: string;
  } | null>(null);
  const [generatedQuoteId, setGeneratedQuoteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleUploadComplete = (data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    stlData: STLData;
    fileDataUrl?: string;
  }) => {
    setUploadedFile(data);
    setCurrentStep('preview');
    setError('');
  };

  const handleQuoteGenerated = (quoteId: string) => {
    setGeneratedQuoteId(quoteId);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setGeneratedQuoteId(null);
    setError('');
  };

  const getStepNumber = (step: FlowStep): number => {
    const steps: FlowStep[] = ['upload', 'preview', 'quote'];
    return steps.indexOf(step) + 1;
  };

  const isStepComplete = (step: FlowStep): boolean => {
    const currentStepNum = getStepNumber(currentStep);
    const stepNum = getStepNumber(step);
    return stepNum < currentStepNum;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-800 md:text-5xl">IDW3D Print Quote</h1>
          <p className="text-lg text-gray-600">Upload your 3D model and get an instant quote</p>
        </header>

        {/* Progress Steps - Centered */}
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="flex items-center justify-center">
            {(['upload', 'preview', 'quote'] as FlowStep[]).map((step, index) => {
              const stepNum = index + 1;
              const isCurrent = currentStep === step;
              const isComplete = isStepComplete(step);
              const stepLabels = {
                upload: 'Upload STL',
                preview: 'Preview',
                quote: 'Get Quote',
              };

              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all md:h-12 md:w-12 md:text-base ' +
                        (isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                            : 'bg-gray-300 text-gray-600')
                      }
                    >
                      {isComplete ? (
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span className="mt-2 hidden text-xs font-medium text-gray-700 md:block md:text-sm">
                      {stepLabels[step]}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={
                        'mx-2 h-1 w-16 transition-all md:w-24 ' +
                        (isComplete ? 'bg-green-500' : 'bg-gray-300')
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-4xl">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <svg
                  className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        <main>
          {currentStep === 'upload' && (
            <ErrorBoundary>
              <div className="mx-auto max-w-2xl">
                <FileUploadZone onUploadComplete={handleUploadComplete} onError={handleError} />
              </div>
            </ErrorBoundary>
          )}

          {currentStep === 'preview' && uploadedFile && (
            <ErrorBoundary>
              <div className="mx-auto max-w-4xl space-y-6">
                <ModelPreview
                  fileId={uploadedFile.fileId}
                  fileName={uploadedFile.fileName}
                  fileDataUrl={uploadedFile.fileDataUrl}
                />
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCurrentStep('upload')}
                    className="rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
                  >
                    Upload Different File
                  </button>
                  <button
                    onClick={() => setCurrentStep('quote')}
                    className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                  >
                    Continue to Quote
                  </button>
                </div>
              </div>
            </ErrorBoundary>
          )}

          {currentStep === 'quote' && uploadedFile && (
            <ErrorBoundary>
              <div className="space-y-6">
                <QuoteDisplay
                  stlData={uploadedFile.stlData}
                  fileId={uploadedFile.fileId}
                  onQuoteGenerated={handleQuoteGenerated}
                />

                {generatedQuoteId && (
                  <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                      <svg
                        className="mx-auto mb-4 h-16 w-16 text-green-500"
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
                      <h3 className="mb-2 text-2xl font-bold text-green-800">Quote Ready!</h3>
                      <p className="mb-4 text-green-700">Your quote is valid for 7 days</p>
                      <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <button
                          onClick={handleStartOver}
                          className="rounded-lg border border-green-300 bg-white px-6 py-2 font-semibold text-green-700 transition-colors hover:bg-green-50"
                        >
                          Get Another Quote
                        </button>
                        <a
                          href={'/order/' + generatedQuoteId}
                          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          Order Now
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* How it works section with polished boxes - clickable for navigation */}
        <section className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            <button
              onClick={() => setCurrentStep('upload')}
              className="cursor-pointer rounded-lg border-2 border-transparent bg-white p-6 text-center shadow-md transition-all hover:scale-105 hover:border-[#B85C38] hover:shadow-lg"
            >
              <div className="mb-4 text-4xl text-[#B85C38]">📤</div>
              <h3 className="mb-2 text-xl font-semibold">Upload STL</h3>
              <p className="text-gray-600">Simply drag and drop your 3D model file</p>
            </button>
            <button
              onClick={() => (uploadedFile ? setCurrentStep('preview') : null)}
              disabled={!uploadedFile}
              className={`rounded-lg border-2 border-transparent bg-white p-6 text-center shadow-md transition-all ${
                uploadedFile
                  ? 'cursor-pointer hover:scale-105 hover:border-[#B85C38] hover:shadow-lg'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="mb-4 text-4xl text-[#B85C38]">👁️</div>
              <h3 className="mb-2 text-xl font-semibold">Preview Model</h3>
              <p className="text-gray-600">View your model in 3D and configure options</p>
            </button>
            <button
              onClick={() => (uploadedFile ? setCurrentStep('quote') : null)}
              disabled={!uploadedFile}
              className={`rounded-lg border-2 border-transparent bg-white p-6 text-center shadow-md transition-all ${
                uploadedFile
                  ? 'cursor-pointer hover:scale-105 hover:border-[#B85C38] hover:shadow-lg'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="mb-4 text-4xl text-[#B85C38]">💰</div>
              <h3 className="mb-2 text-xl font-semibold">Get Quote</h3>
              <p className="text-gray-600">Receive detailed pricing instantly</p>
            </button>
          </div>
        </section>

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>&copy; 2026 IDW3D. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
