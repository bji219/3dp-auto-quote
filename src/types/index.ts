export interface STLData {
  vertices: number;
  triangles: number;
  volume: number; // cubic cm
  surfaceArea: number; // square cm
  boundingBox: {
    x: number;
    y: number;
    z: number;
  };
  estimatedPrintTime?: number; // hours (baseline estimate)
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface QuoteRequest {
  email: string;
  fileName: string;
  fileSize: number;
  material?: string;
  infillPercentage?: number;
  quality?: 'draft' | 'standard' | 'high';
  color?: string;
  rushOrder?: boolean;
}

export interface QuoteResponse {
  id: string;
  email: string;
  fileName: string;
  volume: number;
  surfaceArea: number;
  boundingBox: {
    x: number;
    y: number;
    z: number;
  };
  material: string;
  infillPercentage: number;
  quality: string;
  baseCost: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  validUntil: string;
  requiresVerification: boolean;
}

export interface PricingConfig {
  basePricePerCm3: number;
  materialCostMultiplier: number;
  rushOrderMultiplier: number;
  qualityMultipliers: {
    draft: number;
    standard: number;
    high: number;
  };
  laborCostPerHour: number;
  estimatedPrintSpeedCm3PerHour: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    stlData: STLData;
  };
  error?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

export type QuoteStatus = 'pending' | 'verified' | 'accepted' | 'rejected' | 'completed';

export type Material = {
  id: string;
  name: string;
  costPerCm3: number;
  density: number;
  color?: string;
  available: boolean;
  description?: string;
};
