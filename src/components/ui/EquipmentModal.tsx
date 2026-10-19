import React from 'react';
import { X, ExternalLink, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EQUIPMENT_DATA } from '../../utils/chemistry';
import { EquipmentId } from '../../types/simulation';

interface EquipmentModalProps {
  equipmentId: EquipmentId | null;
  onClose: () => void;
  onFocusCamera: (id: EquipmentId) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipmentId,
  onClose,
  onFocusCamera,
}) => {
  if (!equipmentId) return null;
  const data = EQUIPMENT_DATA[equipmentId];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <div>
              <h2 className="text-lg font-bold text-white">{data.nameVi}</h2>
              <span className="text-xs text-slate-400 font-mono">{data.nameEn}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFocusCamera(equipmentId)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition"
              title="Căn góc camera vào thiết bị này"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Góc nhìn
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* Role statement */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-300">Vai trò trong quy trình: </strong>
              {data.roleVi}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Mô tả Kỹ thuật
            </h3>
            <p className="leading-relaxed text-xs text-slate-300">{data.descriptionVi}</p>
          </div>

          {/* Chemical significance */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Ý Nghĩa Hóa Học & Nguyên Lý Le Chatelier
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              {data.chemicalSignificanceVi}
            </p>
          </div>

          {/* Engineering Specifications Grid */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Thông số Kỹ thuật Thực tế
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.specs.map((spec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-800/60 border border-slate-800 flex flex-col justify-between"
                >
                  <span className="text-[11px] text-slate-400">{spec.label}</span>
                  <span className="text-xs font-semibold text-white mt-1">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
