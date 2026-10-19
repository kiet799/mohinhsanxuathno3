import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Play, RotateCcw, Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface MolecularViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReactionStage = 'reactants' | 'catalyst_adsorption' | 'products';

export const MolecularViewerModal: React.FC<MolecularViewerModalProps> = ({ isOpen, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<ReactionStage>('reactants');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    moleculeGroup: THREE.Group;
    animFrameId: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      moleculeGroup,
      animFrameId: 0,
    };

    let time = 0;
    const animate = () => {
      sceneRef.current!.animFrameId = requestAnimationFrame(animate);
      time += 0.015;
      controls.update();

      if (autoRotate && moleculeGroup) {
        moleculeGroup.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animFrameId);
        controls.dispose();
        renderer.dispose();
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isOpen]);

  // Re-build 3D Molecules whenever stage changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { moleculeGroup } = sceneRef.current;
    
    // Clear old objects
    while (moleculeGroup.children.length > 0) {
      const obj = moleculeGroup.children[0];
      moleculeGroup.remove(obj);
    }

    // Shared Atom Materials
    const nMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Nitrogen Blue
      roughness: 0.2,
      metalness: 0.3,
    });
    const hMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Hydrogen White
      roughness: 0.2,
      metalness: 0.1,
    });
    const feMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Iron Catalyst Metallic Gray
      roughness: 0.4,
      metalness: 0.85,
    });
    const bondMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.5,
    });
    const lonePairMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
    });

    const createAtom = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: THREE.Vector3) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      return mesh;
    };

    const createCylinder = (p1: THREE.Vector3, p2: THREE.Vector3, radius: number, mat: THREE.Material) => {
      const dist = p1.distanceTo(p2);
      const geo = new THREE.CylinderGeometry(radius, radius, dist, 16);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      return mesh;
    };

    const nGeo = new THREE.SphereGeometry(0.5, 32, 24);
    const hGeo = new THREE.SphereGeometry(0.28, 24, 16);
    const feGeo = new THREE.SphereGeometry(0.42, 24, 16);

    if (stage === 'reactants') {
      // 1. N2 Molecule with Triple Bond (Centered Left)
      const n2Group = new THREE.Group();
      n2Group.position.set(-2.2, 0, 0);

      const n1Pos = new THREE.Vector3(0, -0.65, 0);
      const n2Pos = new THREE.Vector3(0, 0.65, 0);
      n2Group.add(createAtom(nGeo, nMat, n1Pos));
      n2Group.add(createAtom(nGeo, nMat, n2Pos));

      // 3 parallel cylinders for triple bond
      const offsets = [-0.14, 0, 0.14];
      offsets.forEach((ox) => {
        const p1 = n1Pos.clone().add(new THREE.Vector3(ox, 0, 0));
        const p2 = n2Pos.clone().add(new THREE.Vector3(ox, 0, 0));
        n2Group.add(createCylinder(p1, p2, 0.045, bondMat));
      });
      moleculeGroup.add(n2Group);

      // 3x H2 Molecules (Arranged on the Right)
      const h2Positions = [
        new THREE.Vector3(1.8, 1.4, 0),
        new THREE.Vector3(2.4, 0, 0.5),
        new THREE.Vector3(1.8, -1.4, -0.2),
      ];

      h2Positions.forEach((basePos) => {
        const hGroup = new THREE.Group();
        hGroup.position.copy(basePos);
        const p1 = new THREE.Vector3(-0.35, 0, 0);
        const p2 = new THREE.Vector3(0.35, 0, 0);
        hGroup.add(createAtom(hGeo, hMat, p1));
        hGroup.add(createAtom(hGeo, hMat, p2));
        hGroup.add(createCylinder(p1, p2, 0.05, bondMat));
        moleculeGroup.add(hGroup);
      });
    } else if (stage === 'catalyst_adsorption') {
      // 2. Catalytic Cleavage on Iron (Fe) Surface
      // Fe Surface Lattice (Bottom plane)
      const feLattice = new THREE.Group();
      feLattice.position.set(0, -1.2, 0);
      for (let x = -3; x <= 3; x += 1.0) {
        for (let z = -2; z <= 2; z += 1.0) {
          const feAtom = createAtom(feGeo, feMat, new THREE.Vector3(x, 0, z));
          feLattice.add(feAtom);
        }
      }
      moleculeGroup.add(feLattice);

      // Dissociated Nitrogen Atoms adsorbed onto Fe atoms
      const n1 = createAtom(nGeo, nMat, new THREE.Vector3(-1.0, -0.4, 0));
      const n2 = createAtom(nGeo, nMat, new THREE.Vector3(1.0, -0.4, 0));
      moleculeGroup.add(n1);
      moleculeGroup.add(n2);

      // Dotted/attenuated bonds to Fe surface
      moleculeGroup.add(createCylinder(new THREE.Vector3(-1.0, -0.4, 0), new THREE.Vector3(-1.0, -1.2, 0), 0.04, bondMat));
      moleculeGroup.add(createCylinder(new THREE.Vector3(1.0, -0.4, 0), new THREE.Vector3(1.0, -1.2, 0), 0.04, bondMat));

      // Dissociated 6x H atoms migrating on surface
      const hPositions = [
        new THREE.Vector3(-2.0, -0.6, 0.5),
        new THREE.Vector3(-1.5, -0.5, -0.7),
        new THREE.Vector3(-0.3, -0.5, 0.8),
        new THREE.Vector3(0.4, -0.5, -0.8),
        new THREE.Vector3(1.6, -0.5, 0.7),
        new THREE.Vector3(2.2, -0.6, -0.4),
      ];
      hPositions.forEach((hp) => {
        moleculeGroup.add(createAtom(hGeo, hMat, hp));
      });
    } else if (stage === 'products') {
      // 3. Two NH3 Molecules (Trigonal Pyramidal geometry, 107° bond angles)
      const createNH3 = (basePos: THREE.Vector3) => {
        const nh3Group = new THREE.Group();
        nh3Group.position.copy(basePos);

        // Nitrogen atom at apex
        const nPos = new THREE.Vector3(0, 0.4, 0);
        nh3Group.add(createAtom(nGeo, nMat, nPos));

        // Nitrogen Lone Electron Pair orbital lobe (cloud)
        const lonePair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), lonePairMat);
        lonePair.position.set(0, 0.95, 0);
        lonePair.scale.set(0.9, 1.2, 0.9);
        nh3Group.add(lonePair);

        // 3 Hydrogens at base (tetrahedral arrangement with ~107.8° angles)
        const hDist = 0.85;
        const hY = -0.3;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const hPos = new THREE.Vector3(Math.cos(angle) * hDist, hY, Math.sin(angle) * hDist);
          nh3Group.add(createAtom(hGeo, hMat, hPos));
          nh3Group.add(createCylinder(nPos, hPos, 0.05, bondMat));
        }

        return nh3Group;
      };

      moleculeGroup.add(createNH3(new THREE.Vector3(-1.8, 0, 0)));
      moleculeGroup.add(createNH3(new THREE.Vector3(1.8, 0, 0)));
    }
  }, [stage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cơ Chế Phân Tử 3D: N₂ + 3H₂ ⇌ 2NH₃
              </h2>
              <p className="text-xs text-slate-400">
                Quan sát liên kết ba N≡N, sự hấp phụ xúc tác trên bề mặt Fe và hình học chóp tam giác của NH₃
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-6 py-2.5 gap-2">
          <button
            onClick={() => setStage('reactants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              stage === 'reactants'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
            Chất Phản Ứng: N₂ + 3H₂
          </button>
          <button
            onClick={() => setStage('catalyst_adsorption')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              stage === 'catalyst_adsorption'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
            Hấp Phụ & Bẻ Gãy Liên Kết (Xúc Tác Fe)
          </button>
          <button
            onClick={() => setStage('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              stage === 'products'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
            Sản Phẩm: 2 NH₃ (Chóp Tam Giác)
          </button>
        </div>

        {/* 3D Canvas Area */}
        <div className="relative flex-1 bg-slate-950">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Molecule Legend & Notes overlay */}
          <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-900/85 border border-slate-800 text-xs text-slate-300 space-y-2 pointer-events-none max-w-xs shadow-xl backdrop-blur-sm">
            <div className="font-semibold text-white flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Ký hiệu nguyên tử
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" />
              <span>Nitơ (N) - Bán kính 70 pm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-100 inline-block border border-slate-400" />
              <span>Hydro (H) - Bán kính 25 pm</span>
            </div>
            {stage === 'catalyst_adsorption' && (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400 inline-block" />
                <span>Bề mặt mạng tinh thể Sắt (Fe)</span>
              </div>
            )}
            {stage === 'products' && (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-400/50 inline-block border border-sky-400" />
                <span>Đôi electron tự do (Lone pair)</span>
              </div>
            )}
          </div>

          {/* Scientific explanation callout */}
          <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-sm text-xs text-slate-300 leading-relaxed">
            {stage === 'reactants' && (
              <div>
                <span className="font-bold text-amber-400">Tại sao phản ứng cần điều kiện khắc nghiệt? </span>
                Phân tử Nitơ (N₂) sở hữu <strong className="text-white">liên kết ba N≡N siêu bền</strong> với năng lượng liên kết lên tới <strong className="text-white">945 kJ/mol</strong>. Ở điều kiện thường, phân tử N₂ hoàn toàn trơ về mặt hóa học, không thể tự phản ứng với H₂.
              </div>
            )}
            {stage === 'catalyst_adsorption' && (
              <div>
                <span className="font-bold text-emerald-400">Cơ chế xúc tác của Sắt xốp (Fe): </span>
                Các nguyên tử kim loại chuyển tiếp Fe có orbital d trống giúp hấp phụ hóa học (chemisorption) các phân tử N₂ và H₂, làm yếu và bẻ gãy liên kết N≡N, hạ năng lượng hoạt hóa từ 330 kJ/mol xuống còn ~160 kJ/mol để các nguyên tử kết hợp thành từng gốc NH, NH₂ và NH₃!
              </div>
            )}
            {stage === 'products' && (
              <div>
                <span className="font-bold text-sky-400">Cấu trúc hình học phân tử Amoniac (NH₃): </span>
                Theo lý thuyết VSEPR, nguyên tử Nitơ ở trạng thái lai hóa <strong className="text-white">sp³</strong>. Do sức đẩy mạnh của đôi electron tự do không liên kết trên đỉnh, góc liên kết H-N-H bị ép nhỏ lại còn <strong className="text-white">107.8°</strong>, tạo nên hình chóp tam giác với tính bazơ và khả năng tạo liên kết hydro cao.
              </div>
            )}
          </div>

          {/* Auto rotate toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 backdrop-blur-sm transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'text-blue-400' : 'text-slate-500'}`} />
            {autoRotate ? 'Đang xoay tự động' : 'Tạm dừng xoay'}
          </button>
        </div>
      </div>
    </div>
  );
};
