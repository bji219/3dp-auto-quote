'use client';

import { useState } from 'react';

export interface PrintOptionsData {
  material: string;
  infillPercentage: number;
  quality: 'draft' | 'standard' | 'high';
  color?: string;
  rushOrder: boolean;
}

interface PrintOptionsProps {
  onOptionsChange: (options: PrintOptionsData) => void;
  disabled?: boolean;
}

const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'Carbon Fiber', 'Resin'];
const qualities: Array<'draft' | 'standard' | 'high'> = ['draft', 'standard', 'high'];

export default function PrintOptions({ onOptionsChange, disabled = false }: PrintOptionsProps) {
  const [options, setOptions] = useState<PrintOptionsData>({
    material: 'PLA',
    infillPercentage: 20,
    quality: 'standard',
    color: '',
    rushOrder: false,
  });

  const updateOptions = (updates: Partial<PrintOptionsData>) => {
    const newOptions = { ...options, ...updates };
    setOptions(newOptions);
    onOptionsChange(newOptions);
  };

  return (
    <div className="w-full space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Print Options</h3>

      {/* Material Selection */}
      <div>
        <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-2">
          Material
        </label>
        <select
          id="material"
          value={options.material}
          onChange={(e) => updateOptions({ material: e.target.value })}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
        >
          {materials.map((material) => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>
      </div>

      {/* Quality Selection */}
      <div>
        <label htmlFor="quality" className="block text-sm font-medium text-gray-700 mb-2">
          Print Quality
        </label>
        <select
          id="quality"
          value={options.quality}
          onChange={(e) => updateOptions({ quality: e.target.value as PrintOptionsData['quality'] })}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
        >
          {qualities.map((quality) => (
            <option key={quality} value={quality}>
              {quality.charAt(0).toUpperCase() + quality.slice(1)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {options.quality === 'draft' && 'Faster printing, lower detail'}
          {options.quality === 'standard' && 'Balanced speed and quality'}
          {options.quality === 'high' && 'Slower printing, highest detail'}
        </p>
      </div>

      {/* Infill Percentage */}
      <div>
        <label htmlFor="infill" className="block text-sm font-medium text-gray-700 mb-2">
          Infill: {options.infillPercentage}%
        </label>
        <input
          type="range"
          id="infill"
          min="0"
          max="100"
          step="5"
          value={options.infillPercentage}
          onChange={(e) => updateOptions({ infillPercentage: parseInt(e.target.value) })}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Color */}
      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
          Color (Optional)
        </label>
        <input
          type="text"
          id="color"
          value={options.color}
          onChange={(e) => updateOptions({ color: e.target.value })}
          disabled={disabled}
          placeholder="e.g., Red, Blue, Black"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
        />
      </div>

      {/* Rush Order */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="rushOrder"
          checked={options.rushOrder}
          onChange={(e) => updateOptions({ rushOrder: e.target.checked })}
          disabled={disabled}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
        />
        <label htmlFor="rushOrder" className="ml-2 block text-sm text-gray-700">
          Rush Order (1.5× price multiplier)
        </label>
      </div>
    </div>
  );
}
