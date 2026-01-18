'use client';

import { useState } from 'react';
import FileUploadZone from '@/components/FileUploadZone';
import EmailVerification from '@/components/EmailVerification';
import QuoteDisplay from '@/components/QuoteDisplay';
import ModelPreview from '@/components/ModelPreview';
import { STLData } from '@/types';

type FlowStep = 'upload' | 'preview' | 'verify' | 'quote';

export default function QuotePage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string;
    fileName: string;
    fileSize: number;
    stlData: STLData;
  } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [generatedQuoteId, setGeneratedQuoteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleUploadComplete = (data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    stlData: STLData;
  }) => {
    setUploadedFile(data);
    setCurrentStep('preview');
    setError('');
  };

  const handleVerificationComplete = (token: string, email: string) => {
    setSessionToken(token);
    setUserEmail(email);
    setCurrentStep('quote');
    setError('');
  };

  const handleQuoteGenerated = (quoteId: string) => {
    setGeneratedQuoteId(quoteId);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getStepNumber = (step: FlowStep): number => {
    const steps: FlowStep[] = ['upload', 'preview', 'verify', 'quote'];
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
            3D Print Quote System
          </h1>
          <p className="text-lg text-gray-600">
            Get an instant quote for your 3D printing project
          </p>
        </header>

        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {(['upload', 'preview', 'verify', 'quote'] as FlowStep[]).map((step, index) => {
              const stepNum = index + 1;
              const isCurrent = currentStep === step;
              const isComplete = isStepComplete(step);
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
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
                    <span className="text-xs md:text-sm mt-2 text-gray-700 font-medium hidden md:block capitalize">
                      {step}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={
                        'h-1 flex-1 mx-2 transition-all ' +
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
            <div className="max-w-2xl mx-auto">
              <FileUploadZone
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>
          )}

          {currentStep === 'preview' && uploadedFile && (
            <div className="max-w-4xl mx-auto space-y-6">
              <ModelPreview
                fileId={uploadedFile.fileId}
                fileName={uploadedFile.fileName}
              />
              <div className="flex justify-center">
                <button
                  onClick={() => setCurrentStep('verify')}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors"
                >
                  Continue to Verification
                </button>
              </div>
            </div>
          )}

          {currentStep === 'verify' && (
            <EmailVerification
              onVerificationComplete={handleVerificationComplete}
              onError={handleError}
            />
          )}

          {currentStep === 'quote' && uploadedFile && sessionToken && (
            <div className="space-y-6">
              <QuoteDisplay
                stlData={uploadedFile.stlData}
                fileId={uploadedFile.fileId}
                sessionToken={sessionToken}
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
                      Quote Generated Successfully!
                    </h3>
                    <p className="text-green-700 mb-4">
                      Your quote has been sent to {userEmail}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => {
                          setCurrentStep('upload');
                          setUploadedFile(null);
                          setSessionToken(null);
                          setUserEmail(null);
                          setGeneratedQuoteId(null);
                        }}
                        className="px-6 py-2 bg-white text-green-700 border border-green-300 font-semibold rounded-lg hover:bg-green-50 transition-colors"
                      >
                        Get Another Quote
                      </button>
                      <a
                        href={'/api/quote/' + generatedQuoteId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        View Quote Details
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>&copy; 2026 3D Print Quote System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
