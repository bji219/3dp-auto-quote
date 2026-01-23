'use client';

import { useState } from 'react';
import { STLData } from '@/types';

interface QuoteDisplayProps {
  stlData: STLData;
  fileId: string;
  sessionToken?: string; // Now optional
  onQuoteGenerated?: (quoteId: string) => void;
}

interface QuoteData {
  id: string;
  model: {
    volume: number;
    surfaceArea: number;
    weight: number;
    complexity: number;
  };
  material: {
    name: string;
    costPerCm3: number;
  };
  print: {
    estimatedTime: number;
    infillPercentage: number;
    quality: string;
  };
  breakdown: {
    setupFee: number;
    materialCost: number;
    laborCost: number;
    machineCost: number;
    complexitySurcharge: number;
    shippingCost: number;
    subtotal: number;
    discount: number;
    rushOrderFee: number;
    taxAmount: number;
    total: number;
  };
  validUntil: string;
}

const MATERIALS = [
  { value: 'PLA', label: 'PLA', description: 'Best for prototypes and general use', available: true },
  { value: 'ABS', label: 'ABS (Coming Soon)', description: 'Strong and heat-resistant - Email us for special requests', available: false },
  { value: 'PETG', label: 'PETG (Coming Soon)', description: 'Durable and chemical resistant - Email us for special requests', available: false },
  { value: 'TPU', label: 'TPU Flexible (Coming Soon)', description: 'Flexible and elastic - Email us for special requests', available: false },
  { value: 'Nylon', label: 'Nylon (Coming Soon)', description: 'Very strong and durable - Email us for special requests', available: false },
  { value: 'Carbon Fiber', label: 'Carbon Fiber (Coming Soon)', description: 'Extremely strong and lightweight - Email us for special requests', available: false },
  { value: 'Resin', label: 'Resin (Coming Soon)', description: 'Highest detail and smooth finish - Email us for special requests', available: false },
];

const QUALITY_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Faster, lower resolution' },
  { value: 'standard', label: 'Standard', description: 'Balanced quality and speed' },
  { value: 'high', label: 'High Quality', description: 'Slower, highest resolution' },
];

export default function QuoteDisplay({ stlData, fileId, sessionToken, onQuoteGenerated }: QuoteDisplayProps) {
  const [material, setMaterial] = useState('PLA');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>('standard');
  const [infillPercentage, setInfillPercentage] = useState(20);
  const [rushOrder, setRushOrder] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [error, setError] = useState('');

  // Anti-bot honeypot
  const [honeypot, setHoneypot] = useState('');
  const [formLoadTime] = useState(Date.now());

  // Email capture
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleCalculateQuote = async () => {
    setError('');
    setIsCalculating(true);

    try {
      // Use public API (no auth required) or authenticated API
      const endpoint = sessionToken ? '/api/calculate-quote' : '/api/calculate-quote-public';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (sessionToken) {
        headers['Authorization'] = 'Bearer ' + sessionToken;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileId,
          material,
          infillPercentage,
          quality,
          rushOrder,
          // Anti-bot fields (only for public API)
          ...(sessionToken ? {} : { honeypot, formLoadTime }),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to calculate quote');
      }

      setQuote(result.quote);
      onQuoteGenerated?.(result.quote.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate quote';
      setError(message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!quote || !email) return;

    setEmailError('');
    setIsSendingEmail(true);

    try {
      const response = await fetch(`/api/quote/${quote.id}/save-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send email');
      }

      setEmailSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      setEmailError(message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return '$' + amount.toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Configure Your Quote
        </h2>

        {/* Hidden honeypot field for bot detection */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px' }}
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MATERIALS.map((mat) => (
                <option key={mat.value} value={mat.value} disabled={!mat.available}>
                  {mat.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {MATERIALS.find((m) => m.value === material)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as 'draft' | 'standard' | 'high')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {QUALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {QUALITY_OPTIONS.find((q) => q.value === quality)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Infill: {infillPercentage}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={infillPercentage}
              onChange={(e) => setInfillPercentage(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Less material</span>
              <span>More strength</span>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rushOrder}
                onChange={(e) => setRushOrder(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Rush Order (2-3 days)
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleCalculateQuote}
          disabled={isCalculating}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Calculating Quote...
            </span>
          ) : (
            'Get Instant Quote'
          )}
        </button>

        {quote && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Your Quote
              </h3>
              <span className="text-sm text-gray-600">
                Valid until {formatDate(quote.validUntil)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 mb-1">Volume</p>
                <p className="text-sm font-semibold text-gray-800">
                  {quote.model.volume.toFixed(2)} cm³
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Weight</p>
                <p className="text-sm font-semibold text-gray-800">
                  {quote.model.weight.toFixed(1)} g
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Print Time</p>
                <p className="text-sm font-semibold text-gray-800">
                  ~{quote.print.estimatedTime.toFixed(1)} hrs
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {/* Consolidated Estimated Price line item */}
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">Estimated Price</span>
                <span className="text-gray-800">
                  {formatCurrency(
                    quote.breakdown.setupFee +
                    quote.breakdown.materialCost +
                    quote.breakdown.laborCost +
                    quote.breakdown.machineCost
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-2">
                Includes setup, material, labor, and machine time
              </p>
              {quote.breakdown.complexitySurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Complexity Surcharge</span>
                  <span className="text-gray-800">{formatCurrency(quote.breakdown.complexitySurcharge)}</span>
                </div>
              )}
              {quote.breakdown.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-800">{formatCurrency(quote.breakdown.shippingCost)}</span>
                </div>
              )}
              {quote.breakdown.rushOrderFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rush Order Fee</span>
                  <span className="text-orange-600 font-medium">{formatCurrency(quote.breakdown.rushOrderFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-800">{formatCurrency(quote.breakdown.subtotal)}</span>
              </div>
              {quote.breakdown.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Volume Discount</span>
                  <span className="text-green-600">-{formatCurrency(quote.breakdown.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-800">{formatCurrency(quote.breakdown.taxAmount)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
              <span className="text-xl font-bold text-gray-800">Total</span>
              <span className="text-3xl font-bold text-blue-600">
                {formatCurrency(quote.breakdown.total)}
              </span>
            </div>

            {/* Email capture section */}
            {!emailSent ? (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Get Quote Details by Email
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Enter your email to receive the full quote details and an Order Now link.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={!email || isSendingEmail}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSendingEmail ? 'Sending...' : 'Send'}
                  </button>
                </div>
                {emailError && (
                  <p className="text-sm text-red-600 mt-2">{emailError}</p>
                )}
              </div>
            ) : (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 font-medium">Quote details sent to {email}!</span>
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Quote ID:</span> {quote.id}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Save this ID to retrieve your quote later
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
