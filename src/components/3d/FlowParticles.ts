import * as THREE from 'three';
import { PlantPipes } from './HaberPlantModel';

interface Particle {
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  type: 'feed' | 'compressed' | 'hot_mix' | 'liquid' | 'recycle';
  color: THREE.Color;
  scale: number;
}

export class FlowParticleSystem {
  public group: THREE.Group;
  private instancedMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private totalCount: number = 240;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private _pos: THREE.Vector3 = new THREE.Vector3();

  // Chilled refrigeration mist particle group
  private mistGroup: THREE.Group;
  private mistParticles: { mesh: THREE.Mesh; initialPos: THREE.Vector3; speed: number; phase: number }[] = [];

  constructor(pipes: PlantPipes) {
    this.group = new THREE.Group();
    this.group.name = 'FlowParticles';

    const sphereGeo = new THREE.SphereGeometry(0.075, 12, 10);
    const particleMat = new THREE.MeshStandardMaterial({
      roughness: 0.1,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
    });

    this.instancedMesh = new THREE.InstancedMesh(sphereGeo, particleMat, this.totalCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.instancedMesh);

    // Populate particles along the curves
    const colorFeedN2 = new THREE.Color(0x38bdf8); // Sky Cyan (H2)
    const colorFeedH2 = new THREE.Color(0x2563eb); // Blue (N2)
    const colorCompressed = new THREE.Color(0x10b981); // Emerald pressurized
    const colorHotNH3 = new THREE.Color(0xf59e0b); // Amber NH3
    const colorLiquid = new THREE.Color(0xfacc15); // Liquid Ammonia
    const colorRecycle = new THREE.Color(0xc084fc); // Vibrant Luminous Purple

    // Pipe 1: Feed (40 particles)
    for (let i = 0; i < 35; i++) {
      const isN2 = Math.random() > 0.75;
      this.particles.push({
        curve: pipes.feedToCompressor,
        progress: Math.random(),
        speed: 0.22 + Math.random() * 0.08,
        type: 'feed',
        color: isN2 ? colorFeedH2 : colorFeedN2,
        scale: isN2 ? 1.15 : 0.9,
      });
    }

    // Pipe 2: Compressor to Reactor (45 particles)
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        curve: pipes.compressorToReactor,
        progress: Math.random(),
        speed: 0.38 + Math.random() * 0.12,
        type: 'compressed',
        color: colorCompressed,
        scale: 1.0,
      });
    }

    // Pipe 3: Reactor to Condenser (Hot mixture NH3 + N2/H2) (50 particles)
    for (let i = 0; i < 50; i++) {
      const isProduct = Math.random() > 0.35;
      this.particles.push({
        curve: pipes.reactorToCondenser,
        progress: Math.random(),
        speed: 0.32 + Math.random() * 0.1,
        type: 'hot_mix',
        color: isProduct ? colorHotNH3 : colorFeedN2,
        scale: isProduct ? 1.2 : 0.9,
      });
    }

    // Pipe 4: Condenser to Separator (35 particles)
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        curve: pipes.condenserToSeparator,
        progress: Math.random(),
        speed: 0.28 + Math.random() * 0.1,
        type: 'liquid',
        color: colorLiquid,
        scale: 1.25,
      });
    }

    // Pipe 5: Separator to Horton Storage (15 liquid drops)
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        curve: pipes.separatorToStorage,
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.08,
        type: 'liquid',
        color: colorLiquid,
        scale: 1.3,
      });
    }

    // Pipe 6: Overhead Recycle Loop (60 particles returning back)
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        curve: pipes.recycleLoop,
        progress: Math.random(),
        speed: 0.3 + Math.random() * 0.08,
        type: 'recycle',
        color: colorRecycle,
        scale: 0.95,
      });
    }

    // Set initial instance colors
    for (let i = 0; i < this.particles.length; i++) {
      this.instancedMesh.setColorAt(i, this.particles[i].color);
    }
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // Refrigeration mist wisps near Condenser
    this.mistGroup = new THREE.Group();
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const mistGeo = new THREE.SphereGeometry(0.18, 8, 8);

    for (let m = 0; m < 14; m++) {
      const mistMesh = new THREE.Mesh(mistGeo, mistMat);
      const initPos = new THREE.Vector3(
        5.2 + (Math.random() - 0.5) * 1.8,
        1.8 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.9
      );
      mistMesh.position.copy(initPos);
      this.mistGroup.add(mistMesh);
      this.mistParticles.push({
        mesh: mistMesh,
        initialPos: initPos,
        speed: 0.25 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.group.add(this.mistGroup);
  }

  public update(delta: number, speedMultiplier: number, isPaused: boolean) {
    if (isPaused) return;

    // Update pipe flow particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.progress += delta * p.speed * speedMultiplier;
      if (p.progress > 1) {
        p.progress -= 1;
      }

      p.curve.getPointAt(p.progress, this._pos);
      this.dummy.position.copy(this._pos);
      this.dummy.scale.setScalar(p.scale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Update chilled mist particles
    for (let m = 0; m < this.mistParticles.length; m++) {
      const mist = this.mistParticles[m];
      mist.phase += delta * mist.speed;
      mist.mesh.position.y += delta * 0.18 * speedMultiplier;
      mist.mesh.position.x = mist.initialPos.x + Math.sin(mist.phase) * 0.15;
      const scale = 1.0 + Math.sin(mist.phase) * 0.3;
      mist.mesh.scale.set(scale, scale, scale);

      if (mist.mesh.position.y > 3.2) {
        mist.mesh.position.y = mist.initialPos.y;
      }
    }
  }

  public setVisible(visible: boolean) {
    this.group.visible = visible;
  }
}
