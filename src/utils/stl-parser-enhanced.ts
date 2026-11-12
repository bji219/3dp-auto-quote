import { STLData } from '@/types';
import {
  ACTIVE_PRINTER,
  StlError,
  analyzeMesh,
  estimatePrint,
  parseStl,
  PrinterProfile,
} from '@/lib/quote-engine';

/**
 * Server-side adapter around the quote engine. Returns the legacy STLData
 * shape (cm, cm², cm³) with the full analysis attached.
 */

export interface PrintTimeConfig {
  infillPercentage?: number;
  quality?: 'draft' | 'standard' | 'high';
  printer?: PrinterProfile;
}

const EMPTY: STLData = {
  vertices: 0,
  triangles: 0,
  volume: 0,
  surfaceArea: 0,
  boundingBox: { x: 0, y: 0, z: 0 },
  isValid: false,
};

export async function parseSTL(buffer: ArrayBuffer, config?: PrintTimeConfig): Promise<STLData> {
  try {
    const analysis = analyzeMesh(
      parseStl(buffer),
      (config?.printer ?? ACTIVE_PRINTER).overhangAngle
    );
    const warnings: string[] = [];
    if (analysis.openness > 0.02) warnings.push('Mesh is not watertight; volume is approximate');
    if (analysis.inverted) warnings.push('Normals were inverted; corrected automatically');

    const data: STLData = {
      analysis,
      vertices: analysis.triangles * 3,
      triangles: analysis.triangles,
      volume: analysis.volume / 1000,
      surfaceArea: analysis.area / 100,
      boundingBox: {
        x: analysis.size[0] / 10,
        y: analysis.size[1] / 10,
        z: analysis.size[2] / 10,
      },
      isValid: analysis.volume > 0,
      errors: analysis.volume > 0 ? undefined : ['The mesh encloses no volume'],
      warnings: warnings.length ? warnings : undefined,
    };
    if (data.isValid) data.estimatedPrintTime = calculatePrintTime(data, config);
    return data;
  } catch (error) {
    const message =
      error instanceof StlError
        ? error.message
        : `Failed to parse STL: ${error instanceof Error ? error.message : 'unknown error'}`;
    return { ...EMPTY, errors: [message] };
  }
}

/** Hours for one part at the given (or default) settings. */
export function calculatePrintTime(data: STLData, config?: PrintTimeConfig): number {
  if (!data.analysis) return 0;
  const est = estimatePrint(data.analysis, {
    material: 'PLA',
    quality: config?.quality ?? 'standard',
    infill: config?.infillPercentage ?? 15,
    orientation: 'auto',
    printer: config?.printer,
  });
  return parseFloat(est.hours.toFixed(2));
}

/**
 * Only reject what cannot be quoted at all. Size, thinness and open meshes are
 * surfaced as warnings on the quote instead of blocking the upload.
 */
export function validateSTLData(data: STLData): { valid: boolean; errors: string[] } {
  const errors: string[] = [...(data.errors ?? [])];
  if (data.triangles === 0 && errors.length === 0) errors.push('STL file contains no triangles');
  if (data.triangles > 0 && data.volume <= 0) errors.push('The mesh encloses no volume');
  const b = data.boundingBox;
  if (data.triangles > 0 && [b.x, b.y, b.z].filter((d) => d > 0).length < 2) {
    errors.push('The model is degenerate (it has no extent in two directions)');
  }
  return { valid: errors.length === 0, errors };
}
