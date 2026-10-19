import * as THREE from 'three';
import { EquipmentId } from '../../types/simulation';
import {
  createFloorGrateTexture,
  createGaugeDialTexture,
  createLedDisplayTexture,
  createPipeChevronTexture,
} from './ProceduralTextures';

export interface PlantPipes {
  feedToCompressor: THREE.CatmullRomCurve3;
  compressorToReactor: THREE.CatmullRomCurve3;
  reactorToCondenser: THREE.CatmullRomCurve3;
  condenserToSeparator: THREE.CatmullRomCurve3;
  separatorToStorage: THREE.CatmullRomCurve3;
  recycleLoop: THREE.CatmullRomCurve3;
}

export interface PlantModelResult {
  rootGroup: THREE.Group;
  equipmentHitboxes: THREE.Mesh[]; // for raycasting
  equipmentGroups: Record<EquipmentId, THREE.Group>;
  pipes: PlantPipes;
  compressorFlywheel: THREE.Mesh;
  compressorFan: THREE.Mesh;
  reactorInnerGlow: THREE.PointLight;
  catalystBeds: THREE.Mesh[];
  reactorOuterShell: THREE.Mesh;
  liquidMesh: THREE.Mesh;
  ledDisplayMesh: THREE.Mesh;
  tempLedDisplayMesh: THREE.Mesh;
  updateMaterials: (xray: boolean, tempC: number, pressureBar: number) => void;
}

export function buildHaberPlant(): PlantModelResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'HaberPlantRoot';

  const equipmentHitboxes: THREE.Mesh[] = [];
  const equipmentGroups: Partial<Record<EquipmentId, THREE.Group>> = {};

  // ==========================================
  // SHARED PBR MATERIALS & PROCEDURAL FINISHES
  // ==========================================
  const floorTexture = createFloorGrateTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.75,
    metalness: 0.35,
  });

  const steelStructureMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Slate Steel
    roughness: 0.35,
    metalness: 0.85,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.12,
    metalness: 0.95,
  });

  const brassValveMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88,
  });

  const redValveMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.4,
  });

  const pipeSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.88,
  });

  const pipeInsulatedMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.6,
    metalness: 0.3,
  });

  const flangeMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.3,
    metalness: 0.8,
  });

  const safetyYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.2,
  });

  // Helper: Flanged Joint with Bolt Studs
  const createFlangeJoint = (x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'x', radius: number = 0.22) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const flangeGeo = new THREE.CylinderGeometry(radius, radius, 0.06, 16);
    const m1 = new THREE.Mesh(flangeGeo, flangeMat);
    const m2 = new THREE.Mesh(flangeGeo, flangeMat);
    m1.position.y = -0.035;
    m2.position.y = 0.035;
    group.add(m1);
    group.add(m2);

    // Bolt studs along perimeter
    const boltGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(Math.cos(angle) * (radius * 0.75), 0, Math.sin(angle) * (radius * 0.75));
      group.add(bolt);
    }

    if (axis === 'x') {
      group.rotation.z = Math.PI / 2;
    } else if (axis === 'z') {
      group.rotation.x = Math.PI / 2;
    }
    return group;
  };

  // Helper: Valve Handwheel
  const createValveWheel = (mat: THREE.Material = redValveMat, radius: number = 0.22) => {
    const vGroup = new THREE.Group();
    const rimGeo = new THREE.TorusGeometry(radius, 0.03, 8, 20);
    const rim = new THREE.Mesh(rimGeo, mat);
    vGroup.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), chromeMat);
    hub.rotation.x = Math.PI / 2;
    vGroup.add(hub);

    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, radius * 1.9, 6), mat);
      spoke.rotation.z = (i * Math.PI) / 4;
      vGroup.add(spoke);
    }
    return vGroup;
  };

  // Helper to attach an invisible raycast hit proxy box
  const makeHitbox = (id: EquipmentId, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.userData = { equipmentId: id };
    mesh.name = `hitbox_${id}`;
    equipmentHitboxes.push(mesh);
    rootGroup.add(mesh);
  };

  // ==========================================
  // 0. FOUNDATION PLATFORM & SAFETY RAILINGS
  // ==========================================
  const baseGroup = new THREE.Group();

  // Heavy Diamond-Plated Concrete Base
  const platformGeo = new THREE.BoxGeometry(26, 0.45, 8.5);
  const platformMesh = new THREE.Mesh(platformGeo, floorMat);
  platformMesh.position.set(1.5, -0.225, 0);
  platformMesh.receiveShadow = true;
  baseGroup.add(platformMesh);

  // Structural Steel I-Beam Skirt around platform perimeter
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
  const skirtFront = new THREE.Mesh(new THREE.BoxGeometry(26, 0.45, 0.1), skirtMat);
  skirtFront.position.set(1.5, -0.225, 4.25);
  baseGroup.add(skirtFront);

  // Safety Edge Hazard Strip
  const canvasStripe = document.createElement('canvas');
  canvasStripe.width = 512;
  canvasStripe.height = 32;
  const ctxS = canvasStripe.getContext('2d')!;
  ctxS.fillStyle = '#eab308';
  ctxS.fillRect(0, 0, 512, 32);
  ctxS.fillStyle = '#0f172a';
  for (let i = -32; i < 544; i += 32) {
    ctxS.beginPath();
    ctxS.moveTo(i, 0);
    ctxS.lineTo(i + 20, 0);
    ctxS.lineTo(i - 4, 32);
    ctxS.lineTo(i - 24, 32);
    ctxS.fill();
  }
  const stripeTex = new THREE.CanvasTexture(canvasStripe);
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.repeat.set(14, 1);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.3 });

  const hazardEdge = new THREE.Mesh(new THREE.BoxGeometry(26, 0.02, 0.28), stripeMat);
  hazardEdge.position.set(1.5, 0.01, 4.1);
  baseGroup.add(hazardEdge);

  // Embedded Cyan & Amber LED Ground Light Strips
  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const ledStrip1 = new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.02, 0.05), cyanGlowMat);
  ledStrip1.position.set(1.5, 0.015, 3.9);
  baseGroup.add(ledStrip1);

  const ledStrip2 = new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.02, 0.05), amberGlowMat);
  ledStrip2.position.set(1.5, 0.015, -3.9);
  baseGroup.add(ledStrip2);

  // Safety Perimeter Railings (Back & Sides)
  const createRailSection = (x1: number, z1: number, x2: number, z2: number) => {
    const rGroup = new THREE.Group();
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(z2 - z1, x2 - x1);

    // Top Handrail
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 8), safetyYellowMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.rotation.y = angle;
    topRail.position.set((x1 + x2) / 2, 0.95, (z1 + z2) / 2);
    rGroup.add(topRail);

    // Mid Rail
    const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 8), safetyYellowMat);
    midRail.rotation.z = Math.PI / 2;
    midRail.rotation.y = angle;
    midRail.position.set((x1 + x2) / 2, 0.5, (z1 + z2) / 2);
    rGroup.add(midRail);

    // Posts
    const postCount = Math.max(2, Math.floor(len / 2));
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), steelStructureMat);
      post.position.set(px, 0.475, pz);
      rGroup.add(post);
    }
    return rGroup;
  };

  baseGroup.add(createRailSection(-11.3, -4.1, 14.3, -4.1)); // Back railing
  baseGroup.add(createRailSection(-11.3, -4.1, -11.3, 4.1)); // Left railing
  baseGroup.add(createRailSection(14.3, -4.1, 14.3, 4.1));   // Right railing
  rootGroup.add(baseGroup);

  // ==========================================
  // STRUCTURAL OVERHEAD PIPE RACK (TRUSS BRIDGE)
  // Carries the famous recycle loop & utility lines
  // ==========================================
  const rackGroup = new THREE.Group();
  const trussColumnsX = [-8.0, -3.8, 0.8, 5.2, 9.2];
  trussColumnsX.forEach((cx) => {
    // Twin vertical columns
    const colBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.2, 0.12), steelStructureMat);
    colBack.position.set(cx, 2.6, -1.2);
    colBack.castShadow = true;
    rackGroup.add(colBack);

    // Cross beam support
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 2.4), steelStructureMat);
    crossBeam.position.set(cx, 5.0, 0);
    rackGroup.add(crossBeam);

    // Diagonal bracing
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), steelStructureMat);
    brace.rotation.z = Math.PI / 4;
    brace.position.set(cx, 4.4, -0.6);
    rackGroup.add(brace);
  });

  // Longitudinal runner beam
  const runner = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.12, 0.12), steelStructureMat);
  runner.position.set(0.6, 5.0, 0);
  rackGroup.add(runner);
  rootGroup.add(rackGroup);

  // ==========================================
  // 1. FEED GAS UNIT (N2 + H2 Pressure Vessels)
  // Position: [-8.0, 0, 0]
  // ==========================================
  const feedGroup = new THREE.Group();
  feedGroup.position.set(-8.0, 0, 0);
  feedGroup.name = 'feed_storage';

  // Concrete Equipment Pad
  const feedPad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 3.0), steelStructureMat);
  feedPad.position.set(0, 0.125, 0);
  feedPad.receiveShadow = true;
  feedGroup.add(feedPad);

  const n2TankMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Deep Royal Nitrogen Blue
    roughness: 0.28,
    metalness: 0.72,
  });

  const h2TankMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Vibrant Sky Hydrogen Blue
    roughness: 0.28,
    metalness: 0.72,
  });

  // N2 Tank (ASME Torispherical Dished Cap + Body)
  const n2Body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.4, 32), n2TankMat);
  n2Body.position.set(-0.85, 1.6, 0);
  n2Body.castShadow = true;
  feedGroup.add(n2Body);

  const dishedTopGeo = new THREE.SphereGeometry(0.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const n2TopDome = new THREE.Mesh(dishedTopGeo, n2TankMat);
  n2TopDome.position.set(-0.85, 2.8, 0);
  feedGroup.add(n2TopDome);

  const n2BottomDome = new THREE.Mesh(dishedTopGeo, n2TankMat);
  n2BottomDome.rotation.x = Math.PI;
  n2BottomDome.position.set(-0.85, 0.4, 0);
  feedGroup.add(n2BottomDome);

  // N2 Stencil Label Plate
  const n2LabelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.25),
    new THREE.MeshBasicMaterial({ map: createLedDisplayTexture('N₂ 99.9%') })
  );
  n2LabelMesh.position.set(-0.85, 2.0, 0.66);
  feedGroup.add(n2LabelMesh);

  // H2 Tank (Larger volume representing 3x stoichiometric requirement)
  const h2Body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 2.8, 32), h2TankMat);
  h2Body.position.set(0.85, 1.8, 0);
  h2Body.castShadow = true;
  feedGroup.add(h2Body);

  const h2TopDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    h2TankMat
  );
  h2TopDome.position.set(0.85, 3.2, 0);
  feedGroup.add(h2TopDome);

  const h2LabelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.25),
    new THREE.MeshBasicMaterial({ map: createLedDisplayTexture('H₂ 3:1') })
  );
  h2LabelMesh.position.set(0.85, 2.2, 0.79);
  feedGroup.add(h2LabelMesh);

  // Pressure Dials on both tanks
  const n2DialTex = createGaugeDialTexture('N₂');
  const dialMatN2 = new THREE.MeshStandardMaterial({ map: n2DialTex, roughness: 0.1 });
  const n2Dial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24), dialMatN2);
  n2Dial.rotation.x = Math.PI / 2;
  n2Dial.position.set(-0.85, 2.45, 0.68);
  feedGroup.add(n2Dial);

  const h2DialTex = createGaugeDialTexture('H₂');
  const dialMatH2 = new THREE.MeshStandardMaterial({ map: h2DialTex, roughness: 0.1 });
  const h2Dial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24), dialMatH2);
  h2Dial.rotation.x = Math.PI / 2;
  h2Dial.position.set(0.85, 2.65, 0.81);
  feedGroup.add(h2Dial);

  // Proportioning Mixing Manifold & Control Valves
  const mixPipeGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.7, 16);
  const mixPipe = new THREE.Mesh(mixPipeGeo, pipeSteelMat);
  mixPipe.rotation.z = Math.PI / 2;
  mixPipe.position.set(0, 1.2, 0.5);
  feedGroup.add(mixPipe);

  const valveN2 = createValveWheel(redValveMat, 0.16);
  valveN2.rotation.x = Math.PI / 2;
  valveN2.position.set(-0.4, 1.4, 0.5);
  feedGroup.add(valveN2);

  const valveH2 = createValveWheel(brassValveMat, 0.16);
  valveH2.rotation.x = Math.PI / 2;
  valveH2.position.set(0.4, 1.4, 0.5);
  feedGroup.add(valveH2);

  // Foundation Support Legs & Anchor Bolts
  [-0.85, 0.85].forEach((tx, idx) => {
    const rad = idx === 0 ? 0.55 : 0.68;
    for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 4) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 12), steelStructureMat);
      leg.position.set(tx + Math.cos(a) * rad, 0.35, Math.sin(a) * rad);
      feedGroup.add(leg);
    }
  });

  rootGroup.add(feedGroup);
  equipmentGroups.feed_storage = feedGroup;
  makeHitbox('feed_storage', -8.0, 1.8, 0, 3.2, 3.8, 2.6);

  // ==========================================
  // 2. MULTI-STAGE COMPRESSOR UNIT (200 BAR)
  // Position: [-3.8, 0, 0]
  // ==========================================
  const compressorGroup = new THREE.Group();
  compressorGroup.position.set(-3.8, 0, 0);
  compressorGroup.name = 'compressor';

  const compEnamelMat = new THREE.MeshStandardMaterial({
    color: 0x047857, // Deep Industrial Machine Green
    roughness: 0.32,
    metalness: 0.65,
  });

  const motorHousingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.85,
  });

  // Base bedplate with vibration damping mounts
  const compBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 2.2), steelStructureMat);
  compBase.position.set(0, 0.175, 0);
  compBase.castShadow = true;
  compressorGroup.add(compBase);

  // 4 Vibration Damper Springs at corners
  [-1.3, 1.3].forEach((bx) => {
    [-0.9, 0.9].forEach((bz) => {
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12), chromeMat);
      spring.position.set(bx, 0.075, bz);
      compressorGroup.add(spring);
    });
  });

  // Main Cast-Iron Crankcase with longitudinal cooling ribs
  const crankcaseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), compEnamelMat);
  crankcaseMesh.position.set(-0.35, 0.9, 0);
  crankcaseMesh.castShadow = true;
  compressorGroup.add(crankcaseMesh);

  // Ribs on crankcase
  for (let y = 0.55; y <= 1.25; y += 0.2) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 1.45), compEnamelMat);
    rib.position.set(-0.35, y, 0);
    compressorGroup.add(rib);
  }

  // Dual Compression Cylinders with Ring Fins (Fin Geometry)
  const cylXPositions = [-0.65, -0.05];
  cylXPositions.forEach((cx) => {
    // Inner cylinder
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.95, 24), compEnamelMat);
    cyl.position.set(cx, 1.6, 0);
    compressorGroup.add(cyl);

    // 6 Annular cooling fins per cylinder
    for (let f = 1.25; f <= 1.95; f += 0.12) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.025, 24), chromeMat);
      fin.position.set(cx, f, 0);
      compressorGroup.add(fin);
    }

    // Heavy Cylinder Head with bolts
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 24), steelStructureMat);
    head.position.set(cx, 2.15, 0);
    compressorGroup.add(head);

    // Relief valve on top of each head
    const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12), brassValveMat);
    rv.position.set(cx, 2.3, 0);
    compressorGroup.add(rv);
  });

  // High-Powered Electric Drive Motor (30 MW Industrial Turbine)
  const motorCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32), motorHousingMat);
  motorCyl.rotation.z = Math.PI / 2;
  motorCyl.position.set(0.85, 0.9, 0);
  motorCyl.castShadow = true;
  compressorGroup.add(motorCyl);

  // Cooling Fan Grille at motor end
  const fanGrille = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.08, 24), steelStructureMat);
  fanGrille.rotation.z = Math.PI / 2;
  fanGrille.position.set(1.48, 0.9, 0);
  compressorGroup.add(fanGrille);

  // Rotating Internal Fan Blades (spins during simulation)
  const compressorFan = new THREE.Group() as unknown as THREE.Mesh;
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.45, 0.1), chromeMat);
    blade.rotation.x = (i * Math.PI) / 3;
    (compressorFan as unknown as THREE.Group).add(blade);
  }
  compressorFan.position.set(1.49, 0.9, 0);
  compressorGroup.add(compressorFan as unknown as THREE.Object3D);

  // Large Polished Brass Flywheel & Drive Belt
  const flywheelGeo = new THREE.TorusGeometry(0.58, 0.09, 16, 32);
  const flywheelMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.92,
  });
  const compressorFlywheel = new THREE.Mesh(flywheelGeo, flywheelMat);
  compressorFlywheel.position.set(-0.35, 0.9, 0.78);
  compressorGroup.add(compressorFlywheel);

  // Flywheel Spokes
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), chromeMat);
    spoke.rotation.z = (i * Math.PI) / 6;
    spoke.position.set(-0.35, 0.9, 0.78);
    compressorGroup.add(spoke);
  }

  // Intercooler Tube with spiral cooling coil
  const intercoolerPipe = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.65, 2.15, 0.15),
        new THREE.Vector3(-0.35, 2.45, 0.2),
        new THREE.Vector3(-0.05, 2.15, 0.15),
      ]),
      20,
      0.065,
      12,
      false
    ),
    pipeSteelMat
  );
  compressorGroup.add(intercoolerPipe);

  // Digital LED Pressure Display Displaying Real-Time Pressure
  const ledTex = createLedDisplayTexture('200.0 BAR');
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
  const ledDisplayMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), ledMat);
  ledDisplayMesh.position.set(-0.35, 1.9, 0.65);
  compressorGroup.add(ledDisplayMesh);

  rootGroup.add(compressorGroup);
  equipmentGroups.compressor = compressorGroup;
  makeHitbox('compressor', -3.8, 1.3, 0, 3.2, 2.6, 2.4);

  // ==========================================
  // 3. CATALYTIC SYNTHESIS REACTOR (HERO CENTERPIECE)
  // Position: [0.8, 0, 0]
  // ==========================================
  const reactorGroup = new THREE.Group();
  reactorGroup.position.set(0.8, 0, 0);
  reactorGroup.name = 'reactor';

  // Heavy Octagonal Concrete Pedestal
  const reactorPad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.45, 8), steelStructureMat);
  reactorPad.position.set(0, 0.225, 0);
  reactorPad.receiveShadow = true;
  reactorGroup.add(reactorPad);

  // Reactor Main Column Wall Material (Corrosion resistant Cr-Mo Steel)
  const reactorMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Deep Industrial Refractory Red
    roughness: 0.38,
    metalness: 0.65,
  });

  const reactorSkirt = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.8, 32), steelStructureMat);
  reactorSkirt.position.set(0, 0.7, 0);
  reactorSkirt.castShadow = true;
  reactorGroup.add(reactorSkirt);

  // Main Pressure Shell
  const reactorBodyGeo = new THREE.CylinderGeometry(1.05, 1.05, 3.8, 32);
  const reactorOuterShell = new THREE.Mesh(reactorBodyGeo, reactorMat);
  reactorOuterShell.position.set(0, 2.7, 0);
  reactorOuterShell.castShadow = true;
  reactorGroup.add(reactorOuterShell);

  // Dished Ellipsoidal Top Dome
  const reactorTopDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    reactorMat
  );
  reactorTopDome.position.set(0, 4.6, 0);
  reactorGroup.add(reactorTopDome);

  // Dished Bottom Dome
  const reactorBottomDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    reactorMat
  );
  reactorBottomDome.position.set(0, 0.8, 0);
  reactorGroup.add(reactorBottomDome);

  // Heavy Circumferential Reinforcement Girth Rings
  for (let y = 1.4; y <= 4.4; y += 0.75) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 12, 32), steelStructureMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);
    reactorGroup.add(ring);
  }

  // SPIRAL ACCESS STAIRWAY & PLATFORMS
  const spiralStepsCount = 28;
  const spiralRadius = 1.35;
  for (let s = 0; s < spiralStepsCount; s++) {
    const t = s / spiralStepsCount;
    const angle = t * Math.PI * 2.2;
    const sy = 0.8 + t * 3.4;

    const step = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.16), steelStructureMat);
    step.position.set(Math.cos(angle) * spiralRadius, sy, Math.sin(angle) * spiralRadius);
    step.rotation.y = -angle;
    reactorGroup.add(step);

    // Handrail post on each step
    const stepPost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), safetyYellowMat);
    stepPost.position.set(Math.cos(angle) * (spiralRadius + 0.15), sy + 0.4, Math.sin(angle) * (spiralRadius + 0.15));
    reactorGroup.add(stepPost);
  }

  // Mid & Upper Catwalk Platform Rings
  [2.4, 4.4].forEach((py) => {
    const catwalkGeo = new THREE.TorusGeometry(1.48, 0.18, 8, 32);
    const catwalk = new THREE.Mesh(catwalkGeo, steelStructureMat);
    catwalk.rotation.x = Math.PI / 2;
    catwalk.position.set(0, py, 0);
    reactorGroup.add(catwalk);

    const railGeo = new THREE.TorusGeometry(1.64, 0.03, 8, 32);
    const rail = new THREE.Mesh(railGeo, safetyYellowMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, py + 0.85, 0);
    reactorGroup.add(rail);
  });

  // Top Safety Relief Valve Stack & Vent Silencer
  const reliefValve = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16), brassValveMat);
  reliefValve.position.set(0.4, 5.4, 0);
  reactorGroup.add(reliefValve);

  const reliefVentPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 12), chromeMat);
  reliefVentPipe.position.set(0.4, 6.0, 0);
  reactorGroup.add(reliefVentPipe);

  // Digital Temperature LED Monitor on Reactor Wall
  const tempLedTex = createLedDisplayTexture('450 °C [Fe]');
  const tempLedMat = new THREE.MeshBasicMaterial({ map: tempLedTex });
  const tempLedDisplayMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.24), tempLedMat);
  tempLedDisplayMesh.position.set(0, 3.2, 1.1);
  reactorGroup.add(tempLedDisplayMesh);

  // INTERNAL CATALYST BEDS & HEAT-EXCHANGE COILS (Revealed in X-Ray mode)
  const catalystBeds: THREE.Mesh[] = [];
  const catalystMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xe11d48,
    emissiveIntensity: 0.9,
    roughness: 0.95,
    metalness: 0.1,
  });

  const bedHeights = [1.6, 2.7, 3.8];
  bedHeights.forEach((by) => {
    // Porous Fe catalyst pellet bed
    const bedMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.55, 24), catalystMat);
    bedMesh.position.set(0, by, 0);
    bedMesh.visible = false;
    reactorGroup.add(bedMesh);
    catalystBeds.push(bedMesh);

    // Perforated distributor screen
    const screenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.05, 24), steelStructureMat);
    screenMesh.position.set(0, by - 0.3, 0);
    screenMesh.visible = false;
    reactorGroup.add(screenMesh);
    catalystBeds.push(screenMesh);
  });

  // Internal Helical Heat Exchange Coil
  const coilCurvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = t * Math.PI * 12;
    coilCurvePoints.push(new THREE.Vector3(Math.cos(a) * 0.45, 1.2 + t * 2.8, Math.sin(a) * 0.45));
  }
  const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilCurvePoints), 80, 0.035, 8, false);
  const coilMesh = new THREE.Mesh(coilGeo, chromeMat);
  coilMesh.visible = false;
  reactorGroup.add(coilMesh);
  catalystBeds.push(coilMesh);

  // Intense Reaction Core Glow Light
  const reactorInnerGlow = new THREE.PointLight(0xff4500, 0, 5.5);
  reactorInnerGlow.position.set(0, 2.7, 0);
  reactorGroup.add(reactorInnerGlow);

  rootGroup.add(reactorGroup);
  equipmentGroups.reactor = reactorGroup;
  makeHitbox('reactor', 0.8, 2.8, 0, 3.2, 5.8, 3.2);

  // ==========================================
  // 4. CONDENSER & COOLER UNIT (-33°C)
  // Position: [5.2, 0, 0]
  // ==========================================
  const condenserGroup = new THREE.Group();
  condenserGroup.position.set(5.2, 0, 0);
  condenserGroup.name = 'condenser';

  // Concrete Piers
  [-0.9, 0.9].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 1.8), steelStructureMat);
    pier.position.set(px, 0.45, 0);
    pier.receiveShadow = true;
    condenserGroup.add(pier);

    // Saddle Support Cradles
    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 24, 1, false, 0, Math.PI), steelStructureMat);
    saddle.rotation.z = Math.PI / 2;
    saddle.position.set(px, 1.25, 0);
    condenserGroup.add(saddle);
  });

  const condenserMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Cool Ocean Blue
    roughness: 0.25,
    metalness: 0.75,
  });

  const frostMat = new THREE.MeshStandardMaterial({
    color: 0xf0fdf4, // Frosted ice white-cyan
    roughness: 0.15,
    metalness: 0.35,
  });

  // Shell-and-Tube Main Body
  const condBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.6, 32), condenserMat);
  condBody.rotation.z = Math.PI / 2;
  condBody.position.set(0, 1.8, 0);
  condBody.castShadow = true;
  condenserGroup.add(condBody);

  // End Channel Bell Heads
  const leftHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    condenserMat
  );
  leftHead.rotation.z = -Math.PI / 2;
  leftHead.position.set(-1.3, 1.8, 0);
  condenserGroup.add(leftHead);

  const rightHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    condenserMat
  );
  rightHead.rotation.z = Math.PI / 2;
  rightHead.position.set(1.3, 1.8, 0);
  condenserGroup.add(rightHead);

  // External Ring Flanges & Cooling Fins
  for (let x = -0.9; x <= 0.9; x += 0.3) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.035, 8, 32), frostMat);
    fin.rotation.y = Math.PI / 2;
    fin.position.set(x, 1.8, 0);
    condenserGroup.add(fin);
  }

  // Chilled Refrigerant In/Out Piping with Valves
  const coolInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), frostMat);
  coolInlet.position.set(-0.6, 2.7, 0);
  condenserGroup.add(coolInlet);
  const vCool1 = createValveWheel(pipeSteelMat, 0.14);
  vCool1.position.set(-0.6, 2.8, 0.12);
  condenserGroup.add(vCool1);

  const coolOutlet = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), frostMat);
  coolOutlet.position.set(0.6, 2.7, 0);
  condenserGroup.add(coolOutlet);
  const vCool2 = createValveWheel(pipeSteelMat, 0.14);
  vCool2.position.set(0.6, 2.8, 0.12);
  condenserGroup.add(vCool2);

  // Condenser Temperature Readout Display
  const condTempMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.22),
    new THREE.MeshBasicMaterial({ map: createLedDisplayTexture('-33.4 °C') })
  );
  condTempMesh.position.set(0, 1.8, 0.85);
  condenserGroup.add(condTempMesh);

  rootGroup.add(condenserGroup);
  equipmentGroups.condenser = condenserGroup;
  makeHitbox('condenser', 5.2, 1.8, 0, 3.4, 2.8, 2.4);

  // ==========================================
  // 5. SEPARATOR & HORTON SPHERE (LIQUID NH3)
  // Position: [9.5, 0, 0]
  // ==========================================
  const sepGroup = new THREE.Group();
  sepGroup.position.set(9.5, 0, 0);
  sepGroup.name = 'separator';

  const sepMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Amber Gold Industrial Finish
    roughness: 0.32,
    metalness: 0.7,
  });

  // Vertical Cyclonic Separator Body
  const sepBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 32), sepMat);
  sepBody.position.set(-0.7, 1.8, 0);
  sepBody.castShadow = true;
  sepGroup.add(sepBody);

  const sepTopCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    sepMat
  );
  sepTopCap.position.set(-0.7, 3.1, 0);
  sepGroup.add(sepTopCap);

  const sepBottomCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 32), sepMat);
  sepBottomCone.rotation.x = Math.PI;
  sepBottomCone.position.set(-0.7, 0.35, 0);
  sepGroup.add(sepBottomCone);

  // Structural Support Legs for Separator
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), steelStructureMat);
    leg.position.set(-0.7 + Math.cos(a) * 0.45, 0.4, Math.sin(a) * 0.45);
    sepGroup.add(leg);
  }

  // Sight Glass Column with Graduated Marks & Liquid Ammonia
  const sightGlassShield = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.6, 0.1), steelStructureMat);
  sightGlassShield.position.set(-0.7, 1.8, 0.62);
  sepGroup.add(sightGlassShield);

  const sightGlassTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.45, 16),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.05,
      transmission: 0.95,
      ior: 1.45,
      transparent: true,
      opacity: 1,
    })
  );
  sightGlassTube.position.set(-0.7, 1.8, 0.67);
  sepGroup.add(sightGlassTube);

  // Dynamic Liquid NH3 Mesh
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  });
  const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.0, 16), liquidMat);
  liquidMesh.position.set(-0.7, 1.5, 0.67);
  sepGroup.add(liquidMesh);

  // PRODUCT STORAGE: HORTON SPHERE (AUTHENTIC 10-LEG REFRIGERATED NH3 SPHERE)
  const sphereGroup = new THREE.Group();
  sphereGroup.position.set(1.9, 1.7, 0);

  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Stainless Heavy Vessel
    roughness: 0.22,
    metalness: 0.85,
  });

  const hortonSphere = new THREE.Mesh(new THREE.SphereGeometry(1.25, 36, 28), sphereMat);
  hortonSphere.castShadow = true;
  sphereGroup.add(hortonSphere);

  // Circumferential equator weld band
  const equatorBand = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.03, 8, 36), steelStructureMat);
  equatorBand.rotation.x = Math.PI / 2;
  sphereGroup.add(equatorBand);

  // 10 Tubular Steel Support Columns with diagonal cross-braces
  const legCount = 10;
  const sphereLegRadius = 1.05;
  for (let i = 0; i < legCount; i++) {
    const angle = (i * Math.PI * 2) / legCount;
    const lx = Math.cos(angle) * sphereLegRadius;
    const lz = Math.sin(angle) * sphereLegRadius;

    // Vertical leg
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.8, 12), steelStructureMat);
    col.position.set(lx, -0.85, lz);
    col.castShadow = true;
    sphereGroup.add(col);

    // Diagonal tension rod
    const nextAngle = ((i + 1) * Math.PI * 2) / legCount;
    const nlx = Math.cos(nextAngle) * sphereLegRadius;
    const nlz = Math.sin(nextAngle) * sphereLegRadius;

    const braceCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(lx, -0.3, lz),
      new THREE.Vector3(nlx, -1.4, nlz),
    ]);
    const braceRod = new THREE.Mesh(new THREE.TubeGeometry(braceCurve, 6, 0.015, 6, false), chromeMat);
    sphereGroup.add(braceRod);
  }

  // Top Deluge Sprinkler Safety Ring on Sphere
  const sprinklerRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.025, 8, 24), pipeSteelMat);
  sprinklerRing.rotation.x = Math.PI / 2;
  sprinklerRing.position.set(0, 1.15, 0);
  sphereGroup.add(sprinklerRing);

  // Discharge Product Transfer Pump
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(0.6, 0.35, 0.8);
  const pMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), motorHousingMat);
  pMotor.rotation.z = Math.PI / 2;
  pumpGroup.add(pMotor);
  const pVolute = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 12, 24), compEnamelMat);
  pumpGroup.add(pVolute);
  sepGroup.add(pumpGroup);

  sepGroup.add(sphereGroup);
  rootGroup.add(sepGroup);
  equipmentGroups.separator = sepGroup;
  makeHitbox('separator', 10.2, 1.8, 0, 4.6, 4.0, 3.2);

  // ==========================================
  // 6. CONNECTING PIPELINES & THE RECYCLE LOOP
  // ==========================================

  // Pipe 1: Feed -> Compressor
  const feedToCompressor = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7.15, 1.2, 0),
    new THREE.Vector3(-5.8, 1.2, 0),
    new THREE.Vector3(-4.8, 1.2, 0),
  ]);
  const pipe1Mesh = new THREE.Mesh(new THREE.TubeGeometry(feedToCompressor, 20, 0.1, 16, false), pipeSteelMat);
  pipe1Mesh.castShadow = true;
  rootGroup.add(pipe1Mesh);
  rootGroup.add(createFlangeJoint(-5.8, 1.2, 0, 'x', 0.2));

  // Pipe 2: Compressor -> Reactor Base (High Pressure 200 bar, insulated)
  const compressorToReactor = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.4, 1.8, 0),
    new THREE.Vector3(-1.8, 1.8, 0),
    new THREE.Vector3(-0.6, 1.1, 0),
    new THREE.Vector3(-0.25, 1.1, 0),
  ]);
  const pipe2Mesh = new THREE.Mesh(new THREE.TubeGeometry(compressorToReactor, 28, 0.11, 16, false), pipeInsulatedMat);
  pipe2Mesh.castShadow = true;
  rootGroup.add(pipe2Mesh);
  rootGroup.add(createFlangeJoint(-1.8, 1.8, 0, 'x', 0.22));

  // Pipe 3: Reactor Top -> Condenser Inlet (Hot product gas)
  const reactorToCondenser = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.8, 5.2, 0),
    new THREE.Vector3(2.4, 5.0, 0),
    new THREE.Vector3(3.9, 3.8, 0),
    new THREE.Vector3(3.9, 2.2, 0),
  ]);
  const pipe3Mesh = new THREE.Mesh(new THREE.TubeGeometry(reactorToCondenser, 28, 0.11, 16, false), pipeInsulatedMat);
  pipe3Mesh.castShadow = true;
  rootGroup.add(pipe3Mesh);
  rootGroup.add(createFlangeJoint(2.4, 5.0, 0, 'x', 0.22));

  // Pipe 4: Condenser Bottom -> Separator Inlet
  const condenserToSeparator = new THREE.CatmullRomCurve3([
    new THREE.Vector3(6.3, 1.2, 0),
    new THREE.Vector3(7.4, 1.2, 0),
    new THREE.Vector3(8.5, 1.8, 0),
  ]);
  const pipe4Mesh = new THREE.Mesh(new THREE.TubeGeometry(condenserToSeparator, 20, 0.1, 16, false), pipeSteelMat);
  pipe4Mesh.castShadow = true;
  rootGroup.add(pipe4Mesh);

  // Pipe 5: Separator Product Drain to Horton Sphere
  const separatorToStorage = new THREE.CatmullRomCurve3([
    new THREE.Vector3(8.8, 0.5, 0),
    new THREE.Vector3(9.8, 0.35, 0.6),
    new THREE.Vector3(10.8, 0.6, 0.6),
  ]);
  const pipe5Mesh = new THREE.Mesh(new THREE.TubeGeometry(separatorToStorage, 16, 0.08, 12, false), pipeSteelMat);
  rootGroup.add(pipe5Mesh);

  // Pipe 6: THE FAMOUS OVERHEAD RECYCLE LOOP
  // Loops from top of Separator (8.8, 3.4, 0) up to Y=5.4, spans left across the plant on the truss rack, down into Compressor at (-3.8, 2.2, 0)
  const recycleLoop = new THREE.CatmullRomCurve3([
    new THREE.Vector3(8.8, 3.4, 0),
    new THREE.Vector3(8.8, 5.4, 0),
    new THREE.Vector3(4.8, 5.4, 0),
    new THREE.Vector3(0.8, 5.4, 0),
    new THREE.Vector3(-3.8, 5.4, 0),
    new THREE.Vector3(-3.8, 3.8, 0),
    new THREE.Vector3(-3.8, 2.3, 0),
  ]);
  const recyclePipeMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7, // Distinctive Majestic Purple
    roughness: 0.22,
    metalness: 0.85,
  });
  const recycleMesh = new THREE.Mesh(new THREE.TubeGeometry(recycleLoop, 64, 0.1, 16, false), recyclePipeMat);
  recycleMesh.castShadow = true;
  rootGroup.add(recycleMesh);

  // Inline Recycle Booster Turbopump on the elevated rack
  const boosterGroup = new THREE.Group();
  boosterGroup.position.set(2.8, 5.4, 0);
  const bMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.65, 16), steelStructureMat);
  bMotor.rotation.z = Math.PI / 2;
  boosterGroup.add(bMotor);
  const bCasing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 12, 20), chromeMat);
  boosterGroup.add(bCasing);
  rootGroup.add(boosterGroup);

  // Equipment group for recycle loop hitbox
  const recycleGroup = new THREE.Group();
  recycleGroup.position.set(2.5, 5.2, 0);
  equipmentGroups.recycle_loop = recycleGroup;
  makeHitbox('recycle_loop', 2.5, 5.4, 0, 14.5, 1.2, 1.2);

  // Material updater for X-Ray cutaway & thermal heat effects
  const updateMaterials = (xray: boolean, tempC: number, pressureBar: number) => {
    if (xray) {
      reactorOuterShell.material = new THREE.MeshPhysicalMaterial({
        color: 0xdc2626,
        roughness: 0.08,
        transmission: 0.9,
        thickness: 1.2,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      catalystBeds.forEach((b) => (b.visible = true));
      reactorInnerGlow.intensity = 1.8 + (tempC / 600) * 2.5;
    } else {
      reactorOuterShell.material = reactorMat;
      catalystBeds.forEach((b) => (b.visible = false));
      reactorInnerGlow.intensity = 0;
    }

    // Dynamic liquid height in sight glass
    const liquidScaleY = Math.min(1.4, Math.max(0.2, (pressureBar / 200) * (tempC < 550 ? 1 : 0.4)));
    liquidMesh.scale.set(1, liquidScaleY, 1);
  };

  return {
    rootGroup,
    equipmentHitboxes,
    equipmentGroups: equipmentGroups as Record<EquipmentId, THREE.Group>,
    pipes: {
      feedToCompressor,
      compressorToReactor,
      reactorToCondenser,
      condenserToSeparator,
      separatorToStorage,
      recycleLoop,
    },
    compressorFlywheel,
    compressorFan,
    reactorInnerGlow,
    catalystBeds,
    reactorOuterShell,
    liquidMesh,
    ledDisplayMesh,
    tempLedDisplayMesh,
    updateMaterials,
  };
}
