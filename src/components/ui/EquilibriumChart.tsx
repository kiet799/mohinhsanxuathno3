import React from 'react';

interface EquilibriumChartProps {
  currentTemp: number;
  currentPressure: number;
  currentSinglePassYield: number;
}

export const EquilibriumChart: React.FC<EquilibriumChartProps> = ({
  currentTemp,
  currentPressure,
  currentSinglePassYield,
}) => {
  // Generate points for 3 pressure curves: 100 bar, 200 bar (standard), 300 bar
  const temps = [300, 350, 400, 450, 500, 550, 600];
  const chartWidth = 360;
  const chartHeight = 160;
  const padLeft = 40;
  const padBottom = 25;
  const padTop = 15;
  const padRight = 15;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const tempToX = (t: number) => padLeft + ((t - 300) / (600 - 300)) * innerW;
  const yieldToY = (y: number) => padTop + innerH - (y / 70) * innerH;

  const getTheoreticalYield = (t: number, p: number) => {
    const base = 85.0 / (1 + Math.exp((t - 400) / 45));
    const factor = Math.pow(p / 200, 0.62);
    return Math.min(65, Math.max(1, base * factor));
  };

  const makePath = (pressure: number) => {
    return temps
      .map((t, idx) => {
        const yVal = getTheoreticalYield(t, pressure);
        const x = tempToX(t);
        const y = yieldToY(yVal);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const curX = tempToX(currentTemp);
  const curY = yieldToY(currentSinglePassYield);

  return (
    <div className="w-full bg-slate-950/60 rounded-xl p-3 border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">
          Đường cong Cân bằng Nhiệt động lực (% NH₃ theo Nhiệt độ)
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> 100 bar
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> 200 bar (chuẩn)
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> 300 bar
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
        {/* Y-axis gridlines */}
        {[0, 20, 40, 60].map((val) => {
          const y = yieldToY(val);
          return (
            <g key={val}>
              <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="#334155" strokeDasharray="2,2" strokeWidth="0.8" />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {val}%
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {[300, 400, 500, 600].map((t) => {
          const x = tempToX(t);
          return (
            <g key={t}>
              <line x1={x} y1={padTop + innerH} x2={x} y2={padTop + innerH + 4} stroke="#475569" strokeWidth="1" />
              <text x={x} y={padTop + innerH + 15} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {t}°C
              </text>
            </g>
          );
        })}

        {/* Curves */}
        <path d={makePath(100)} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d={makePath(200)} fill="none" stroke="#10b981" strokeWidth="2.2" />
        <path d={makePath(300)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Current Operating Point */}
        <circle cx={curX} cy={curY} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
        <text x={curX} y={Math.max(12, curY - 9)} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f43f5e">
          {currentSinglePassYield}% ({currentTemp}°C)
        </text>
      </svg>
      <p className="text-[10px] text-slate-400 mt-1 italic">
        * Chú thích: Nhiệt độ thấp cho % NH₃ cân bằng cao hơn, nhưng cần ~450°C để phản ứng đạt tốc độ khả thi kinh tế.
      </p>
    </div>
  );
};
