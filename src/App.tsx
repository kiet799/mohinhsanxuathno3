import React, { useEffect, useState } from 'react';
import { CameraPreset, EquipmentId, SimulationParams } from './types/simulation';
import { calculateChemicalMetrics } from './utils/chemistry';
import { audioEngine } from './utils/audio';
import { ThreeViewport } from './components/3d/ThreeViewport';
import { Header } from './components/ui/Header';
import { BottomDock } from './components/ui/BottomDock';
import { EquipmentModal } from './components/ui/EquipmentModal';
import { MolecularViewerModal } from './components/3d/MolecularViewerModal';

export default function App() {
  const [params, setParams] = useState<SimulationParams>({
    temperatureC: 450,
    pressureBar: 200,
    catalystActive: true,
    ratioN2H2: 3.0,
    recycleEfficiency: 0.95,
    simSpeed: 1.0,
    isPaused: false,
    soundEnabled: false,
    xrayCutaway: false,
    showLabels: true,
    showParticles: true,
  });

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentId | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [isMolecularModalOpen, setIsMolecularModalOpen] = useState<boolean>(false);

  // Compute thermodynamic chemical equilibrium & plant metrics
  const metrics = calculateChemicalMetrics(params);

  // Audio engine synchronization
  useEffect(() => {
    audioEngine.setMuted(!params.soundEnabled);
  }, [params.soundEnabled]);

  useEffect(() => {
    audioEngine.updateParameters(params.simSpeed, params.pressureBar, params.isPaused);
  }, [params.simSpeed, params.pressureBar, params.isPaused, params.soundEnabled]);

  const handleUpdateParams = (patch: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
    if (params.soundEnabled) {
      audioEngine.playClick();
    }
  };

  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setSelectedEquipment(null);
    if (params.soundEnabled) {
      audioEngine.playClick();
    }
  };

  const handleFocusEquipment = (id: EquipmentId) => {
    setSelectedEquipment(id);
    const presetKey =
      id === 'feed_storage'
        ? 'feed'
        : id === 'compressor'
        ? 'compressor'
        : id === 'reactor'
        ? 'reactor'
        : id === 'condenser'
        ? 'condenser'
        : id === 'separator'
        ? 'separator'
        : id === 'recycle_loop'
        ? 'recycle'
        : 'overview';
    setCameraPreset(presetKey);
    if (params.soundEnabled) {
      audioEngine.playClick();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Header Bar */}
      <Header
        params={params}
        metrics={metrics}
        onUpdateParams={handleUpdateParams}
        onOpenMolecularModal={() => setIsMolecularModalOpen(true)}
        onResetCamera={() => handleSelectCameraPreset('overview')}
      />

      {/* 3D Simulation WebGL Viewport */}
      <div className="w-full h-full">
        <ThreeViewport
          params={params}
          selectedEquipment={selectedEquipment}
          onSelectEquipment={(id) => {
            setSelectedEquipment(id);
            if (id && params.soundEnabled) {
              audioEngine.playClick();
            }
          }}
          cameraPreset={cameraPreset}
        />
      </div>

      {/* Collapsible Bottom Control Dock */}
      <BottomDock
        params={params}
        metrics={metrics}
        cameraPreset={cameraPreset}
        onUpdateParams={handleUpdateParams}
        onSelectCameraPreset={handleSelectCameraPreset}
      />

      {/* Equipment Detailed Technical Inspection Modal */}
      <EquipmentModal
        equipmentId={selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        onFocusCamera={handleFocusEquipment}
      />

      {/* 3D Molecular / Subatomic Mode Modal */}
      <MolecularViewerModal
        isOpen={isMolecularModalOpen}
        onClose={() => setIsMolecularModalOpen(false)}
      />
    </div>
  );
}
