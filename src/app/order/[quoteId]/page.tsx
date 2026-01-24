'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface QuoteData {
  id: string;
  fileName: string;
  material: string;
  quality: string;
  infillPercentage: number;
  rushOrder: boolean;
  totalCost: number;
  validUntil: string;
  status: string;
  volume: number;
  email: string;
}

export default function OrderPage() {
  const params = useParams();
  const quoteId = params.quoteId as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/quote/${quoteId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load quote');
        }

        setQuote(data.quote);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quote');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const handleOrder = async () => {
    setOrdering(true);
    setError('');

    try {
      // Create Stripe Checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quoteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate checkout');
      setOrdering(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = quote ? new Date() > new Date(quote.validUntil) : false;
  const isAlreadyOrdered = quote?.status === 'accepted' || quote?.status === 'completed';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/quote" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Get New Quote
          </a>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for your order. We&apos;ve sent a confirmation email to {quote?.email}.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ll begin working on your print shortly and notify you when it&apos;s ready.
          </p>
          <a href="/quote" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Get Another Quote
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-600 text-white p-6">
              <h1 className="text-2xl font-bold">Complete Your Order</h1>
              <p className="text-blue-100 mt-1">Review your quote and confirm</p>
            </div>

            {quote && (
              <div className="p-6">
                {isExpired && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 font-medium">This quote has expired.</p>
                    <p className="text-red-600 text-sm">Please request a new quote.</p>
                    <a href="/quote" className="inline-block mt-2 text-red-700 underline">
                      Get New Quote
                    </a>
                  </div>
                )}

                {isAlreadyOrdered && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-medium">This order has already been placed.</p>
                    <p className="text-green-600 text-sm">Check your email for order confirmation.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">File</span>
                    <span className="font-medium">{quote.fileName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Material</span>
                    <span className="font-medium">{quote.material}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Quality</span>
                    <span className="font-medium capitalize">{quote.quality}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Infill</span>
                    <span className="font-medium">{quote.infillPercentage}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Volume</span>
                    <span className="font-medium">{quote.volume.toFixed(2)} cm&sup3;</span>
                  </div>
                  {quote.rushOrder && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-orange-600">Rush Order</span>
                      <span className="font-medium text-orange-600">Yes</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Valid Until</span>
                    <span className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                      {formatDate(quote.validUntil)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">Total</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {formatCurrency(quote.totalCost)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleOrder}
                    disabled={ordering || isExpired || isAlreadyOrdered}
                    className="w-full py-4 px-6 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {ordering ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    By proceeding, you agree to our{' '}
                    <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                      terms of service
                    </a>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm text-gray-500">
                    Questions? Contact us at{' '}
                    <a href="mailto:support@idw3d.com" className="text-blue-600 hover:underline">
                      support@idw3d.com
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
