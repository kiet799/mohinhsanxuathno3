export type EquipmentId =
  | 'feed_storage'
  | 'compressor'
  | 'reactor'
  | 'condenser'
  | 'separator'
  | 'recycle_loop';

export interface EquipmentInfo {
  id: EquipmentId;
  nameVi: string;
  nameEn: string;
  roleVi: string;
  specs: {
    label: string;
    value: string;
  }[];
  descriptionVi: string;
  chemicalSignificanceVi: string;
  position: [number, number, number];
  color: string;
}

export interface SimulationParams {
  temperatureC: number;     // 300 - 600 °C (typical 450°C)
  pressureBar: number;      // 50 - 350 bar (typical 200 bar)
  catalystActive: boolean;  // Porous Fe + K2O/Al2O3
  ratioN2H2: number;        // Stoichiometric 1:3 ratio = 3.0
  recycleEfficiency: number;// 0 to 0.98 (recirculation rate)
  simSpeed: number;         // 0.5x, 1x, 2x
  isPaused: boolean;
  soundEnabled: boolean;
  xrayCutaway: boolean;
  showLabels: boolean;
  showParticles: boolean;
}

export interface ChemicalMetrics {
  singlePassYield: number;   // % (e.g. 15 - 20%)
  overallYield: number;      // % (e.g. 96 - 98% with recycle loop)
  reactionRate: number;      // relative kinetic rate 0 - 100%
  nh3ProductionKgH: number;  // Production rate in kg/hour
  energyCostMWhPerTon: number; // MWh/ton of NH3
  equilibriumState: 'favors_products' | 'balanced' | 'favors_reactants';
  leChatelierMessage: string;
}

export type CameraPreset =
  | 'overview'
  | 'feed'
  | 'compressor'
  | 'reactor'
  | 'condenser'
  | 'separator'
  | 'recycle'
  | 'topdown';
