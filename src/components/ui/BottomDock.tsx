import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sliders,
  Scale,
  Camera,
  BookOpen,
  Play,
  Pause,
  Flame,
  Gauge,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CameraPreset, ChemicalMetrics, SimulationParams } from '../../types/simulation';
import { EquilibriumChart } from './EquilibriumChart';

interface BottomDockProps {
  params: SimulationParams;
  metrics: ChemicalMetrics;
  cameraPreset: CameraPreset;
  onUpdateParams: (patch: Partial<SimulationParams>) => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
}

type TabType = 'controls' | 'lechatelier' | 'cameras' | 'knowledge';

export const BottomDock: React.FC<BottomDockProps> = ({
  params,
  metrics,
  cameraPreset,
  onUpdateParams,
  onSelectCameraPreset,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('controls');

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4 pointer-events-auto">
      {/* Collapse / Expand Toggle Button */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900 border-t border-x border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white shadow-lg transition active:scale-95"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Mở bảng điều khiển' : 'Thu gọn điều khiển'}</span>
        </button>
      </div>

      {/* Main Dock Container */}
      {!isCollapsed && (
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  activeTab === 'controls'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Điều Khiển Quy Trình</span>
              </button>

              <button
                onClick={() => setActiveTab('lechatelier')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  activeTab === 'lechatelier'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Nguyên Lý Le Chatelier</span>
              </button>

              <button
                onClick={() => setActiveTab('cameras')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  activeTab === 'cameras'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Góc Nhìn Camera</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  activeTab === 'knowledge'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lịch Sử & Ý Nghĩa</span>
              </button>
            </div>

            {/* Play/Pause & Speed Quick Toggle */}
            <div className="flex items-center gap-2 pl-3 shrink-0">
              <button
                onClick={() => onUpdateParams({ isPaused: !params.isPaused })}
                className={`p-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
                  params.isPaused
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={params.isPaused ? 'Tiếp tục mô phỏng' : 'Tạm dừng mô phỏng'}
              >
                {params.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{params.isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
              </button>

              <div className="hidden sm:flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                {[0.5, 1.0, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateParams({ simSpeed: s })}
                    className={`px-2 py-0.5 rounded font-mono ${
                      params.simSpeed === s ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content Panes */}
          <div className="p-4 max-h-[42vh] overflow-y-auto">
            {/* TAB 1: PROCESS CONTROLS */}
            {activeTab === 'controls' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Temperature Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      Nhiệt Độ Lò Phản Ứng
                    </span>
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      {params.temperatureC}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="600"
                    step="5"
                    value={params.temperatureC}
                    onChange={(e) => onUpdateParams({ temperatureC: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>300°C (Quá chậm)</span>
                    <span className="text-amber-400 font-medium">450°C (Tối ưu)</span>
                    <span>600°C (Hiệu suất giảm)</span>
                  </div>
                </div>

                {/* Pressure Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                      Áp Suất Máy Nén
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {params.pressureBar} bar
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="350"
                    step="10"
                    value={params.pressureBar}
                    onChange={(e) => onUpdateParams({ pressureBar: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>50 bar (Thấp)</span>
                    <span className="text-emerald-400 font-medium">200 bar (Chuẩn)</span>
                    <span>350 bar (Cực cao)</span>
                  </div>
                </div>

                {/* Catalyst & Recycle Switch */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Xúc Tác Sắt (Fe) Xốp</div>
                      <div className="text-[10px] text-slate-400">Có K₂O, Al₂O₃ trợ xúc tác</div>
                    </div>
                    <button
                      onClick={() => onUpdateParams({ catalystActive: !params.catalystActive })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        params.catalystActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {params.catalystActive ? 'Đang dùng Fe' : 'Tắt xúc tác'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Vòng Tuần Hoàn Khí Dư</div>
                      <div className="text-[10px] text-purple-400">Tái thu hồi 98% N₂ + H₂</div>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateParams({
                          recycleEfficiency: params.recycleEfficiency > 0.5 ? 0 : 0.95,
                        })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        params.recycleEfficiency > 0.5
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {params.recycleEfficiency > 0.5 ? 'Bật (98%)' : 'Tắt vòng lặp'}
                    </button>
                  </div>
                </div>

                {/* Le Chatelier Status Alert Card across full width */}
                <div className="col-span-1 md:col-span-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">Phân tích Le Chatelier: </strong>
                      {metrics.leChatelierMessage}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onUpdateParams({
                        temperatureC: 450,
                        pressureBar: 200,
                        catalystActive: true,
                        recycleEfficiency: 0.95,
                      });
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-medium transition"
                  >
                    Chuẩn hóa Công nghiệp (450°C, 200 bar)
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: LE CHATELIER PRINCIPLE */}
            {activeTab === 'lechatelier' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EquilibriumChart
                  currentTemp={params.temperatureC}
                  currentPressure={params.pressureBar}
                  currentSinglePassYield={metrics.singlePassYield}
                />

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-400" />
                      Tại sao 450°C và 200 bar là "Sự Thỏa Hiệp Hoàn Hảo"?
                    </h4>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Phản ứng tổng hợp Amoniac là <strong className="text-rose-400">phản ứng tỏa nhiệt (ΔH &lt; 0)</strong> và <strong className="text-blue-400">giảm thể tích (4 mol khí → 2 mol khí)</strong>:
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-emerald-400">1. Áp suất cao (200 bar): </strong>
                      Dịch chuyển cân bằng sang phía ít phân tử khí hơn (2 mol NH₃), làm tăng hiệu suất. Giới hạn ở 200 bar vì thành thép lò không chịu nổi chi phí quá đắt nếu lên 1000 bar.
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-amber-400">2. Nhiệt độ tối ưu (450°C): </strong>
                      Về cân bằng, nhiệt độ càng thấp càng tạo nhiều NH₃. Nhưng ở nhiệt độ thấp, tốc độ va chạm phân tử quá chậm, không bẻ nổi liên kết ba N≡N. 450°C là điểm giao thoa tối ưu giữa tốc độ (động học) và cân bằng (nhiệt động).
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-purple-400">3. Vòng tuần hoàn khí (Recycle Loop): </strong>
                      Tuy 1 lần qua lò chỉ được ~15-18% NH₃, nhưng khí N₂ và H₂ dư được làm mát tách NH₃ lỏng rồi bơm ngược lại lò, nâng hiệu suất toàn chu trình lên tới <strong className="text-white">98%</strong>!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CAMERA PRESETS */}
            {activeTab === 'cameras' && (
              <div>
                <div className="text-xs text-slate-400 mb-2">
                  Chọn góc nhìn camera được hiệu chỉnh sẵn để quan sát cận cảnh từng cụm thiết bị:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => onSelectCameraPreset('overview')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'overview'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Toàn Cảnh Nhà Máy</span>
                    <span className="text-[10px] opacity-75 font-normal">Góc nhìn 3D bao quát</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('feed')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'feed'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>1. Khối Nạp N₂ & H₂</span>
                    <span className="text-[10px] opacity-75 font-normal">Bình chứa & van phối trộn</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('compressor')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'compressor'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>2. Máy Nén Cao Áp</span>
                    <span className="text-[10px] opacity-75 font-normal">Piston & bánh đà quay</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('reactor')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'reactor'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>3. Tháp Tổng Hợp (Lò Haber)</span>
                    <span className="text-[10px] opacity-75 font-normal">Tầng xúc tác sắt xốp 450°C</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('condenser')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'condenser'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>4. Giàn Làm Lạnh & Ngưng Tụ</span>
                    <span className="text-[10px] opacity-75 font-normal">Hóa lỏng NH₃ (-33°C)</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('separator')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'separator'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>5. Bình Tách & Bồn Cầu NH₃</span>
                    <span className="text-[10px] opacity-75 font-normal">Ống thủy đo mức chất lỏng</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('recycle')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'recycle'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>6. Vòng Tuần Hoàn Khí Dư</span>
                    <span className="text-[10px] opacity-75 font-normal">Ống tím hồi lưu khí dư</span>
                  </button>

                  <button
                    onClick={() => onSelectCameraPreset('topdown')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                      cameraPreset === 'topdown'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Từ Trên Xuống (Sơ Đồ P&ID)</span>
                    <span className="text-[10px] opacity-75 font-normal">Bản vẽ mặt bằng nhà máy</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: HISTORICAL & INDUSTRIAL SIGNIFICANCE */}
            {activeTab === 'knowledge' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="font-bold text-amber-400 mb-1">Fritz Haber (1868 – 1934)</div>
                  <div className="text-[11px] text-slate-400 mb-2">Giải Nobel Hóa học năm 1918</div>
                  <p className="text-[11px] leading-relaxed">
                    Nhà hóa học người Đức đã thành công tổng hợp amoniac trong phòng thí nghiệm vào năm 1909 với xúc tác Osmi và Urani ở áp suất cao, giải quyết bài toán "cố định nitơ từ khí quyển" mà giới khoa học từng bó tay.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="font-bold text-blue-400 mb-1">Carl Bosch (1874 – 1940)</div>
                  <div className="text-[11px] text-slate-400 mb-2">Giải Nobel Hóa học năm 1931</div>
                  <p className="text-[11px] leading-relaxed">
                    Kỹ sư trưởng tại BASF đã mở rộng quy mô phòng thí nghiệm lên sản xuất công nghiệp hàng triệu tấn: phát minh vỏ thép chống giòn hydro, tìm ra xúc tác sắt giá rẻ và thiết kế hệ thống tuần hoàn khí khép kín.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="font-bold text-emerald-400 mb-1">"Bánh Mì Từ Không Khí"</div>
                  <div className="text-[11px] text-slate-400 mb-2">Nuôi sống 50% dân số toàn cầu</div>
                  <p className="text-[11px] leading-relaxed">
                    Hơn 80% lượng amoniac sản xuất ra được dùng làm phân đạm (urê, ammonium nitrate). Ước tính nếu không có quy trình Haber-Bosch, năng suất nông nghiệp hiện nay chỉ đủ nuôi khoảng 4 tỷ người.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
