"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Product3DViewerProps {
  modelUrl?: string;
  model3d?: string;
}

export default function Product3DViewer({
  modelUrl,
  model3d,
}: Product3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actualModelUrl = model3d || modelUrl;
  const missingModel = !actualModelUrl;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || missingModel) {
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    try {
      // 🔧 Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);

      // 🔧 Camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 2;

      // 🔧 Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      // 🔧 Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      scene.add(directionalLight);

      // 🔧 Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 3;

      // 🔧 Load model
      const loader = new GLTFLoader();

      console.log(`[3D] Loading model from: ${actualModelUrl}`);

      loader.load(
        actualModelUrl,
        (gltf) => {
          console.log(`[3D] Model loaded successfully:`, gltf);

          const model = gltf.scene;

          // 🔧 Auto-scale model
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;

          model.scale.multiplyScalar(scale);
          model.position.copy(
            box.getCenter(new THREE.Vector3()).multiplyScalar(-scale)
          );

          scene.add(model);
          setLoading(false);
          setError(null);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`[3D] Loading progress: ${percent.toFixed(0)}%`);
        },
        (err) => {
          console.error(`[3D] Model loading error:`, err);
          setError(
            `Failed to load 3D model.\nCheck:\n1. Model URL: ${actualModelUrl}\n2. CORS enabled\n3. File format: glTF/glb\n4. WebGL support`
          );
          setLoading(false);
        }
      );

      // 🔧 Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 🔧 Handle resize
      const handleResize = () => {
        const newWidth = containerRef.current?.clientWidth || width;
        const newHeight = containerRef.current?.clientHeight || height;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (err) {
      console.error("[3D] Setup error:", err);
      queueMicrotask(() => {
        setError("Failed to initialize 3D viewer");
        setLoading(false);
      });
    }
  }, [actualModelUrl]);

  const displayError = missingModel ? "No model URL provided" : error;

  return (
    <div className="w-full h-96 relative bg-gray-100 rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {loading && !displayError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">Đang tải mô hình 3D...</p>
          </div>
        </div>
      )}

      {displayError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-4">
          <div className="text-center">
            <p className="text-red-600 text-xs whitespace-pre-wrap font-mono mb-4">
              {displayError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
