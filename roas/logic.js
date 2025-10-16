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

  statusDesc.textContent = highlightStatus.description;
  highlightBox.innerHTML = `
    <div class="flex flex-col items-end gap-1 text-right">
      ${statusBadge(highlightStatus.label, 'lg')}
      <span class="text-[11px] text-slate-400">${highlightCaption || 'Belum ada skenario ROAS yang memenuhi target margin.'}</span>
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
