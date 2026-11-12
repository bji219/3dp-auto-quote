'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelPreviewProps {
  /** Flat triangle soup, 9 floats per triangle, as returned by parseStl. */
  triangles: Float32Array;
  /** Which model axis is "up" on the build plate: [axis, sign]. Defaults to +Z. */
  up?: [0 | 1 | 2, 1 | -1];
  className?: string;
}

/** Rotation that takes the chosen model axis to three.js "up" (+Y). */
function upRotation(up: [0 | 1 | 2, 1 | -1]): THREE.Quaternion {
  const from = new THREE.Vector3();
  from.setComponent(up[0], up[1]);
  return new THREE.Quaternion().setFromUnitVectors(from, new THREE.Vector3(0, 1, 0));
}

export default function ModelPreview({ triangles, up = [2, 1], className }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const upKey = `${up[0]}:${up[1]}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(triangles, 3));
    geometry.applyQuaternion(upRotation(up));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as THREE.Box3;
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    // Sit the part on the plate, centred.
    geometry.translate(-centre.x, -box.min.y, -centre.z);

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xc8643c,
        roughness: 0.62,
        metalness: 0.05,
        flatShading: true,
      })
    );
    scene.add(mesh);

    const span = Math.max(size.x, size.y, size.z, 1);
    const plate = Math.max(size.x, size.z) * 1.6 + 20;
    const step = plate > 400 ? 50 : plate > 80 ? 10 : 5;
    const cells = Math.max(2, Math.ceil(plate / step));
    const grid = new THREE.GridHelper(cells * step, cells, 0x5a7284, 0x24394a);
    scene.add(grid);

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x0b2030, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4dd, 0.6);
    rim.position.set(-2, 1, -1);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(35, width / height, span / 100, span * 50);
    const dist = (span * 1.25) / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(dist * 0.62, size.y / 2 + dist * 0.42, dist * 0.62);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, size.y / 2, 0);
    controls.enableDamping = true;
    controls.minDistance = span * 0.3;
    controls.maxDistance = span * 12;
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 0.8;
    const stopSpin = () => (controls.autoRotate = false);
    renderer.domElement.addEventListener('pointerdown', stopSpin);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', stopSpin);
      controls.dispose();
      geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      grid.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
    // `up` is captured through upKey so a new array each render does not rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triangles, upKey]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
        aria-label="3D preview of the uploaded model"
        role="img"
      />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#a8b2bc]">
          3D preview is unavailable in this browser. Your quote is unaffected.
        </p>
      )}
    </div>
  );
}
