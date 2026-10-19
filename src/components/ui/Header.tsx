import React from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Tag,
  Waves,
  Play,
  Pause,
  Layers,
} from 'lucide-react';
import { ChemicalMetrics, SimulationParams } from '../../types/simulation';

interface HeaderProps {
  params: SimulationParams;
  metrics: ChemicalMetrics;
  onUpdateParams: (patch: Partial<SimulationParams>) => void;
  onOpenMolecularModal: () => void;
  onResetCamera: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  params,
  metrics,
  onUpdateParams,
  onOpenMolecularModal,
  onResetCamera,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex flex-col md:flex-row items-center justify-between px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md gap-3 pointer-events-auto">
      {/* Title & Chemical Equation */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
          NH₃
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight">
              Mô Hình 3D: Quy Trình Haber - Bosch
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
              Tổng hợp Amoniac
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono tracking-wide mt-0.5">
            N₂(k) + 3H₂(k) ⇌ 2NH₃(k) &nbsp;|&nbsp; <span className="text-rose-400">ΔH = -92.4 kJ/mol</span>
          </div>
        </div>
      </div>

      {/* Real-time KPI Badges */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Hiệu suất 1 lần:</span>
          <span className="text-xs font-bold text-amber-400 font-mono">{metrics.singlePassYield}%</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-emerald-500/30 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Hiệu suất tổng (Tuần hoàn):</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">{metrics.overallYield}%</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Sản lượng:</span>
          <span className="text-xs font-bold text-white font-mono">{metrics.nh3ProductionKgH.toLocaleString()} kg/h</span>
        </div>
      </div>

      {/* View & Simulation Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Molecular 3D Viewer */}
        <button
          onClick={onOpenMolecularModal}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cơ chế Phân tử 3D</span>
        </button>

        {/* X-Ray Cutaway */}
        <button
          onClick={() => onUpdateParams({ xrayCutaway: !params.xrayCutaway })}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
            params.xrayCutaway
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Nhìn xuyên tháp phản ứng (lớp xúc tác Fe)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nhìn xuyên</span>
        </button>

        {/* Flow Particles Toggle */}
        <button
          onClick={() => onUpdateParams({ showParticles: !params.showParticles })}
          className={`p-1.5 rounded-lg text-xs border transition ${
            params.showParticles
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
          title="Bật/Tắt dòng hạt khí & lỏng"
        >
          <Waves className="w-4 h-4" />
        </button>

        {/* Labels Toggle */}
        <button
          onClick={() => onUpdateParams({ showLabels: !params.showLabels })}
          className={`p-1.5 rounded-lg text-xs border transition ${
            params.showLabels
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
          title="Bật/Tắt nhãn thiết bị"
        >
          <Tag className="w-4 h-4" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => onUpdateParams({ soundEnabled: !params.soundEnabled })}
          className={`p-1.5 rounded-lg text-xs border transition ${
            params.soundEnabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
          title={params.soundEnabled ? 'Tắt âm thanh mô phỏng' : 'Bật âm thanh mô phỏng'}
        >
          {params.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Reset Camera */}
        <button
          onClick={onResetCamera}
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Đặt lại góc nhìn toàn cảnh"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
