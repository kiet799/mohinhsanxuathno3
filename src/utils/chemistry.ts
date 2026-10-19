import { ChemicalMetrics, EquipmentId, EquipmentInfo, SimulationParams } from '../types/simulation';

/**
 * Calculates chemical equilibrium, kinetic rate, and yields for Haber-Bosch process:
 * N2(g) + 3H2(g) <=> 2NH3(g)  ΔH° = -92.4 kJ/mol
 * 
 * Le Chatelier's Principle:
 * - Exothermic reaction: Increasing Temperature shifts equilibrium to the LEFT (lower equilibrium yield).
 *   However, high temperature is required for Arrhenius kinetics (activation energy to break N≡N triple bond 945 kJ/mol).
 * - Decreasing moles of gas (4 mol -> 2 mol): Increasing Pressure shifts equilibrium to the RIGHT (higher yield).
 * - Catalyst (porous iron Fe promoted with K2O/Al2O3): Speeds up attainment of equilibrium without shifting position.
 * - Gas Recycling: Increases overall plant conversion from ~15% single pass to ~97-98%!
 */
export function calculateChemicalMetrics(params: SimulationParams): ChemicalMetrics {
  const T = params.temperatureC; // in Celsius
  const P = params.pressureBar;   // in bar
  const TK = T + 273.15;         // in Kelvin

  // 1. Theoretical Equilibrium Single-Pass Yield (empirical Haber-Larson curve fit)
  // At 200 bar, 450°C -> approx 15-18% single pass yield
  // At 200 bar, 300°C -> equilibrium can reach ~50%, but kinetics are dead slow!
  // At 200 bar, 600°C -> equilibrium drops to ~4%
  // Pressure effect: Yield proportional to P^0.65
  const baseTempYield = 85.0 / (1 + Math.exp((T - 400) / 45)); // Sigmoid drop with temp
  const pressureFactor = Math.pow(P / 200, 0.62);
  const rawEquilibriumYield = Math.min(65, Math.max(1, baseTempYield * pressureFactor));

  // 2. Kinetic Reaction Rate (Arrhenius & Catalyst effect)
  // Activation energy Ea is huge without catalyst (~330 kJ/mol), reduced to ~160 kJ/mol with Fe catalyst
  let kineticRate = 0;
  if (params.catalystActive) {
    // With catalyst, rate picks up around 380°C and reaches optimal above 450°C
    kineticRate = 1 / (1 + Math.exp(-(T - 420) / 30));
  } else {
    // Without catalyst, rate is sluggish even at 550°C
    kineticRate = 0.05 + 0.15 / (1 + Math.exp(-(T - 520) / 25));
  }

  // Actual single-pass yield achieved under current flow & residence time:
  const singlePassYield = Number((rawEquilibriumYield * kineticRate).toFixed(1));

  // 3. Overall Yield with Recycle Loop
  // Formula: Yield_overall = 1 - (1 - singlePassYield/100) * (1 - recycleRate)
  // In real plants with 92% recycle, 15% single-pass achieves ~97% overall!
  const recycleRate = params.recycleEfficiency;
  const fractionConverted = singlePassYield / 100;
  let overallYieldFraction = 0;
  if (fractionConverted >= 0.01) {
    overallYieldFraction = fractionConverted / (fractionConverted + (1 - fractionConverted) * (1 - recycleRate));
  }
  const overallYield = Number((Math.min(99.2, overallYieldFraction * 100)).toFixed(1));

  // 4. Industrial Production Capacity (metric tons/day normalized to kg/hour in model)
  // Standard base: 1200 kg/h at 450°C, 200 bar with Fe catalyst
  const nh3ProductionKgH = Math.round(
    1200 * (overallYield / 97) * (P / 200) * kineticRate * (params.isPaused ? 0 : 1)
  );

  // 5. Energy consumption (MWh/ton) - higher pressure increases compressor energy;
  // lower temp requires external refrigeration for recycling; optimal is ~8-10 MWh/ton
  const energyCostMWhPerTon = Number(
    (7.5 + (P - 200) * 0.015 + (T < 400 ? (400 - T) * 0.02 : (T - 450) * 0.01)).toFixed(2)
  );

  // 6. Le Chatelier message & qualitative status
  let equilibriumState: ChemicalMetrics['equilibriumState'] = 'balanced';
  let leChatelierMessage = '';

  if (T > 520) {
    equilibriumState = 'favors_reactants';
    leChatelierMessage = `Nhiệt độ cao (${T}°C) làm chuyển dịch cân bằng theo chiều nghịch (tạo lại N₂ + H₂ do ΔH < 0), làm giảm hiệu suất 1 lần.`;
  } else if (P < 100) {
    equilibriumState = 'favors_reactants';
    leChatelierMessage = `Áp suất thấp (${P} bar) không thuận lợi cho phản ứng giảm thể tích khí (4 mol → 2 mol NH₃). Cần tăng áp suất.`;
  } else if (T < 380 && !params.catalystActive) {
    equilibriumState = 'favors_products';
    leChatelierMessage = `Cân bằng lý thuyết thuận lợi nhưng nhiệt độ quá thấp và thiếu xúc tác Fe, năng lượng hoạt hóa không đủ để bẻ gãy liên kết ba N≡N!`;
  } else if (P >= 200 && T >= 420 && T <= 480 && params.catalystActive) {
    equilibriumState = 'favors_products';
    leChatelierMessage = `Điều kiện công nghiệp tối ưu (${T}°C, ${P} bar, xúc tác Fe): Cân bằng hoàn hảo giữa tốc độ phản ứng (động học) và hiệu suất cân bằng (nhiệt động lực).`;
  } else {
    equilibriumState = 'balanced';
    leChatelierMessage = `Hệ thống đang hoạt động ở vùng thỏa hiệp công nghiệp. Dòng tuần hoàn khí giúp thu hồi N₂ và H₂ chưa phản ứng.`;
  }

  return {
    singlePassYield,
    overallYield,
    reactionRate: Math.round(kineticRate * 100),
    nh3ProductionKgH,
    energyCostMWhPerTon,
    equilibriumState,
    leChatelierMessage
  };
}

export const EQUIPMENT_DATA: Record<EquipmentId, EquipmentInfo> = {
  feed_storage: {
    id: 'feed_storage',
    nameVi: 'Khối Nạp Nguyên Liệu (N₂ & H₂)',
    nameEn: 'Feed Gas Preparation & Storage',
    roleVi: 'Cung cấp và hòa trộn hỗn hợp khí tinh khiết N₂ : H₂ theo đúng tỉ lệ mol 1:3',
    specs: [
      { label: 'Tỉ lệ khí', value: '1 mol N₂ : 3 mol H₂' },
      { label: 'Nguồn N₂', value: 'Chưng cất phân đoạn không khí lỏng' },
      { label: 'Nguồn H₂', value: 'Chuyển hóa khí thiên nhiên (Methane Steam Reforming)' },
      { label: 'Độ tinh khiết', value: '> 99.9% (loại bỏ hoàn toàn CO, CO₂, H₂S để tránh đầu độc xúc tác)' }
    ],
    descriptionVi: 'Khí Nitơ và Hydro được tinh chế nghiêm ngặt nhằm loại bỏ vết hợp chất chứa lưu huỳnh và carbon monoxide (CO) – những chất gây "ngộ độc" làm hỏng xúc tác sắt trong tháp phản ứng.',
    chemicalSignificanceVi: 'Tỉ lệ mol 1:3 đảm bảo phản ứng diễn ra theo đúng hệ số tỷ lượng của phương trình N₂ + 3H₂ ⇌ 2NH₃, tối đa hóa chuyển hóa.',
    position: [-8, 0, 0],
    color: '#3b82f6'
  },
  compressor: {
    id: 'compressor',
    nameVi: 'Máy Nén Cao Áp Đa Cấp',
    nameEn: 'Multi-Stage High Pressure Compressor',
    roleVi: 'Nén hỗn hợp khí từ áp suất thường lên đến 150 - 250 bar (15 - 25 MPa)',
    specs: [
      { label: 'Áp suất làm việc', value: '150 - 250 bar (15 - 25 MPa)' },
      { label: 'Công suất động cơ', value: '15 - 30 MW' },
      { label: 'Số cấp nén', value: '4 - 6 cấp với giàn làm mát trung gian' },
      { label: 'Vận hành', value: 'Tuần hoàn liên tục với khí hồi lưu' }
    ],
    descriptionVi: 'Máy nén piston hoặc tuabin đa cấp chịu áp lực cực cao. Vì quá trình nén sinh nhiều nhiệt nên giữa các cấp nén đều có bộ trao đổi nhiệt làm mát.',
    chemicalSignificanceVi: 'Theo nguyên lý Le Chatelier, phản ứng tổng hợp làm giảm số mol khí từ 4 mol (1 N₂ + 3 H₂) thành 2 mol (2 NH₃). Do đó, tăng áp suất dịch chuyển cân bằng mạnh mẽ sang chiều tạo thành NH₃.',
    position: [-3.8, 0, 0],
    color: '#10b981'
  },
  reactor: {
    id: 'reactor',
    nameVi: 'Tháp Phản Ứng Tổng Hợp (Lò Haber)',
    nameEn: 'Catalytic Synthesis Converter',
    roleVi: 'Nơi diễn ra phản ứng tổng hợp Amoniac trên các tầng xúc tác sắt xốp ở 400 - 500°C',
    specs: [
      { label: 'Nhiệt độ vận hành', value: '400 - 500 °C (Tối ưu ~450°C)' },
      { label: 'Chất xúc tác', value: 'Sắt xốp (Fe) biến tính với K₂O, Al₂O₃, CaO' },
      { label: 'Vỏ thép chịu áp', value: 'Thép hợp kim Crom-Molypden dày 100 - 200 mm' },
      { label: 'Cấu trúc bên trong', value: '3 - 4 tầng xúc tác + giàn ống trao đổi nhiệt thu hồi nhiệt phản ứng' }
    ],
    descriptionVi: 'Trái tim của toàn bộ nhà máy. Phản ứng N₂ + 3H₂ ⇌ 2NH₃ tỏa nhiệt (ΔH = -92.4 kJ/mol). Nhiệt tỏa ra được tái sử dụng để làm nóng khí mới đi vào qua hệ thống trao đổi nhiệt tích hợp.',
    chemicalSignificanceVi: 'Liên kết ba N≡N rất bền vững (năng lượng liên kết 945 kJ/mol). Xúc tác sắt giúp hấp phụ và bẻ gãy liên kết này ở nhiệt độ thực tế 450°C. Nếu nhiệt độ quá cao cân bằng sẽ dịch chuyển nghịch, còn quá thấp thì tốc độ phản ứng không đủ nhanh.',
    position: [0.8, 0, 0],
    color: '#ef4444'
  },
  condenser: {
    id: 'condenser',
    nameVi: 'Thiết Bị Làm Lạnh & Ngưng Tụ',
    nameEn: 'Heat Exchanger & Refrigeration Condenser',
    roleVi: 'Làm lạnh hỗn hợp khí sau phản ứng để hóa lỏng Amoniac tách khỏi khí N₂ và H₂',
    specs: [
      { label: 'Nhiệt độ ngưng tụ', value: '-20°C đến -33°C (ở áp suất cao hóa lỏng dễ hơn)' },
      { label: 'Điểm sôi NH₃', value: '-33.34 °C ở 1 atm' },
      { label: 'Điểm sôi N₂', value: '-195.8 °C' },
      { label: 'Điểm sôi H₂', value: '-252.87 °C' }
    ],
    descriptionVi: 'Sau khi ra khỏi tháp phản ứng, hỗn hợp khí gồm ~15-20% NH₃ và 80-85% N₂, H₂ dư được đưa qua giàn làm lạnh bằng nước rồi qua giàn sinh hàn sâu.',
    chemicalSignificanceVi: 'Do điểm sôi của NH₃ cao hơn rất nhiều so với N₂ và H₂, NH₃ sẽ ngưng tụ thành dạng lỏng, trong khi N₂ và H₂ vẫn ở thể khí. Điều này cho phép tách chọn lọc sản phẩm ra khỏi hệ.',
    position: [5.2, 0, 0],
    color: '#06b6d4'
  },
  separator: {
    id: 'separator',
    nameVi: 'Bình Tách & Bồn Chứa NH₃ Lỏng',
    nameEn: 'Ammonia Separator & Liquid Storage',
    roleVi: 'Tách Amoniac lỏng thu hồi ở đáy, gom khí N₂ và H₂ chưa phản ứng ở đỉnh',
    specs: [
      { label: 'Trạng thái sản phẩm', value: 'Amoniac lỏng khan (Anhydrous Liquid NH₃)' },
      { label: 'Độ tinh khiết', value: '99.8%' },
      { label: 'Dung tích bồn chứa', value: '500 - 5000 m³' },
      { label: 'Ứng dụng chính', value: 'Sản xuất phân đạm urê, axit nitric (HNO₃), chất nổ' }
    ],
    descriptionVi: 'Bình tách hình trụ đứng hoạt động theo nguyên lý trọng lực và xoáy lốc: NH₃ lỏng có khối lượng riêng lớn rơi xuống đáy và được xả vào bồn trữ sản phẩm; khí N₂ và H₂ nhẹ hơn bốc lên đỉnh.',
    chemicalSignificanceVi: 'Theo Le Chatelier, việc liên tục tách sản phẩm NH₃ ra khỏi hệ làm giảm nồng độ NH₃, thúc đẩy phản ứng tiếp tục theo chiều thuận khi khí được tuần hoàn.',
    position: [9.2, -0.4, 0],
    color: '#f59e0b'
  },
  recycle_loop: {
    id: 'recycle_loop',
    nameVi: 'Hệ Thống Đường Ống Tuần Hoàn Khí Dư',
    nameEn: 'Recycle Loop & Circulating Compressor',
    roleVi: 'Hồi lưu 100% khí N₂ và H₂ chưa phản ứng quay lại máy nén để tái tổng hợp',
    specs: [
      { label: 'Hiệu suất 1 chu kỳ', value: 'Chỉ khoảng 15% - 20%' },
      { label: 'Hiệu suất tổng thể', value: 'Đạt tới 97% - 98% nhờ vòng tuần hoàn' },
      { label: 'Tiết kiệm nguyên liệu', value: 'Tối ưu hóa kinh tế tối đa, không lãng phí N₂ và H₂' },
      { label: 'Xả khí trơ (Purge)', value: 'Xả định kỳ một lượng nhỏ khí Argon (Ar) để tránh tích tụ' }
    ],
    descriptionVi: 'Đây chính là phát minh đột phá của Carl Bosch: thay vì cố đạt hiệu suất 100% trong 1 lần nạp (điều bất khả thi về nhiệt động lực học), khí dư được dẫn quay trở lại đầu vào máy nén.',
    chemicalSignificanceVi: 'Nhờ vòng tuần hoàn khép kín này, hiệu suất chuyển hóa tổng của nguyên liệu đạt gần như tuyệt đối (~98%), biến quy trình Haber-Bosch thành quy trình hóa học công nghiệp quan trọng nhất thế kỷ 20.',
    position: [2.5, 3.8, 0],
    color: '#a855f7'
  }
};
