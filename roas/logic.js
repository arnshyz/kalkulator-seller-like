const TARGET_NET_PCT = 0.1;
const PROCESS_FEE = 1250;

const statusStyles = {
  Target: {
    badge: 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    dot: 'bg-emerald-400',
    description: 'Margin bersih sudah memenuhi target yang ditetapkan.'
  },
  'Profit Tipis': {
    badge: 'border border-amber-400/40 bg-amber-500/10 text-amber-100',
    dot: 'bg-amber-400',
    description: 'Margin masih positif tetapi belum mencapai target yang diinginkan.'
  },
  Rugi: {
    badge: 'border border-rose-400/40 bg-rose-500/10 text-rose-200',
    dot: 'bg-rose-400',
    description: 'Margin negatif — biaya lebih besar dari pendapatan, perlu evaluasi ulang.'
  }
};

const categoryOptions = [
  { value: 'elektronik', label: 'Elektronik & Gadget · 5,5%', adminPct: 0.055 },
  { value: 'fashion', label: 'Fashion & Aksesoris · 7,0%', adminPct: 0.07 },
  { value: 'kecantikan', label: 'Kecantikan & Perawatan · 6,5%', adminPct: 0.065 },
  { value: 'rumah', label: 'Perlengkapan Rumah · 6,0%', adminPct: 0.06 },
  { value: 'otomotif', label: 'Otomotif & Hobi · 5,0%', adminPct: 0.05 }
];

const goXtraOptions = [
  { value: 'none', label: 'Tidak Ikut Program', pct: 0 },
  { value: 'lite', label: 'GO XTRA Lite · 1,5%', pct: 0.015 },
  { value: 'plus', label: 'GO XTRA Plus · 2,5%', pct: 0.025 },
  { value: 'max', label: 'GO XTRA Max · 3,5%', pct: 0.035 }
];

const promoOptions = [
  { value: 'none', label: 'Tidak Ikut Program', pct: 0 },
  { value: 'hemat', label: 'Promo XTRA Hemat · 2,0%', pct: 0.02 },
  { value: 'flash', label: 'Promo XTRA Flash · 3,0%', pct: 0.03 },
  { value: 'power', label: 'Promo XTRA Power · 4,5%', pct: 0.045 }
];

const liveOptions = [
  { value: 'none', label: 'Tidak Ikut Live', pct: 0 },
  { value: 'starter', label: 'Live Starter · 1,0%', pct: 0.01 },
  { value: 'pro', label: 'Live Pro · 1,5%', pct: 0.015 },
  { value: 'elite', label: 'Live Elite · 2,0%', pct: 0.02 }
];

function statusBadge(label, size = 'sm') {
  const style = statusStyles[label] || statusStyles['Profit Tipis'];
  const sizeClass = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';
  return `<span class="inline-flex items-center gap-2 rounded-full font-semibold ${sizeClass} ${style.badge}">` +
    `<span class="h-2 w-2 rounded-full ${style.dot}"></span>${label}</span>`;
}

function tagBadge(label, tone) {
  const palette = {
    target: 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    bep: 'border border-amber-400/40 bg-amber-500/10 text-amber-200'
  };
  const classes = palette[tone] || 'border border-white/20 bg-white/10 text-slate-200';
  return `<span class="ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${classes}">${label}</span>`;
}

function idr(x) {
  if (!Number.isFinite(x)) return '—';
  return new Intl.NumberFormat('id-ID').format(Math.round(x));
}

function populateSelect(id, options) {
  const select = document.getElementById(id);
  select.innerHTML = '';
  options.forEach((opt, idx) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (idx === 0) option.selected = true;
    select.appendChild(option);
  });
}

function getSelectedOption(id, options) {
  const select = document.getElementById(id);
  return options.find((opt) => opt.value === select.value) || options[0];
}

function evaluateStatus(metrics, targetMargin) {
  if (!Number.isFinite(metrics.profit) || !Number.isFinite(metrics.margin)) {
    return { label: 'Rugi', ...statusStyles.Rugi };
  }
  if (metrics.margin >= targetMargin - 1e-6) {
    return { label: 'Target', ...statusStyles.Target };
  }
  if (metrics.profit >= 0) {
    return { label: 'Profit Tipis', ...statusStyles['Profit Tipis'] };
  }
  return { label: 'Rugi', ...statusStyles.Rugi };
}

function computeDerived(inputs) {
  const adminFee = inputs.price * inputs.category.adminPct;
  const goXtraFee = inputs.price * inputs.goXtra.pct;
  const promoFee = inputs.price * inputs.promo.pct;
  const liveFee = inputs.price * inputs.live.pct;
  const totalFees = adminFee + goXtraFee + promoFee + liveFee + PROCESS_FEE;
  const grossProfit = inputs.price - inputs.cost - totalFees;
  return { adminFee, goXtraFee, promoFee, liveFee, totalFees, grossProfit };
}

function roasForMargin(price, cost, totalFees, desiredMargin) {
  const targetProfit = price * desiredMargin;
  const adRoom = price - cost - totalFees - targetProfit;
  if (adRoom <= 0) return Infinity;
  return price / adRoom;
}

function profitAtRoas(price, grossProfit, roas) {
  if (roas <= 0) return { adSpend: Infinity, profit: -Infinity, margin: -Infinity };
  const adSpend = price / roas;
  const profit = grossProfit - adSpend;
  const margin = price === 0 ? 0 : profit / price;
  return { adSpend, profit, margin };
}

function buildAnalysisList(inputs, derived, targetMetrics) {
  const items = [
    { label: 'Modal Produk', value: inputs.cost },
    { label: 'Biaya Admin Shopee', value: derived.adminFee },
    { label: 'Biaya Program GO XTRA', value: derived.goXtraFee },
    { label: 'Biaya Program Promo XTRA', value: derived.promoFee },
    { label: 'Biaya Penjualan Live', value: derived.liveFee },
    { label: 'Biaya Proses Pesanan FIX (Rp 1.250)', value: PROCESS_FEE },
    { label: 'Total Biaya Layanan', value: derived.totalFees, accent: 'muted' },
    { label: 'Profit Kotor (Sebelum Iklan)', value: derived.grossProfit, accent: derived.grossProfit >= 0 ? 'positive' : 'negative' },
    { label: 'Profit Setelah Iklan (Target ROAS)', value: targetMetrics.profit, accent: targetMetrics.profit >= 0 ? 'positive' : 'negative' }
  ];

  return items.map((item) => {
    const tone = item.accent === 'positive' ? 'text-emerald-200' : item.accent === 'negative' ? 'text-rose-200' : 'text-slate-100';
    const bg = item.accent ? 'bg-slate-950/50 border-white/10' : 'bg-slate-950/30 border-white/5';
    return `<div class="flex items-center justify-between rounded-2xl border ${bg} px-4 py-3">
      <span class="text-sm text-slate-300">${item.label}</span>
      <span class="text-sm font-semibold ${tone}">Rp ${idr(item.value)}</span>
    </div>`;
  }).join('');
}

function render() {
  const price = parseFloat(document.getElementById('price').value || '0');
  const cost = parseFloat(document.getElementById('cost').value || '0');
  const category = getSelectedOption('category', categoryOptions);
  const goXtra = getSelectedOption('goXtra', goXtraOptions);
  const promo = getSelectedOption('promo', promoOptions);
  const live = getSelectedOption('live', liveOptions);

  const inputs = { price, cost, category, goXtra, promo, live, targetNetPct: TARGET_NET_PCT };
  const derived = computeDerived(inputs);
  const bepRoas = roasForMargin(price, cost, derived.totalFees, 0);
  const targetRoas = roasForMargin(price, cost, derived.totalFees, inputs.targetNetPct);
  const targetMetrics = profitAtRoas(price, derived.grossProfit, targetRoas);
  const status = evaluateStatus(targetMetrics, inputs.targetNetPct);
  const isLicensed = document.body.classList.contains('license-active');

  const targetValueEl = document.getElementById('targetValue');
  const targetBadgeEl = document.getElementById('targetBadge');
  const targetDescEl = document.getElementById('targetDescription');
  const targetProfitEl = document.getElementById('targetProfitValue');
  const bepValueEl = document.getElementById('bepValue');
  const adBudgetEl = document.getElementById('adBudgetValue');
  const analysisEl = document.getElementById('analysisList');

  if (Number.isFinite(targetRoas)) {
    targetValueEl.textContent = targetRoas.toFixed(2);
  } else {
    targetValueEl.textContent = '—';
  }
  targetBadgeEl.innerHTML = statusBadge(status.label, 'lg');
  targetDescEl.textContent = isLicensed
    ? `Rekomendasi dihitung dengan target margin bersih ${(inputs.targetNetPct * 100).toFixed(0)}% per unit. ${status.description}`
    : 'Masukkan lisensi Seller Pro untuk melihat rekomendasi target ROAS secara penuh.';

  targetProfitEl.textContent = `Rp ${idr(price * inputs.targetNetPct)}`;
  bepValueEl.textContent = Number.isFinite(bepRoas) ? `${bepRoas.toFixed(2)} : 1` : 'Tidak terdefinisi';
  adBudgetEl.textContent = `Rp ${idr(derived.grossProfit)}`;

  analysisEl.innerHTML = buildAnalysisList(inputs, derived, targetMetrics);

  const tbody = document.querySelector('#simTable tbody');
  tbody.innerHTML = '';

  const baseRoas = [20, 12, 10, 7, 5, 4, 3.5, 3.2, 3, 2.8, 2.6, 2.4, 2.2, 2, 1.8, 1.5];
  const dynamicRoas = [];
  if (Number.isFinite(targetRoas)) dynamicRoas.push(parseFloat(targetRoas.toFixed(2)));
  if (Number.isFinite(bepRoas)) dynamicRoas.push(parseFloat(bepRoas.toFixed(2)));
  const roasValues = Array.from(new Set([...baseRoas, ...dynamicRoas]
    .filter((v) => Number.isFinite(v) && v > 0)))
    .sort((a, b) => b - a);

  roasValues.forEach((value) => {
    const metrics = profitAtRoas(price, derived.grossProfit, value);
    const rowStatus = evaluateStatus(metrics, inputs.targetNetPct);
    const isTarget = Number.isFinite(targetRoas) && Math.abs(value - targetRoas) < 0.05;
    const isBep = Number.isFinite(bepRoas) && Math.abs(value - bepRoas) < 0.05;

    const tr = document.createElement('tr');
    tr.className = `transition-colors ${isTarget ? 'bg-emerald-500/5' : isBep ? 'bg-amber-500/5' : 'hover:bg-white/5'}`;

    const roasTag = isTarget ? tagBadge('Target ROAS', 'target') : isBep ? tagBadge('ROAS BEP', 'bep') : '';
    tr.innerHTML = `
      <td class="px-4 py-3">
        <span class="font-medium text-white">${value.toFixed(2)} : 1</span>
        ${roasTag}
      </td>
      <td class="px-4 py-3 text-right text-slate-200">Rp ${idr(metrics.adSpend)}</td>
      <td class="px-4 py-3 text-right ${metrics.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}">Rp ${idr(metrics.profit)}</td>
      <td class="px-4 py-3 text-right text-slate-200">${(metrics.margin * 100).toFixed(2)}%</td>
      <td class="px-4 py-3 text-center">${statusBadge(rowStatus.label)}</td>`;

    tbody.appendChild(tr);
  });
}

populateSelect('category', categoryOptions);
populateSelect('goXtra', goXtraOptions);
populateSelect('promo', promoOptions);
populateSelect('live', liveOptions);

['price', 'cost', 'category', 'goXtra', 'promo', 'live'].forEach((id) => {
  document.getElementById(id).addEventListener('input', render);
  document.getElementById(id).addEventListener('change', render);
});

render();
