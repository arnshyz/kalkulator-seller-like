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

function computeGaugeAngle(value, refs = []) {
  const candidates = refs.filter((v) => Number.isFinite(v) && v > 0);
  if (Number.isFinite(value) && value > 0) {
    candidates.push(value);
  }
  let min = candidates.length ? Math.min(...candidates, 1) : 1;
  let max = candidates.length ? Math.max(...candidates, min + 1, 3) : 3;
  min = Math.min(min, 1);
  max = Math.max(max, min + 1.2);
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return 0;
  }
  let val = Number.isFinite(value) && value > 0 ? value : min;
  val = Math.min(Math.max(val, min), max);
  const ratio = (val - min) / span;
  const angle = -130 + ratio * 260;
  return Math.max(-130, Math.min(130, angle));
}

function evaluateStatus(inputs, metrics) {
  if (!isFinite(metrics.profit) || !isFinite(metrics.margin)) {
    return { label: 'Rugi', ...statusStyles.Rugi };
  }
  if (metrics.margin >= inputs.targetNetPct - 1e-6) {
    return { label: 'Target', ...statusStyles.Target };
  }
  if (metrics.profit >= 0) {
    return { label: 'Profit Tipis', ...statusStyles['Profit Tipis'] };
  }
  return { label: 'Rugi', ...statusStyles.Rugi };
}

function idr(x) { return new Intl.NumberFormat('id-ID').format(Math.round(x || 0)); }
function fv(id) { return parseFloat(document.getElementById(id).value || '0'); }

function fee(inputs) {
  const pct = inputs.adminPct + inputs.programPct + inputs.livePct;
  const percentComponent = inputs.price * pct;
  const flatComponent = inputs.adminFlat;
  const feeTaxed = (percentComponent + flatComponent) * (1 + inputs.ppnFeePct);
  return feeTaxed + inputs.procFlat;
}

function profitGivenRoas(inputs, roas) {
  const ad = roas <= 0 ? Infinity : inputs.price / roas;
  const fees = fee(inputs);
  const profit = inputs.price - inputs.hpp - fees - ad;
  const margin = inputs.price === 0 ? 0 : profit / inputs.price;
  return { adSpend: ad, profit, margin };
}

function roasBEP(inputs) {
  const f = fee(inputs);
  const adBEP = inputs.price - inputs.hpp - f;
  if (adBEP <= 0) return { roas: Infinity, f };
  return { roas: inputs.price / adBEP, f };
}

function targetRoas(inputs) {
  const f = fee(inputs);
  const targetProfit = inputs.targetNetPct * inputs.price;
  const adTarget = inputs.price - inputs.hpp - f - targetProfit;
  if (adTarget <= 0) return { roas: Infinity, f };
  return { roas: inputs.price / adTarget, f };
}

function render() {
  const inputs = {
    price: fv('price'), hpp: fv('hpp'), procFlat: fv('procFlat'),
    adminPct: fv('adminPct') / 100, programPct: fv('programPct') / 100, livePct: fv('livePct') / 100,
    ppnFeePct: fv('ppnFeePct') / 100, adminFlat: fv('adminFlat'),
    targetNetPct: fv('targetNetPct') / 100
  };
  const bep = roasBEP(inputs);
  const tgt = targetRoas(inputs);
  const totalFee = fee(inputs);
  const box = document.getElementById('results');
  function fmt(x) { return (!isFinite(x) || x <= 0) ? 'Tidak terdefinisi' : x.toFixed(2) + ' : 1'; }

  box.innerHTML = `
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p class="text-xs uppercase tracking-wide text-slate-400">Fee marketplace / unit</p>
        <p class="mt-2 text-2xl font-semibold text-white">Rp ${idr(totalFee)}</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p class="text-xs uppercase tracking-wide text-slate-400">ROAS BEP</p>
        <p class="mt-2 text-2xl font-semibold text-white">${fmt(bep.roas)}</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p class="text-xs uppercase tracking-wide text-slate-400">ROAS Target (${(inputs.targetNetPct * 100).toFixed(1)}%)</p>
        <p class="mt-2 text-2xl font-semibold text-white">${fmt(tgt.roas)}</p>
      </div>
    </div>
    <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p class="text-sm font-semibold text-white">Indikator Status</p>
        <p id="statusDescription" class="mt-1 text-xs text-slate-400"></p>
      </div>
      <div id="statusHighlight" class="mt-3 sm:mt-0"></div>
    </div>
    <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p class="text-[11px] uppercase tracking-wide text-slate-400">Legenda Status</p>
      <div id="statusLegend" class="mt-3 flex flex-wrap gap-2 text-xs"></div>
    </div>
  `;

  let highlightValue = Number.isFinite(tgt.roas) ? tgt.roas : (Number.isFinite(bep.roas) ? bep.roas : 0);
  let highlightCaption = '';
  if (Number.isFinite(highlightValue) && highlightValue > 0) {
    highlightCaption = `ROAS ${highlightValue.toFixed(2)} : 1`;
  } else if (Number.isFinite(bep.roas) && bep.roas > 0) {
    highlightValue = bep.roas;
    highlightCaption = `ROAS ${bep.roas.toFixed(2)} : 1`;
  }
  let highlightMetrics = Number.isFinite(highlightValue) && highlightValue > 0
    ? profitGivenRoas(inputs, highlightValue)
    : { profit: -Infinity, margin: -Infinity };
  const highlightStatus = evaluateStatus(inputs, highlightMetrics);

  const highlightBox = document.getElementById('statusHighlight');
  const statusDesc = document.getElementById('statusDescription');
  const legendBox = document.getElementById('statusLegend');

  const gaugeAngle = computeGaugeAngle(highlightValue, [bep.roas, tgt.roas]);
  const gaugeBepLabel = (!Number.isFinite(bep.roas) || bep.roas <= 0) ? '—' : `${bep.roas.toFixed(2)} : 1`;
  const gaugeTargetLabel = (!Number.isFinite(tgt.roas) || tgt.roas <= 0) ? '—' : `${tgt.roas.toFixed(2)} : 1`;
  const profitTone = Number.isFinite(highlightMetrics.profit)
    ? (highlightMetrics.profit >= 0 ? 'text-emerald-200' : 'text-rose-200')
    : 'text-slate-300';
  const marginTone = Number.isFinite(highlightMetrics.margin)
    ? (highlightMetrics.margin >= inputs.targetNetPct - 1e-6
      ? 'text-emerald-200'
      : (highlightMetrics.margin > 0 ? 'text-amber-200' : 'text-rose-200'))
    : 'text-slate-300';
  const marginLabel = Number.isFinite(highlightMetrics.margin)
    ? `${(highlightMetrics.margin * 100).toFixed(2)}%`
    : 'Tidak tersedia';
  const profitLabel = Number.isFinite(highlightMetrics.profit)
    ? `Rp ${idr(highlightMetrics.profit)}`
    : 'Tidak tersedia';
  const profitIcon = Number.isFinite(highlightMetrics.profit)
    ? (highlightMetrics.profit >= 0
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l6 6L21 6" />'
      : '<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />')
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 6h.01" />';
  const marginIcon = Number.isFinite(highlightMetrics.margin)
    ? (highlightMetrics.margin >= inputs.targetNetPct - 1e-6
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12l6 6 9-12" />'
      : (highlightMetrics.margin > 0
        ? '<path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16" />'
        : '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12l-6-6-9 12" />'))
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 6h.01" />';

  statusDesc.textContent = highlightStatus.description;
  highlightBox.innerHTML = `
    <div class="flex flex-col items-end gap-3 text-right">
      <div class="flex items-start gap-4">
        <div class="flex flex-col items-end">
          <div class="roas-gauge" role="img" aria-label="Penunjuk status ROAS">
            <div class="roas-gauge-track"></div>
            <div class="roas-gauge-needle" style="transform: rotate(${gaugeAngle.toFixed(2)}deg);"></div>
            <div class="roas-gauge-center"></div>
          </div>
          <div class="roas-gauge-caption mt-2 flex w-full max-w-[132px] justify-between text-slate-400/80">
            <span class="text-rose-200/80">BEP<br /><span class="font-semibold">${gaugeBepLabel}</span></span>
            <span class="text-emerald-200/80">Target<br /><span class="font-semibold">${gaugeTargetLabel}</span></span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          ${statusBadge(highlightStatus.label, 'lg')}
          <span class="text-[11px] text-slate-400">${highlightCaption || 'Belum ada skenario ROAS yang memenuhi target margin.'}</span>
        </div>
      </div>
      <div class="flex flex-wrap justify-end gap-2 text-[11px] text-slate-300">
        <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 ${profitTone}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${profitIcon}</svg>
          <span class="font-medium">Profit:</span>
          <span class="font-semibold">${profitLabel}</span>
        </span>
        <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 ${marginTone}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${marginIcon}</svg>
          <span class="font-medium">Margin:</span>
          <span class="font-semibold">${marginLabel}</span>
        </span>
      </div>
    </div>`;
  legendBox.innerHTML = ['Target', 'Profit Tipis', 'Rugi'].map(label => statusBadge(label)).join('');

  const tbody = document.querySelector('#simTable tbody');
  tbody.innerHTML = '';
  const baseRoas = [50, 20, 10, 5, 2.8, 2.2, 1.0];
  const dynamicRoas = [];
  if (Number.isFinite(tgt.roas)) dynamicRoas.push(parseFloat(tgt.roas.toFixed(2)));
  if (Number.isFinite(bep.roas)) dynamicRoas.push(parseFloat(bep.roas.toFixed(2)));
  const roasValues = Array.from(new Set([...baseRoas, ...dynamicRoas]
    .filter(v => Number.isFinite(v) && v > 0)))
    .sort((a, b) => b - a);

  roasValues.forEach(r => {
    const s = profitGivenRoas(inputs, r);
    const status = evaluateStatus(inputs, s);
    const isTargetRow = Number.isFinite(tgt.roas) && Math.abs(r - tgt.roas) < 0.05;
    const isBepRow = Number.isFinite(bep.roas) && Math.abs(r - bep.roas) < 0.05;
    const tr = document.createElement('tr');
    tr.className = `transition-colors ${isTargetRow ? 'bg-emerald-500/5' : isBepRow ? 'bg-amber-500/5' : 'hover:bg-white/5'}`;
    const roasTag = isTargetRow ? tagBadge('Target ROAS', 'target') : (isBepRow ? tagBadge('ROAS BEP', 'bep') : '');
    tr.innerHTML = `
      <td class="px-4 py-3">
        <span class="font-medium text-white">${r.toFixed(2)} : 1</span>
        ${roasTag}
      </td>
      <td class="px-4 py-3 text-right text-slate-200">Rp ${idr(s.adSpend)}</td>
      <td class="px-4 py-3 text-right ${s.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}">Rp ${idr(s.profit)}</td>
      <td class="px-4 py-3 text-right text-slate-200">${(s.margin * 100).toFixed(2)}%</td>
      <td class="px-4 py-3 text-center">${statusBadge(status.label)}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnCalc').addEventListener('click', render);
render();
