import { STLData } from '@/types';

/**
 * Print time estimation parameters
 */
export interface PrintTimeConfig {
  printSpeedCm3PerHour?: number; // Default: 10 cm³/hour
  layerHeight?: number; // Default: 0.2mm
  infillPercentage?: number; // Default: 20%
  travelSpeedMmPerSec?: number; // Default: 150 mm/s
}

/**
 * Enhanced STL parser with better error handling and print time estimation
 * Supports both ASCII and Binary STL formats
 */
export async function parseSTL(
  buffer: ArrayBuffer,
  config?: PrintTimeConfig
): Promise<STLData> {
  // Validate input
  if (!buffer || buffer.byteLength === 0) {
    return {
      vertices: 0,
      triangles: 0,
      volume: 0,
      surfaceArea: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
      isValid: false,
      errors: ['Empty or invalid buffer provided'],
    };
  }

  // Minimum valid STL file size
  if (buffer.byteLength < 84) {
    return {
      vertices: 0,
      triangles: 0,
      volume: 0,
      surfaceArea: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
      isValid: false,
      errors: ['File is too small to be a valid STL file (minimum 84 bytes)'],
    };
  }

  try {
    const isBinary = checkIfBinary(buffer);

    let result: STLData;
    if (isBinary) {
      result = parseBinarySTL(buffer);
    } else {
      result = parseASCIISTL(buffer);
    }

    // Calculate estimated print time
    if (result.isValid && result.volume > 0) {
      result.estimatedPrintTime = calculatePrintTime(result, config);
    }

    return result;
  } catch (error) {
    return {
      vertices: 0,
      triangles: 0,
      volume: 0,
      surfaceArea: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
      isValid: false,
      errors: [`Failed to parse STL: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Check if STL file is binary or ASCII format
 */
function checkIfBinary(buffer: ArrayBuffer): boolean {
  try {
    const view = new Uint8Array(buffer);

    // Check first 5 bytes for "solid" (ASCII format)
    const header = String.fromCharCode(...view.slice(0, Math.min(5, view.length)));

    if (header === 'solid') {
      // Could still be binary with "solid" in header
      // Check if file size matches binary format
      if (buffer.byteLength >= 84) {
        const uint32View = new Uint32Array(buffer, 80, 1);
        const triangleCount = uint32View[0];
        const expectedSize = 80 + 4 + triangleCount * 50;

        // If size matches binary format exactly, it's binary
        if (buffer.byteLength === expectedSize) {
          return true;
        }

        // If triangle count is unreasonably large, likely ASCII
        if (triangleCount > 10000000) {
          return false;
        }

        // If size is close to expected binary size (within 10%), likely binary
        const sizeDifference = Math.abs(buffer.byteLength - expectedSize);
        if (sizeDifference / expectedSize < 0.1) {
          return true;
        }
      }

      // Check if content is valid ASCII
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(0, 1000));
        if (text.includes('facet') || text.includes('vertex') || text.includes('endsolid')) {
          return false;
        }
      } catch {
        return true;
      }
    }

    return true;
  } catch {
    return true; // Default to binary if detection fails
  }
}

/**
 * Parse Binary STL format with enhanced error handling
 */
function parseBinarySTL(buffer: ArrayBuffer): STLData {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const view = new DataView(buffer);

    // Validate minimum size
    if (buffer.byteLength < 84) {
      throw new Error('Binary STL file is too small');
    }

    // Read number of triangles (at byte 80)
    const triangleCount = view.getUint32(80, true);

    // Validate triangle count
    if (triangleCount === 0) {
      throw new Error('STL file contains zero triangles');
    }

    if (triangleCount > 100000000) {
      throw new Error(`Invalid triangle count: ${triangleCount} (too large)`);
    }

    // Validate file size matches triangle count
    const expectedSize = 80 + 4 + triangleCount * 50;
    if (buffer.byteLength !== expectedSize) {
      warnings.push(
        `File size mismatch: expected ${expectedSize} bytes, got ${buffer.byteLength} bytes`
      );
    }

    const vertices: Array<[number, number, number]> = [];
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    let totalSurfaceArea = 0;
    let invalidTriangles = 0;

    // Each triangle: 50 bytes (12 floats + 2 bytes attribute)
    // Start at byte 84
    for (let i = 0; i < triangleCount; i++) {
      const offset = 84 + i * 50;

      // Check if we have enough data
      if (offset + 50 > buffer.byteLength) {
        errors.push(`Incomplete triangle data at triangle ${i}`);
        break;
      }

      try {
        // Read normal vector (for validation)
        const nx = view.getFloat32(offset, true);
        const ny = view.getFloat32(offset + 4, true);
        const nz = view.getFloat32(offset + 8, true);

        // Three vertices
        const v1: [number, number, number] = [
          view.getFloat32(offset + 12, true),
          view.getFloat32(offset + 16, true),
          view.getFloat32(offset + 20, true),
        ];
        const v2: [number, number, number] = [
          view.getFloat32(offset + 24, true),
          view.getFloat32(offset + 28, true),
          view.getFloat32(offset + 32, true),
        ];
        const v3: [number, number, number] = [
          view.getFloat32(offset + 36, true),
          view.getFloat32(offset + 40, true),
          view.getFloat32(offset + 44, true),
        ];

        // Validate vertices are not NaN or Infinity
        const allVertices = [...v1, ...v2, ...v3, nx, ny, nz];
        if (allVertices.some((v) => !isFinite(v))) {
          invalidTriangles++;
          continue;
        }

        vertices.push(v1, v2, v3);

        // Update bounding box
        [v1, v2, v3].forEach(([x, y, z]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);
        });

        // Calculate surface area of this triangle
        const area = calculateTriangleArea(v1, v2, v3);
        if (area > 0) {
          totalSurfaceArea += area;
        }
      } catch (err) {
        invalidTriangles++;
        continue;
      }
    }

    if (invalidTriangles > 0) {
      warnings.push(`${invalidTriangles} invalid triangles were skipped`);
    }

    if (vertices.length === 0) {
      throw new Error('No valid triangles found in STL file');
    }

    // Calculate volume using divergence theorem
    const volume = calculateVolume(vertices);

    if (!isFinite(volume) || volume <= 0) {
      errors.push('Invalid volume calculation - model may not be a closed mesh');
    }

    const result: STLData = {
      vertices: vertices.length,
      triangles: vertices.length / 3,
      volume: Math.abs(volume) / 1000, // Convert mm³ to cm³
      surfaceArea: totalSurfaceArea / 100, // Convert mm² to cm²
      boundingBox: {
        x: (maxX - minX) / 10, // Convert mm to cm
        y: (maxY - minY) / 10,
        z: (maxZ - minZ) / 10,
      },
      isValid: errors.length === 0 && volume > 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return result;
  } catch (error) {
    throw new Error(
      `Binary STL parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse ASCII STL format with enhanced error handling
 */
function parseASCIISTL(buffer: ArrayBuffer): STLData {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split('\n').map((line) => line.trim());

    // Validate STL format
    const firstLine = lines[0];
    if (!firstLine.startsWith('solid')) {
      throw new Error('Invalid ASCII STL format: missing "solid" header');
    }

    const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
    if (!lastLine.includes('endsolid')) {
      warnings.push('Missing or malformed "endsolid" footer');
    }

    const vertices: Array<[number, number, number]> = [];
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    let totalSurfaceArea = 0;
    let triangleCount = 0;
    let invalidVertices = 0;

    let currentTriangle: Array<[number, number, number]> = [];
    let inFacet = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      if (line.startsWith('facet')) {
        inFacet = true;
        currentTriangle = [];
      } else if (line.startsWith('endfacet')) {
        inFacet = false;
        if (currentTriangle.length !== 3) {
          warnings.push(`Triangle at line ${lineNum} has ${currentTriangle.length} vertices (expected 3)`);
        }
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        if (parts.length < 4) {
          invalidVertices++;
          continue;
        }

        try {
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);

          if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            invalidVertices++;
            continue;
          }

          const vertex: [number, number, number] = [x, y, z];
          currentTriangle.push(vertex);
          vertices.push(vertex);

          // Update bounding box
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);

          if (currentTriangle.length === 3) {
            const area = calculateTriangleArea(
              currentTriangle[0],
              currentTriangle[1],
              currentTriangle[2]
            );
            if (area > 0) {
              totalSurfaceArea += area;
            }
            triangleCount++;
          }
        } catch (err) {
          invalidVertices++;
          continue;
        }
      }
    }

    if (invalidVertices > 0) {
      warnings.push(`${invalidVertices} invalid vertices were skipped`);
    }

    if (vertices.length === 0) {
      throw new Error('No valid vertices found in ASCII STL file');
    }

    if (triangleCount === 0) {
      throw new Error('No valid triangles found in ASCII STL file');
    }

    const volume = calculateVolume(vertices);

    if (!isFinite(volume) || volume <= 0) {
      errors.push('Invalid volume calculation - model may not be a closed mesh');
    }

    const result: STLData = {
      vertices: vertices.length,
      triangles: triangleCount,
      volume: Math.abs(volume) / 1000, // Convert mm³ to cm³
      surfaceArea: totalSurfaceArea / 100, // Convert mm² to cm²
      boundingBox: {
        x: (maxX - minX) / 10, // Convert mm to cm
        y: (maxY - minY) / 10,
        z: (maxZ - minZ) / 10,
      },
      isValid: errors.length === 0 && volume > 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return result;
  } catch (error) {
    throw new Error(
      `ASCII STL parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate area of a triangle using cross product
 */
function calculateTriangleArea(
  v1: [number, number, number],
  v2: [number, number, number],
  v3: [number, number, number]
): number {
  const ax = v2[0] - v1[0];
  const ay = v2[1] - v1[1];
  const az = v2[2] - v1[2];

  const bx = v3[0] - v1[0];
  const by = v3[1] - v1[1];
  const bz = v3[2] - v1[2];

  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;

  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
}

/**
 * Calculate volume using divergence theorem (signed volume)
 */
function calculateVolume(vertices: Array<[number, number, number]>): number {
  let volume = 0;

  for (let i = 0; i < vertices.length; i += 3) {
    if (i + 2 >= vertices.length) break;

    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    const v3 = vertices[i + 2];

    // Calculate signed volume of tetrahedron formed by origin and triangle
    volume += signedVolumeOfTriangle(v1, v2, v3);
  }

  return volume;
}

/**
 * Calculate signed volume of tetrahedron
 */
function signedVolumeOfTriangle(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): number {
  return (
    (p1[0] * (p2[1] * p3[2] - p2[2] * p3[1]) -
      p1[1] * (p2[0] * p3[2] - p2[2] * p3[0]) +
      p1[2] * (p2[0] * p3[1] - p2[1] * p3[0])) /
    6
  );
}

/**
 * Calculate estimated print time based on volume and configuration
 */
export function calculatePrintTime(data: STLData, config?: PrintTimeConfig): number {
  const printSpeedCm3PerHour = config?.printSpeedCm3PerHour || 10;
  const infillPercentage = config?.infillPercentage || 20;

  // Adjust volume based on infill (less infill = faster print)
  const infillMultiplier = 1 + (infillPercentage / 100) * 0.5;

  // Base print time from volume
  const basePrintTime = (data.volume * infillMultiplier) / printSpeedCm3PerHour;

  // Add overhead for layer changes, travel moves, etc. (typically 10-20%)
  const overhead = basePrintTime * 0.15;

  return parseFloat((basePrintTime + overhead).toFixed(2));
}

/**
 * Validate STL data with enhanced checks
 */
export function validateSTLData(data: STLData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.triangles === 0) {
    errors.push('STL file contains no triangles');
  }

  if (data.volume <= 0) {
    errors.push('Invalid volume calculation (volume must be positive)');
  }

  if (data.surfaceArea <= 0) {
    errors.push('Invalid surface area calculation (surface area must be positive)');
  }

  if (data.boundingBox.x <= 0 || data.boundingBox.y <= 0 || data.boundingBox.z <= 0) {
    errors.push('Invalid bounding box dimensions (all dimensions must be positive)');
  }

  // Check for reasonable dimensions (not too large)
  const maxDimension = Math.max(data.boundingBox.x, data.boundingBox.y, data.boundingBox.z);
  if (maxDimension > 100) {
    // 100 cm = 1 meter
    errors.push(
      `Model is very large (${maxDimension.toFixed(2)} cm max dimension). Please verify dimensions.`
    );
  }

  // Check for very small models
  const minDimension = Math.min(data.boundingBox.x, data.boundingBox.y, data.boundingBox.z);
  if (minDimension < 0.1) {
    // 0.1 cm = 1mm
    errors.push(
      `Model is very small (${minDimension.toFixed(3)} cm min dimension). This may be difficult to print.`
    );
  }

  // Check volume to surface area ratio (detect potential issues)
  const volumeToSurfaceRatio = data.volume / data.surfaceArea;
  if (volumeToSurfaceRatio > 10) {
    errors.push('Unusual volume to surface area ratio. Model may have errors.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
