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
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            IDW3D Print Quote
          </h1>
          <p className="text-lg text-gray-600">
            Upload your 3D model and get an instant quote
          </p>
        </header>

        {/* Progress Steps - Centered */}
        <div className="max-w-2xl mx-auto mb-8">
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
                        'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all ' +
                        (isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                          : 'bg-gray-300 text-gray-600')
                      }
                    >
                      {isComplete ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span className="text-xs md:text-sm mt-2 text-gray-700 font-medium hidden md:block">
                      {stepLabels[step]}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={
                        'h-1 w-16 md:w-24 mx-2 transition-all ' +
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
          <div className="max-w-4xl mx-auto mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5"
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
              <div className="max-w-2xl mx-auto">
                <FileUploadZone
                  onUploadComplete={handleUploadComplete}
                  onError={handleError}
                />
              </div>
            </ErrorBoundary>
          )}

          {currentStep === 'preview' && uploadedFile && (
            <ErrorBoundary>
              <div className="max-w-4xl mx-auto space-y-6">
                <ModelPreview
                  fileId={uploadedFile.fileId}
                  fileName={uploadedFile.fileName}
                  fileDataUrl={uploadedFile.fileDataUrl}
                />
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCurrentStep('upload')}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Upload Different File
                  </button>
                  <button
                    onClick={() => setCurrentStep('quote')}
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors"
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
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <svg
                        className="w-16 h-16 text-green-500 mx-auto mb-4"
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
                      <h3 className="text-2xl font-bold text-green-800 mb-2">
                        Quote Ready!
                      </h3>
                      <p className="text-green-700 mb-4">
                        Your quote is valid for 7 days
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={handleStartOver}
                          className="px-6 py-2 bg-white text-green-700 border border-green-300 font-semibold rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Get Another Quote
                        </button>
                        <a
                          href={'/order/' + generatedQuoteId}
                          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-lg"
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

        {/* How it works section with polished boxes */}
        <section className="mt-16 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <div className="text-blue-600 text-4xl mb-4">📤</div>
              <h3 className="text-xl font-semibold mb-2">Upload STL</h3>
              <p className="text-gray-600">
                Simply drag and drop your 3D model file
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <div className="text-blue-600 text-4xl mb-4">👁️</div>
              <h3 className="text-xl font-semibold mb-2">Preview Model</h3>
              <p className="text-gray-600">
                View your model in 3D and configure options
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <div className="text-blue-600 text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Get Quote</h3>
              <p className="text-gray-600">
                Receive detailed pricing instantly
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>&copy; 2026 IDW3D. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
