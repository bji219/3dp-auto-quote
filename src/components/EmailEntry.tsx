'use client';

import { useState } from 'react';

interface EmailEntryProps {
  onEmailSubmit: (email: string) => void;
  disabled?: boolean;
}

export default function EmailEntry({ onEmailSubmit, disabled = false }: EmailEntryProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    onEmailSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          disabled={disabled}
          placeholder="your.email@example.com"
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-2 text-sm text-gray-500">
          We'll send your quote to this email address
        </p>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="
          w-full px-6 py-3 bg-primary-600 text-white rounded-lg
          font-medium hover:bg-primary-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
          disabled:bg-gray-400 disabled:cursor-not-allowed
          transition-colors duration-200
        "
      >
        Get Quote
      </button>
    </form>
  );
}
