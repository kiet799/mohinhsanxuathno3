import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraPreset, EquipmentId, SimulationParams } from '../../types/simulation';
import { buildHaberPlant, PlantModelResult } from './HaberPlantModel';
import { FlowParticleSystem } from './FlowParticles';
import { createLedDisplayTexture } from './ProceduralTextures';

interface ThreeViewportProps {
  params: SimulationParams;
  selectedEquipment: EquipmentId | null;
  onSelectEquipment: (id: EquipmentId | null) => void;
  cameraPreset: CameraPreset;
}

// Module-scope pre-allocated helpers for zero-GC render loop
const _vec3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  params,
  selectedEquipment,
  onSelectEquipment,
  cameraPreset,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const presetRef = useRef(cameraPreset);
  presetRef.current = cameraPreset;

  const onSelectEquipmentRef = useRef(onSelectEquipment);
  onSelectEquipmentRef.current = onSelectEquipment;

  const lastPressureRef = useRef(params.pressureBar);
  const lastTempRef = useRef(params.temperatureC);

  const internalStateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    plant: PlantModelResult;
    flowParticles: FlowParticleSystem;
    animFrameId: number;
    clock: THREE.Clock;
    targetCamPos: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    hoveredId: EquipmentId | null;
    floatingDust: THREE.Points;
  } | null>(null);

  // Camera preset coordinates [x, y, z] and lookAt [x, y, z]
  const PRESET_COORDS: Record<CameraPreset, { pos: [number, number, number]; look: [number, number, number] }> = {
    overview: { pos: [1.2, 7.8, 16.5], look: [1.2, 2.2, 0] },
    feed: { pos: [-8.0, 3.8, 6.2], look: [-8.0, 1.8, 0] },
    compressor: { pos: [-3.8, 3.2, 5.8], look: [-3.8, 1.4, 0] },
    reactor: { pos: [0.8, 4.4, 7.0], look: [0.8, 2.8, 0] },
    condenser: { pos: [5.2, 3.6, 6.2], look: [5.2, 2.0, 0] },
    separator: { pos: [10.2, 3.6, 7.0], look: [10.2, 2.0, 0] },
    recycle: { pos: [2.5, 9.2, 13.0], look: [2.5, 5.0, 0] },
    topdown: { pos: [1.5, 19.5, 0.1], look: [1.5, 0, 0] },
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14); // Deep Midnight Charcoal
    scene.fog = new THREE.Fog(0x080c14, 16, 50);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    const initialPreset = PRESET_COORDS[cameraPreset] || PRESET_COORDS.overview;
    camera.position.set(...initialPreset.pos);

    // 3. Renderer with PBR color management
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Procedural Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going below ground
    controls.minDistance = 2.5;
    controls.maxDistance = 38;
    controls.target.set(...initialPreset.look);

    // 6. Cinematic Multi-Layer Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85); // Teal sky, dark slate ground
    scene.add(hemiLight);

    // Key Light (Warm golden industrial floodlight)
    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(14, 20, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 50;
    const shadowD = 16;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.018;
    scene.add(keyLight);

    // Cool Cyan Rim Light (from opposite angle)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-16, 14, -12);
    scene.add(rimLight);

    // Warm Reflected Fill Light
    const fillLight = new THREE.DirectionalLight(0xf59e0b, 0.4);
    fillLight.position.set(0, -5, 10);
    scene.add(fillLight);

    // Accent Underglow Lights
    const cyanUnderglow = new THREE.PointLight(0x06b6d4, 1.2, 10);
    cyanUnderglow.position.set(-3.8, 0.4, 2.0);
    scene.add(cyanUnderglow);

    const amberUnderglow = new THREE.PointLight(0xf59e0b, 1.2, 10);
    amberUnderglow.position.set(9.5, 0.4, 2.0);
    scene.add(amberUnderglow);

    // Soft Contact Shadow Plane directly under equipment
    const contactShadowGeo = new THREE.PlaneGeometry(28, 10);
    const contactCanvas = document.createElement('canvas');
    contactCanvas.width = 256;
    contactCanvas.height = 128;
    const sCtx = contactCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 120);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 128);
    const contactTex = new THREE.CanvasTexture(contactCanvas);
    contactTex.colorSpace = THREE.SRGBColorSpace;
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(1.5, -0.22, 0);
    scene.add(contactShadow);

    // 7. Atmospheric Floating Sparkles / Dust Motes
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 26;
      dustPositions[i * 3 + 1] = Math.random() * 8 + 0.5;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.4,
    });
    const floatingDust = new THREE.Points(dustGeo, dustMat);
    scene.add(floatingDust);

    // 8. Procedural Plant Model
    const plant = buildHaberPlant();
    scene.add(plant.rootGroup);

    // 9. Flow Particles
    const flowParticles = new FlowParticleSystem(plant.pipes);
    scene.add(flowParticles.group);

    // Warm-up shaders
    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    const targetCamPos = new THREE.Vector3(...initialPreset.pos);
    const targetLookAt = new THREE.Vector3(...initialPreset.look);

    internalStateRef.current = {
      renderer,
      scene,
      camera,
      controls,
      plant,
      flowParticles,
      animFrameId: 0,
      clock,
      targetCamPos,
      targetLookAt,
      hoveredId: null,
      floatingDust,
    };

    // 10. Animation Loop
    let flywheelAngle = 0;
    const animate = () => {
      internalStateRef.current!.animFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const curParams = paramsRef.current;

      // Spin compressor flywheel & motor fan when active
      if (!curParams.isPaused) {
        flywheelAngle += delta * 12 * curParams.simSpeed;
        plant.compressorFlywheel.rotation.z = flywheelAngle;
        if (plant.compressorFan) {
          plant.compressorFan.rotation.x += delta * 24 * curParams.simSpeed;
        }
      }

      // Update particle flows
      flowParticles.update(delta, curParams.simSpeed, curParams.isPaused);
      flowParticles.setVisible(curParams.showParticles);

      // Subtle float of dust motes
      const dPos = floatingDust.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dPos[i * 3 + 1] += delta * 0.15;
        if (dPos[i * 3 + 1] > 8.5) {
          dPos[i * 3 + 1] = 0.5;
        }
      }
      floatingDust.geometry.attributes.position.needsUpdate = true;

      // Smooth camera interpolation toward preset target
      const dampFactor = 4.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, dampFactor, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, dampFactor, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, dampFactor, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLookAt.x, dampFactor, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLookAt.y, dampFactor, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLookAt.z, dampFactor, delta);
      controls.update();

      // Update plant materials (x-ray cutaway, reactor heat, liquid level)
      plant.updateMaterials(curParams.xrayCutaway, curParams.temperatureC, curParams.pressureBar);

      // Dynamic update of LED displays if pressure or temp changed
      if (lastPressureRef.current !== curParams.pressureBar && plant.ledDisplayMesh) {
        lastPressureRef.current = curParams.pressureBar;
        plant.ledDisplayMesh.material = new THREE.MeshBasicMaterial({
          map: createLedDisplayTexture(`${curParams.pressureBar.toFixed(1)} BAR`),
        });
      }
      if (lastTempRef.current !== curParams.temperatureC && plant.tempLedDisplayMesh) {
        lastTempRef.current = curParams.temperatureC;
        plant.tempLedDisplayMesh.material = new THREE.MeshBasicMaterial({
          map: createLedDisplayTexture(`${curParams.temperatureC} °C [${curParams.catalystActive ? 'Fe' : 'No Cat'}]`),
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // 11. Pointer Raycasting for Click & Hover on 3D Equipment
    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const intersects = _raycaster.intersectObjects(plant.equipmentHitboxes);

      if (intersects.length > 0) {
        const id = intersects[0].object.userData.equipmentId as EquipmentId;
        if (id) {
          onSelectEquipmentRef.current(id);
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);

    // 12. Resize handling
    const handleResize = () => {
      if (!mountRef.current || !internalStateRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      if (internalStateRef.current) {
        cancelAnimationFrame(internalStateRef.current.animFrameId);
        controls.dispose();
        renderer.dispose();
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Camera Target when cameraPreset prop changes
  useEffect(() => {
    if (!internalStateRef.current) return;
    const preset = PRESET_COORDS[cameraPreset] || PRESET_COORDS.overview;
    internalStateRef.current.targetCamPos.set(...preset.pos);
    internalStateRef.current.targetLookAt.set(...preset.look);
  }, [cameraPreset]);

  // If selectedEquipment changes externally, focus camera smoothly
  useEffect(() => {
    if (!internalStateRef.current || !selectedEquipment) return;
    const presetKey = selectedEquipment === 'feed_storage' ? 'feed'
      : selectedEquipment === 'compressor' ? 'compressor'
      : selectedEquipment === 'reactor' ? 'reactor'
      : selectedEquipment === 'condenser' ? 'condenser'
      : selectedEquipment === 'separator' ? 'separator'
      : selectedEquipment === 'recycle_loop' ? 'recycle'
      : 'overview';
    const preset = PRESET_COORDS[presetKey];
    if (preset) {
      internalStateRef.current.targetCamPos.set(...preset.pos);
      internalStateRef.current.targetLookAt.set(...preset.look);
    }
  }, [selectedEquipment]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Equipment Label Badges (when enabled) */}
      {params.showLabels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Legend Guide Pills */}
          <div className="absolute top-20 left-6 flex flex-col gap-1.5 pointer-events-auto">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Các Cụm Thiết Bị Chính
            </div>
            <button
              onClick={() => onSelectEquipment('feed_storage')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-blue-500/30 text-xs text-blue-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              1. Khối nạp khí (N₂ + 3H₂)
            </button>
            <button
              onClick={() => onSelectEquipment('compressor')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              2. Máy nén cao áp (200 bar)
            </button>
            <button
              onClick={() => onSelectEquipment('reactor')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-rose-500/30 text-xs text-rose-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              3. Tháp phản ứng (450°C, Fe)
            </button>
            <button
              onClick={() => onSelectEquipment('condenser')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-cyan-500/30 text-xs text-cyan-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              4. Thiết bị ngưng tụ (-33°C)
            </button>
            <button
              onClick={() => onSelectEquipment('separator')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-amber-500/30 text-xs text-amber-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              5. Tách & Bồn cầu NH₃ lỏng
            </button>
            <button
              onClick={() => onSelectEquipment('recycle_loop')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/85 border border-purple-500/30 text-xs text-purple-300 hover:bg-slate-800 transition text-left backdrop-blur-sm shadow-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              6. Tuyến tuần hoàn khí (98%)
            </button>
          </div>

          {/* Instruction Tooltip */}
          <div className="absolute top-20 right-6 px-3 py-2 rounded-xl bg-slate-900/85 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm pointer-events-auto shadow-lg">
            <span className="text-slate-400">Điều hướng 3D:</span> Kéo chuột trái để <strong className="text-white">Xoay</strong>, chuột phải để <strong className="text-white">Trượt</strong>, cuộn để <strong className="text-white">Phóng to</strong>. Nhấp vào thiết bị để mở hồ sơ kỹ thuật.
          </div>
        </div>
      )}
    </div>
  );
};
