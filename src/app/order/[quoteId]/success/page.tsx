'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = params.quoteId as string;
  const sessionId = searchParams.get('session_id');

  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/quote/${quoteId}`);
        const data = await response.json();

        if (response.ok && data.quote) {
          setEmail(data.quote.email);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-green-800 mb-2">Payment Successful!</h1>

        <p className="text-gray-600 mb-4">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        {!loading && email && (
          <p className="text-sm text-gray-500 mb-6">
            A confirmation email has been sent to <strong>{email}</strong>
          </p>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-800 mb-2">What happens next?</h2>
          <ul className="text-sm text-gray-600 text-left space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>We&apos;ll review your order and prepare your 3D model for printing</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your print will be started within 24 hours</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You&apos;ll receive shipping updates via email</span>
            </li>
          </ul>
        </div>

        {sessionId && (
          <p className="text-xs text-gray-400 mb-4">
            Order ID: {quoteId}
          </p>
        )}

        <div className="space-y-3">
          <a
            href="/quote"
            className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Another Quote
          </a>

          <a
            href="mailto:support@idw3d.com"
            className="block w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Contact Support
          </a>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Questions? Email us at <a href="mailto:support@idw3d.com" className="text-blue-600 hover:underline">support@idw3d.com</a>
        </p>
      </div>
    </div>
  );
}
