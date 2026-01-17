'use client';

import { QuoteResponse } from '@/types';
import { formatPrice } from '@/utils/pricing';

interface QuoteDisplayProps {
  quote: QuoteResponse;
}

export default function QuoteDisplay({ quote }: QuoteDisplayProps) {
  const estimatedPrintTime = (quote.volume / 10).toFixed(1);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your 3D Printing Quote</h2>
        {quote.requiresVerification && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Please check your email to verify your address and receive the full quote details.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* File Information */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">File Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">File Name</p>
              <p className="text-base font-medium text-gray-900">{quote.fileName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-base font-medium text-gray-900">{quote.email}</p>
            </div>
          </div>
        </div>

        {/* Model Specifications */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Specifications</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Volume</p>
              <p className="text-base font-medium text-gray-900">
                {quote.volume.toFixed(2)} cm³
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Surface Area</p>
              <p className="text-base font-medium text-gray-900">
                {quote.surfaceArea.toFixed(2)} cm²
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dimensions</p>
              <p className="text-base font-medium text-gray-900">
                {quote.boundingBox.x.toFixed(1)} × {quote.boundingBox.y.toFixed(1)} ×{' '}
                {quote.boundingBox.z.toFixed(1)} cm
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Print Time</p>
              <p className="text-base font-medium text-gray-900">{estimatedPrintTime} hours</p>
            </div>
          </div>
        </div>

        {/* Print Settings */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Print Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Material</p>
              <p className="text-base font-medium text-gray-900">{quote.material}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quality</p>
              <p className="text-base font-medium text-gray-900 capitalize">{quote.quality}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Infill Percentage</p>
              <p className="text-base font-medium text-gray-900">{quote.infillPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Cost</span>
              <span className="font-medium text-gray-900">
                {formatPrice(quote.baseCost)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Material Cost</span>
              <span className="font-medium text-gray-900">
                {formatPrice(quote.materialCost)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Labor Cost</span>
              <span className="font-medium text-gray-900">
                {formatPrice(quote.laborCost)}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(quote.totalCost)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            This quote is valid until{' '}
            <span className="font-medium text-gray-700">
              {new Date(quote.validUntil).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
