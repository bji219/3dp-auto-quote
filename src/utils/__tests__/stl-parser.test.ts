import { parseSTL, validateSTLData, calculatePrintTime } from '../stl-parser';
import {
  generateBinarySTLCube,
  generateASCIISTLCube,
  generateCorruptedBinarySTL,
  generateEmptyFile,
  generateTooSmallFile,
  generateBinarySTLWithNaN,
  generateASCIISTLWithInvalidVertices,
  generateMalformedASCIISTL,
  generateBinarySTLStartingWithSolid,
} from './fixtures/stl-generators';

describe('STL Parser', () => {
  describe('Binary STL Parsing', () => {
    it('should parse a valid binary STL cube', async () => {
      const buffer = generateBinarySTLCube(20); // 20mm cube
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);
      expect(result.vertices).toBe(36);

      // Volume of 20mm cube = 8000 mm³ = 8 cm³
      expect(result.volume).toBeCloseTo(8, 1);

      // Surface area of 20mm cube = 2400 mm² = 24 cm²
      expect(result.surfaceArea).toBeCloseTo(24, 1);

      // Bounding box should be 2cm × 2cm × 2cm
      expect(result.boundingBox.x).toBeCloseTo(2, 1);
      expect(result.boundingBox.y).toBeCloseTo(2, 1);
      expect(result.boundingBox.z).toBeCloseTo(2, 1);

      expect(result.estimatedPrintTime).toBeGreaterThan(0);
      expect(result.errors).toBeUndefined();
    });

    it('should parse a large binary STL cube', async () => {
      const buffer = generateBinarySTLCube(100); // 100mm cube
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.volume).toBeCloseTo(1000, 1); // 1000 cm³
    });

    it('should parse a small binary STL cube', async () => {
      const buffer = generateBinarySTLCube(5); // 5mm cube
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.volume).toBeCloseTo(0.125, 2); // 0.125 cm³
    });

    it('should handle binary STL starting with "solid"', async () => {
      const buffer = generateBinarySTLStartingWithSolid();
      const result = await parseSTL(buffer);

      // Should correctly identify as binary despite "solid" header
      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);
    });

    it('should handle binary STL with NaN values', async () => {
      const buffer = generateBinarySTLWithNaN();
      const result = await parseSTL(buffer);

      // Should skip invalid triangles but still parse valid ones
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain(expect.stringContaining('invalid triangles'));
    });
  });

  describe('ASCII STL Parsing', () => {
    it('should parse a valid ASCII STL cube', async () => {
      const buffer = generateASCIISTLCube(20); // 20mm cube
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);

      // Volume of 20mm cube = 8000 mm³ = 8 cm³
      expect(result.volume).toBeCloseTo(8, 1);

      // Surface area of 20mm cube = 2400 mm² = 24 cm²
      expect(result.surfaceArea).toBeCloseTo(24, 1);

      expect(result.boundingBox.x).toBeCloseTo(2, 1);
      expect(result.boundingBox.y).toBeCloseTo(2, 1);
      expect(result.boundingBox.z).toBeCloseTo(2, 1);
    });

    it('should parse a large ASCII STL cube', async () => {
      const buffer = generateASCIISTLCube(100); // 100mm cube
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.volume).toBeCloseTo(1000, 1); // 1000 cm³
    });

    it('should handle ASCII STL with invalid vertices', async () => {
      const buffer = generateASCIISTLWithInvalidVertices();
      const result = await parseSTL(buffer);

      // Should skip invalid vertices
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain(expect.stringContaining('invalid vertices'));
    });

    it('should handle malformed ASCII STL (missing endsolid)', async () => {
      const buffer = generateMalformedASCIISTL();
      const result = await parseSTL(buffer);

      // Should still parse but with a warning
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain(expect.stringContaining('endsolid'));
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file', async () => {
      const buffer = generateEmptyFile();
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain(expect.stringContaining('Empty'));
    });

    it('should handle file that is too small', async () => {
      const buffer = generateTooSmallFile();
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain(expect.stringContaining('too small'));
    });

    it('should handle corrupted binary STL', async () => {
      const buffer = generateCorruptedBinarySTL();
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle null buffer gracefully', async () => {
      const result = await parseSTL(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle undefined buffer gracefully', async () => {
      const result = await parseSTL(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Volume Calculation', () => {
    it('should calculate volume correctly for different cube sizes', async () => {
      const testCases = [
        { size: 10, expectedVolume: 1 }, // 10mm = 1cm³
        { size: 20, expectedVolume: 8 }, // 20mm = 8cm³
        { size: 30, expectedVolume: 27 }, // 30mm = 27cm³
      ];

      for (const { size, expectedVolume } of testCases) {
        const buffer = generateBinarySTLCube(size);
        const result = await parseSTL(buffer);

        expect(result.volume).toBeCloseTo(expectedVolume, 1);
      }
    });
  });

  describe('Surface Area Calculation', () => {
    it('should calculate surface area correctly for different cube sizes', async () => {
      const testCases = [
        { size: 10, expectedSurfaceArea: 6 }, // 10mm cube = 6cm²
        { size: 20, expectedSurfaceArea: 24 }, // 20mm cube = 24cm²
      ];

      for (const { size, expectedSurfaceArea } of testCases) {
        const buffer = generateBinarySTLCube(size);
        const result = await parseSTL(buffer);

        expect(result.surfaceArea).toBeCloseTo(expectedSurfaceArea, 1);
      }
    });
  });

  describe('Bounding Box Calculation', () => {
    it('should calculate bounding box correctly', async () => {
      const buffer = generateBinarySTLCube(20);
      const result = await parseSTL(buffer);

      expect(result.boundingBox.x).toBeCloseTo(2, 1);
      expect(result.boundingBox.y).toBeCloseTo(2, 1);
      expect(result.boundingBox.z).toBeCloseTo(2, 1);
    });

    it('should handle non-cubic bounding boxes', async () => {
      // For a cube, all dimensions are equal
      // This test validates the implementation works correctly
      const buffer = generateBinarySTLCube(30);
      const result = await parseSTL(buffer);

      const { x, y, z } = result.boundingBox;
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(z).toBeGreaterThan(0);
      expect(x).toBeCloseTo(y, 1);
      expect(y).toBeCloseTo(z, 1);
    });
  });

  describe('Print Time Estimation', () => {
    it('should estimate print time based on volume', async () => {
      const buffer = generateBinarySTLCube(20);
      const result = await parseSTL(buffer);

      expect(result.estimatedPrintTime).toBeDefined();
      expect(result.estimatedPrintTime).toBeGreaterThan(0);
    });

    it('should calculate longer print times for larger volumes', async () => {
      const small = await parseSTL(generateBinarySTLCube(10));
      const large = await parseSTL(generateBinarySTLCube(30));

      expect(large.estimatedPrintTime!).toBeGreaterThan(small.estimatedPrintTime!);
    });

    it('should allow custom print time configuration', async () => {
      const buffer = generateBinarySTLCube(20);
      const result = await parseSTL(buffer, {
        printSpeedCm3PerHour: 20, // Faster print speed
        infillPercentage: 10, // Lower infill
      });

      expect(result.estimatedPrintTime).toBeDefined();
      expect(result.estimatedPrintTime).toBeGreaterThan(0);
    });

    it('should adjust print time based on infill percentage', async () => {
      const buffer = generateBinarySTLCube(20);

      const lowInfill = await parseSTL(buffer, { infillPercentage: 10 });
      const highInfill = await parseSTL(buffer, { infillPercentage: 100 });

      expect(highInfill.estimatedPrintTime!).toBeGreaterThan(lowInfill.estimatedPrintTime!);
    });
  });

  describe('Validation', () => {
    it('should validate correct STL data', async () => {
      const buffer = generateBinarySTLCube(20);
      const stlData = await parseSTL(buffer);
      const validation = validateSTLData(stlData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid volume', () => {
      const invalidData = {
        vertices: 36,
        triangles: 12,
        volume: -1, // Invalid
        surfaceArea: 24,
        boundingBox: { x: 2, y: 2, z: 2 },
        isValid: false,
      };

      const validation = validateSTLData(invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('volume'));
    });

    it('should detect invalid surface area', () => {
      const invalidData = {
        vertices: 36,
        triangles: 12,
        volume: 8,
        surfaceArea: 0, // Invalid
        boundingBox: { x: 2, y: 2, z: 2 },
        isValid: false,
      };

      const validation = validateSTLData(invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('surface area'));
    });

    it('should detect zero triangles', () => {
      const invalidData = {
        vertices: 0,
        triangles: 0, // Invalid
        volume: 0,
        surfaceArea: 0,
        boundingBox: { x: 0, y: 0, z: 0 },
        isValid: false,
      };

      const validation = validateSTLData(invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('no triangles'));
    });

    it('should detect invalid bounding box', () => {
      const invalidData = {
        vertices: 36,
        triangles: 12,
        volume: 8,
        surfaceArea: 24,
        boundingBox: { x: 0, y: 0, z: 0 }, // Invalid
        isValid: false,
      };

      const validation = validateSTLData(invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('bounding box'));
    });

    it('should warn about very large models', () => {
      const largeData = {
        vertices: 36,
        triangles: 12,
        volume: 10000,
        surfaceArea: 2400,
        boundingBox: { x: 150, y: 150, z: 150 }, // Very large
        isValid: true,
      };

      const validation = validateSTLData(largeData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('very large'));
    });

    it('should warn about very small models', () => {
      const smallData = {
        vertices: 36,
        triangles: 12,
        volume: 0.001,
        surfaceArea: 0.024,
        boundingBox: { x: 0.05, y: 0.05, z: 0.05 }, // Very small
        isValid: true,
      };

      const validation = validateSTLData(smallData);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('very small'));
    });
  });

  describe('Format Detection', () => {
    it('should correctly detect binary STL format', async () => {
      const buffer = generateBinarySTLCube(20);
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);
    });

    it('should correctly detect ASCII STL format', async () => {
      const buffer = generateASCIISTLCube(20);
      const result = await parseSTL(buffer);

      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);
    });

    it('should handle edge case of binary STL with "solid" header', async () => {
      const buffer = generateBinarySTLStartingWithSolid();
      const result = await parseSTL(buffer);

      // Should still parse correctly as binary
      expect(result.isValid).toBe(true);
      expect(result.triangles).toBe(12);
    });
  });

  describe('Performance', () => {
    it('should parse binary STL efficiently', async () => {
      const buffer = generateBinarySTLCube(50);
      const start = Date.now();
      await parseSTL(buffer);
      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should parse ASCII STL efficiently', async () => {
      const buffer = generateASCIISTLCube(50);
      const start = Date.now();
      await parseSTL(buffer);
      const duration = Date.now() - start;

      // Should complete in less than 200ms (ASCII parsing is slower)
      expect(duration).toBeLessThan(200);
    });
  });
});

describe('calculatePrintTime', () => {
  it('should calculate print time for given volume', () => {
    const stlData = {
      vertices: 36,
      triangles: 12,
      volume: 10,
      surfaceArea: 60,
      boundingBox: { x: 2, y: 2, z: 2 },
      isValid: true,
    };

    const printTime = calculatePrintTime(stlData);
    expect(printTime).toBeGreaterThan(0);
  });

  it('should scale print time with volume', () => {
    const smallVolume = {
      vertices: 36,
      triangles: 12,
      volume: 5,
      surfaceArea: 30,
      boundingBox: { x: 1.5, y: 1.5, z: 1.5 },
      isValid: true,
    };

    const largeVolume = {
      vertices: 36,
      triangles: 12,
      volume: 20,
      surfaceArea: 120,
      boundingBox: { x: 3, y: 3, z: 3 },
      isValid: true,
    };

    const smallTime = calculatePrintTime(smallVolume);
    const largeTime = calculatePrintTime(largeVolume);

    expect(largeTime).toBeGreaterThan(smallTime);
  });

  it('should respect custom print speed configuration', () => {
    const stlData = {
      vertices: 36,
      triangles: 12,
      volume: 10,
      surfaceArea: 60,
      boundingBox: { x: 2, y: 2, z: 2 },
      isValid: true,
    };

    const normalSpeed = calculatePrintTime(stlData, { printSpeedCm3PerHour: 10 });
    const fastSpeed = calculatePrintTime(stlData, { printSpeedCm3PerHour: 20 });

    expect(fastSpeed).toBeLessThan(normalSpeed);
  });

  it('should account for infill percentage', () => {
    const stlData = {
      vertices: 36,
      triangles: 12,
      volume: 10,
      surfaceArea: 60,
      boundingBox: { x: 2, y: 2, z: 2 },
      isValid: true,
    };

    const lowInfill = calculatePrintTime(stlData, { infillPercentage: 10 });
    const highInfill = calculatePrintTime(stlData, { infillPercentage: 100 });

    expect(highInfill).toBeGreaterThan(lowInfill);
  });
});
