/**
 * Test utilities for generating STL files for testing
 */

/**
 * Generate a binary STL cube
 */
export function generateBinarySTLCube(size: number = 10): ArrayBuffer {
  const triangles = 12; // 6 faces × 2 triangles per face
  const headerSize = 80;
  const countSize = 4;
  const triangleSize = 50;
  const totalSize = headerSize + countSize + triangles * triangleSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Write header (80 bytes)
  const header = 'Binary STL Cube Test File';
  for (let i = 0; i < header.length && i < 80; i++) {
    view.setUint8(i, header.charCodeAt(i));
  }

  // Write triangle count
  view.setUint32(80, triangles, true);

  const half = size / 2;

  // Define cube vertices
  const vertices = [
    // Front face (z = half)
    [-half, -half, half],
    [half, -half, half],
    [half, half, half],
    [-half, half, half],
    // Back face (z = -half)
    [-half, -half, -half],
    [half, -half, -half],
    [half, half, -half],
    [-half, half, -half],
  ];

  // Define triangles (2 per face)
  const triangleIndices = [
    // Front
    [0, 1, 2],
    [0, 2, 3],
    // Right
    [1, 5, 6],
    [1, 6, 2],
    // Back
    [5, 4, 7],
    [5, 7, 6],
    // Left
    [4, 0, 3],
    [4, 3, 7],
    // Top
    [3, 2, 6],
    [3, 6, 7],
    // Bottom
    [4, 5, 1],
    [4, 1, 0],
  ];

  let offset = 84;
  for (const [i1, i2, i3] of triangleIndices) {
    const v1 = vertices[i1];
    const v2 = vertices[i2];
    const v3 = vertices[i3];

    // Calculate normal
    const ax = v2[0] - v1[0];
    const ay = v2[1] - v1[1];
    const az = v2[2] - v1[2];
    const bx = v3[0] - v1[0];
    const by = v3[1] - v1[1];
    const bz = v3[2] - v1[2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    // Write normal
    view.setFloat32(offset, nx / len, true);
    view.setFloat32(offset + 4, ny / len, true);
    view.setFloat32(offset + 8, nz / len, true);

    // Write vertices
    view.setFloat32(offset + 12, v1[0], true);
    view.setFloat32(offset + 16, v1[1], true);
    view.setFloat32(offset + 20, v1[2], true);

    view.setFloat32(offset + 24, v2[0], true);
    view.setFloat32(offset + 28, v2[1], true);
    view.setFloat32(offset + 32, v2[2], true);

    view.setFloat32(offset + 36, v3[0], true);
    view.setFloat32(offset + 40, v3[1], true);
    view.setFloat32(offset + 44, v3[2], true);

    // Attribute byte count (usually 0)
    view.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return buffer;
}

/**
 * Generate an ASCII STL cube
 */
export function generateASCIISTLCube(size: number = 10): ArrayBuffer {
  const half = size / 2;

  const stl = `solid cube
  facet normal 0 0 1
    outer loop
      vertex ${-half} ${-half} ${half}
      vertex ${half} ${-half} ${half}
      vertex ${half} ${half} ${half}
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex ${-half} ${-half} ${half}
      vertex ${half} ${half} ${half}
      vertex ${-half} ${half} ${half}
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex ${half} ${-half} ${half}
      vertex ${half} ${-half} ${-half}
      vertex ${half} ${half} ${-half}
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex ${half} ${-half} ${half}
      vertex ${half} ${half} ${-half}
      vertex ${half} ${half} ${half}
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex ${half} ${-half} ${-half}
      vertex ${-half} ${-half} ${-half}
      vertex ${-half} ${half} ${-half}
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex ${half} ${-half} ${-half}
      vertex ${-half} ${half} ${-half}
      vertex ${half} ${half} ${-half}
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex ${-half} ${-half} ${-half}
      vertex ${-half} ${-half} ${half}
      vertex ${-half} ${half} ${half}
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex ${-half} ${-half} ${-half}
      vertex ${-half} ${half} ${half}
      vertex ${-half} ${half} ${-half}
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex ${-half} ${half} ${half}
      vertex ${half} ${half} ${half}
      vertex ${half} ${half} ${-half}
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex ${-half} ${half} ${half}
      vertex ${half} ${half} ${-half}
      vertex ${-half} ${half} ${-half}
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex ${-half} ${-half} ${-half}
      vertex ${half} ${-half} ${-half}
      vertex ${half} ${-half} ${half}
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex ${-half} ${-half} ${-half}
      vertex ${half} ${-half} ${half}
      vertex ${-half} ${-half} ${half}
    endloop
  endfacet
endsolid cube`;

  return new TextEncoder().encode(stl).buffer;
}

/**
 * Generate a corrupted binary STL (wrong triangle count)
 */
export function generateCorruptedBinarySTL(): ArrayBuffer {
  const buffer = new ArrayBuffer(200);
  const view = new DataView(buffer);

  // Write invalid triangle count
  view.setUint32(80, 999999999, true);

  return buffer;
}

/**
 * Generate an empty file
 */
export function generateEmptyFile(): ArrayBuffer {
  return new ArrayBuffer(0);
}

/**
 * Generate a file that's too small
 */
export function generateTooSmallFile(): ArrayBuffer {
  return new ArrayBuffer(50);
}

/**
 * Generate a binary STL with NaN values
 */
export function generateBinarySTLWithNaN(): ArrayBuffer {
  const buffer = generateBinarySTLCube(10);
  const view = new DataView(buffer);

  // Corrupt the first vertex with NaN
  view.setFloat32(96, NaN, true);

  return buffer;
}

/**
 * Generate an ASCII STL with invalid vertices
 */
export function generateASCIISTLWithInvalidVertices(): ArrayBuffer {
  const stl = `solid test
  facet normal 0 0 1
    outer loop
      vertex NaN NaN NaN
      vertex 10 0 0
      vertex 10 10 0
    endloop
  endfacet
endsolid test`;

  return new TextEncoder().encode(stl).buffer;
}

/**
 * Generate a malformed ASCII STL (missing endsolid)
 */
export function generateMalformedASCIISTL(): ArrayBuffer {
  const stl = `solid test
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 10 10 0
    endloop
  endfacet`;

  return new TextEncoder().encode(stl).buffer;
}

/**
 * Generate a binary STL that starts with "solid" (edge case)
 */
export function generateBinarySTLStartingWithSolid(): ArrayBuffer {
  const buffer = generateBinarySTLCube(10);
  const view = new DataView(buffer);

  // Write "solid" to the beginning
  const solid = 'solid';
  for (let i = 0; i < solid.length; i++) {
    view.setUint8(i, solid.charCodeAt(i));
  }

  return buffer;
}
