import * as THREE from 'three';

/**
 * Procedural texture generators using HTML5 2D Canvas.
 * 100% zero-dependency, zero-404, crisp and anisotropic.
 */

// 1. Industrial Steel Floor Grate / Diamond Plate Texture
export function createFloorGrateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark industrial concrete-metal base
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Metal grid pattern
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  const step = 32;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Cross diamond rivets
  ctx.fillStyle = '#334155';
  for (let x = step / 2; x < 512; x += step) {
    for (let y = step / 2; y < 512; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Analog Pressure Gauge Dial Face
export function createGaugeDialTexture(label: string = 'BAR'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  // Outer bezel ring
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Tick marks
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  for (let a = -135; a <= 135; a += 15) {
    const rad = (a * Math.PI) / 180;
    const isMajor = a % 45 === 0;
    const len = isMajor ? 20 : 10;
    ctx.lineWidth = isMajor ? 4 : 2;
    ctx.strokeStyle = a > 90 ? '#ef4444' : isMajor ? '#0f172a' : '#64748b';

    const x1 = 128 + Math.sin(rad) * 110;
    const y1 = 128 - Math.cos(rad) * 110;
    const x2 = 128 + Math.sin(rad) * (110 - len);
    const y2 = 128 - Math.cos(rad) * (110 - len);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Label
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 175);

  // Needle (pointing to ~70% load)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  const needleRad = (45 * Math.PI) / 180;
  ctx.lineTo(128 + Math.sin(needleRad) * 90, 128 - Math.cos(needleRad) * 90);
  ctx.stroke();

  // Center pivot pin
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(128, 128, 10, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Digital LED Display Texture
export function createLedDisplayTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 256, 64);

  // Glowing cyan digital readout
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Pipe Flow Chevron Texture
export function createPipeChevronTexture(color: string = '#38bdf8'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = color;
  for (let x = 0; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x + 10, 12);
    ctx.lineTo(x + 36, 32);
    ctx.lineTo(x + 10, 52);
    ctx.lineTo(x + 24, 52);
    ctx.lineTo(x + 50, 32);
    ctx.lineTo(x + 24, 12);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
