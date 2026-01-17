import { STLData } from '@/types';

/**
 * Parse STL file and extract geometry data
 * Supports both ASCII and Binary STL formats
 */
export async function parseSTL(buffer: ArrayBuffer): Promise<STLData> {
  const data: STLData = {
    vertices: 0,
    triangles: 0,
    volume: 0,
    surfaceArea: 0,
    boundingBox: { x: 0, y: 0, z: 0 },
    isValid: false,
    errors: [],
  };

  try {
    const isBinary = checkIfBinary(buffer);

    if (isBinary) {
      return parseBinarySTL(buffer);
    } else {
      return parseASCIISTL(buffer);
    }
  } catch (error) {
    data.errors = [`Failed to parse STL: ${error instanceof Error ? error.message : 'Unknown error'}`];
    return data;
  }
}

/**
 * Check if STL file is binary or ASCII format
 */
function checkIfBinary(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);

  // Check first 5 bytes for "solid" (ASCII format)
  const header = String.fromCharCode(...view.slice(0, 5));
  if (header === 'solid') {
    // Could still be binary with "solid" in header
    // Check if file size matches binary format
    const uint32View = new Uint32Array(buffer, 80, 1);
    const triangleCount = uint32View[0];
    const expectedSize = 80 + 4 + (triangleCount * 50);
    return buffer.byteLength === expectedSize;
  }

  return true;
}

/**
 * Parse Binary STL format
 */
function parseBinarySTL(buffer: ArrayBuffer): STLData {
  const view = new DataView(buffer);

  // Read number of triangles (at byte 80)
  const triangleCount = view.getUint32(80, true);

  const vertices: Array<[number, number, number]> = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalSurfaceArea = 0;

  // Each triangle: 50 bytes (12 floats + 2 bytes attribute)
  // Start at byte 84
  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    // Normal vector (bytes 0-11, not used for our calculations)
    // const nx = view.getFloat32(offset, true);
    // const ny = view.getFloat32(offset + 4, true);
    // const nz = view.getFloat32(offset + 8, true);

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
    totalSurfaceArea += calculateTriangleArea(v1, v2, v3);
  }

  // Calculate volume using divergence theorem
  const volume = calculateVolume(vertices);

  return {
    vertices: vertices.length,
    triangles: triangleCount,
    volume: Math.abs(volume) / 1000, // Convert mm³ to cm³
    surfaceArea: totalSurfaceArea / 100, // Convert mm² to cm²
    boundingBox: {
      x: (maxX - minX) / 10, // Convert mm to cm
      y: (maxY - minY) / 10,
      z: (maxZ - minZ) / 10,
    },
    isValid: triangleCount > 0 && volume > 0,
  };
}

/**
 * Parse ASCII STL format
 */
function parseASCIISTL(buffer: ArrayBuffer): STLData {
  const text = new TextDecoder().decode(buffer);
  const lines = text.split('\n').map(line => line.trim());

  const vertices: Array<[number, number, number]> = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalSurfaceArea = 0;
  let triangleCount = 0;

  let currentTriangle: Array<[number, number, number]> = [];

  for (const line of lines) {
    if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

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
        totalSurfaceArea += calculateTriangleArea(
          currentTriangle[0],
          currentTriangle[1],
          currentTriangle[2]
        );
        triangleCount++;
        currentTriangle = [];
      }
    }
  }

  const volume = calculateVolume(vertices);

  return {
    vertices: vertices.length,
    triangles: triangleCount,
    volume: Math.abs(volume) / 1000, // Convert mm³ to cm³
    surfaceArea: totalSurfaceArea / 100, // Convert mm² to cm²
    boundingBox: {
      x: (maxX - minX) / 10, // Convert mm to cm
      y: (maxY - minY) / 10,
      z: (maxZ - minZ) / 10,
    },
    isValid: triangleCount > 0 && volume > 0,
  };
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
    p1[0] * (p2[1] * p3[2] - p2[2] * p3[1]) -
    p1[1] * (p2[0] * p3[2] - p2[2] * p3[0]) +
    p1[2] * (p2[0] * p3[1] - p2[1] * p3[0])
  ) / 6;
}

/**
 * Validate STL data
 */
export function validateSTLData(data: STLData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.triangles === 0) {
    errors.push('STL file contains no triangles');
  }

  if (data.volume <= 0) {
    errors.push('Invalid volume calculation');
  }

  if (data.surfaceArea <= 0) {
    errors.push('Invalid surface area calculation');
  }

  if (data.boundingBox.x <= 0 || data.boundingBox.y <= 0 || data.boundingBox.z <= 0) {
    errors.push('Invalid bounding box dimensions');
  }

  // Check for reasonable dimensions (not too large)
  const maxDimension = Math.max(data.boundingBox.x, data.boundingBox.y, data.boundingBox.z);
  if (maxDimension > 100) { // 100 cm = 1 meter
    errors.push(`Model is very large (${maxDimension.toFixed(2)} cm). Please verify dimensions.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
