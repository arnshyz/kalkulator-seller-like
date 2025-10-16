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
  return `<span class="inline-flex items-center gap-2 rounded-full font-semibold ${sizeClass} ${style.badge}">`
    + `<span class="h-2 w-2 rounded-full ${style.dot}"></span>${label}</span>`;
}

function evaluateStatus(inputs, metrics) {
  if (!isFinite(metrics.profit) || !isFinite(metrics.margin)) {
    return { label: 'Rugi', ...statusStyles.Rugi };
  }
  if (metrics.margin >= inputs.targetProfitPct - 1e-6) {
    return { label: 'Target', ...statusStyles.Target };
  }
  if (metrics.profit >= 0) {
    return { label: 'Profit Tipis', ...statusStyles['Profit Tipis'] };
  }
  return { label: 'Rugi', ...statusStyles.Rugi };
}

function idr(x) {
  return new Intl.NumberFormat('id-ID').format(Math.round(x || 0));
}

function fv(id) {
  return parseFloat(document.getElementById(id).value || '0');
}

function computeRecommendation(inputs) {
  const costBase = inputs.hpp + inputs.extraFlat;
  const pctTotal = inputs.adminPct + inputs.adsPct + inputs.discountPct + inputs.targetProfitPct;
  const denom = 1 - pctTotal;
  if (denom <= 0) {
    return { price: Infinity, costBase, denom };
  }
  return { price: costBase / denom, costBase, denom };
}

function computeBepPrice(inputs) {
  const costBase = inputs.hpp + inputs.extraFlat;
  const pctFee = inputs.adminPct + inputs.adsPct + inputs.discountPct;
  const denom = 1 - pctFee;
  if (denom <= 0) {
    return Infinity;
  }
  return costBase / denom;
}

function metricsFor(price, inputs, overrides = {}) {
  const adminPct = Math.max(0, inputs.adminPct + (overrides.adminPct || 0));
  const adsPct = Math.max(0, inputs.adsPct + (overrides.adsPct || 0));
  const discountPct = Math.max(0, inputs.discountPct + (overrides.discountPct || 0));
  const totalPct = adminPct + adsPct + discountPct;
  const costBase = inputs.hpp + inputs.extraFlat;
  const feeNominal = price * totalPct;
  const profit = price - costBase - feeNominal;
  const margin = price === 0 ? 0 : profit / price;
  return { price, profit, margin, feeNominal, totalPct, adminPct, adsPct, discountPct, costBase };
}

function render() {
  const inputs = {
    hpp: fv('hpp'),
    extraFlat: fv('extraFlat'),
    adminPct: fv('adminPct') / 100,
    adsPct: fv('adsPct') / 100,
    discountPct: fv('discountPct') / 100,
    targetProfitPct: fv('targetProfitPct') / 100,
    currentPrice: fv('currentPrice')
  };

  const resultBox = document.getElementById('resultBox');
  const recommendation = computeRecommendation(inputs);
  const bepPrice = computeBepPrice(inputs);

  if (!isFinite(recommendation.price)) {
    resultBox.innerHTML = `
      <div class="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-5 text-sm text-rose-100">
        <p class="font-semibold text-rose-200">Rumus tidak dapat dihitung.</p>
        <p class="mt-1 text-xs text-rose-100/80">
          Total persentase fee + target profit melebihi 100%. Kurangi target profit atau persentase fee agar harga jual bisa dihitung.
        </p>
      </div>`;
  } else {
    const recMetrics = metricsFor(recommendation.price, inputs);
    const status = evaluateStatus(inputs, recMetrics);
    const bepLabel = isFinite(bepPrice) ? `Rp ${idr(bepPrice)}` : 'Tidak terdefinisi';

    resultBox.innerHTML = `
      <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
        <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Harga Jual Rekomendasi</p>
            <p class="mt-2 text-3xl font-semibold text-white">Rp ${idr(recMetrics.price)}</p>
          </div>
          <div class="text-right">
            ${statusBadge(status.label, 'lg')}
            <p class="mt-1 text-[11px] text-slate-400">Target margin ${(inputs.targetProfitPct * 100).toFixed(1)}%</p>
            <p class="mt-1 text-[11px] text-slate-500">${status.description}</p>
          </div>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p class="text-[11px] uppercase tracking-wide text-slate-400">Modal + Biaya Flat</p>
          <p class="mt-2 text-xl font-semibold text-white">Rp ${idr(recMetrics.costBase)}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p class="text-[11px] uppercase tracking-wide text-slate-400">Fee Marketplace</p>
          <p class="mt-2 text-xl font-semibold text-white">Rp ${idr(recMetrics.feeNominal)}</p>
          <p class="text-[11px] text-slate-400">${(recMetrics.totalPct * 100).toFixed(2)}% dari harga jual</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p class="text-[11px] uppercase tracking-wide text-slate-400">Profit Bersih</p>
          <p class="mt-2 text-xl font-semibold text-white">Rp ${idr(recMetrics.profit)}</p>
          <p class="text-[11px] text-slate-400">Margin ${(recMetrics.margin * 100).toFixed(2)}%</p>
        </div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-400">Batas Harga BEP (Profit = 0)</p>
        <p class="mt-2 text-lg font-semibold text-white">${bepLabel}</p>
      </div>`;

    if (inputs.currentPrice > 0) {
      const currentMetrics = metricsFor(inputs.currentPrice, inputs);
      const currentStatus = evaluateStatus(inputs, currentMetrics);
      const diff = inputs.currentPrice - recMetrics.price;
      const sign = diff >= 0 ? '+' : '-';
      const diffAbs = Math.abs(diff);
      resultBox.innerHTML += `
        <div class="rounded-2xl border border-white/10 bg-blue-500/10 p-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-white">Analisa Harga Saat Ini</p>
              <p class="text-xs text-blue-100/80">Harga sekarang Rp ${idr(inputs.currentPrice)} (${sign} Rp ${idr(diffAbs)} dibanding rekomendasi)</p>
            </div>
            <div>${statusBadge(currentStatus.label)}</div>
          </div>
          <div class="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div class="rounded-xl bg-slate-950/40 p-3">
              <p class="text-[11px] uppercase tracking-wide text-blue-100/70">Profit Bersih</p>
              <p class="mt-1 text-base font-semibold text-white">Rp ${idr(currentMetrics.profit)}</p>
            </div>
            <div class="rounded-xl bg-slate-950/40 p-3">
              <p class="text-[11px] uppercase tracking-wide text-blue-100/70">Margin</p>
              <p class="mt-1 text-base font-semibold text-white">${(currentMetrics.margin * 100).toFixed(2)}%</p>
            </div>
            <div class="rounded-xl bg-slate-950/40 p-3">
              <p class="text-[11px] uppercase tracking-wide text-blue-100/70">Fee</p>
              <p class="mt-1 text-base font-semibold text-white">Rp ${idr(currentMetrics.feeNominal)}</p>
            </div>
          </div>
        </div>`;
    }
  }

  const tbody = document.querySelector('#simTable tbody');
  tbody.innerHTML = '';

  const scenarios = [];
  if (isFinite(recommendation.price)) {
    scenarios.push({
      label: 'Harga Rekomendasi',
      metrics: metricsFor(recommendation.price, inputs),
      highlight: 'target'
    });
  }

  if (inputs.currentPrice > 0) {
    scenarios.push({
      label: 'Harga Saat Ini',
      metrics: metricsFor(inputs.currentPrice, inputs),
      highlight: 'current'
    });
  }

  if (isFinite(recommendation.price)) {
    scenarios.push({
      label: 'Diskon +3%',
      metrics: metricsFor(recommendation.price, inputs, { discountPct: 0.03 }),
      note: 'Tambahan promo 3%'
    });
    scenarios.push({
      label: 'Diskon -2%',
      metrics: metricsFor(recommendation.price, inputs, { discountPct: -0.02 }),
      note: 'Promo dikurangi 2%'
    });
    scenarios.push({
      label: 'Fee Admin +1%',
      metrics: metricsFor(recommendation.price, inputs, { adminPct: 0.01 }),
      note: 'Simulasi kenaikan fee'
    });
    scenarios.push({
      label: 'Harga Naik 10%',
      metrics: metricsFor(recommendation.price * 1.1, inputs),
      note: 'Uji kenaikan harga'
    });
    scenarios.push({
      label: 'Harga Turun 10%',
      metrics: metricsFor(recommendation.price * 0.9, inputs),
      note: 'Uji penurunan harga'
    });
  }

  scenarios.forEach(sc => {
    const status = evaluateStatus(inputs, sc.metrics);
    const tr = document.createElement('tr');
    const baseClass = 'transition-colors';
    const highlightClass = sc.highlight === 'target'
      ? 'bg-emerald-500/5'
      : sc.highlight === 'current'
        ? 'bg-blue-500/5'
        : 'hover:bg-white/5';
    tr.className = `${baseClass} ${highlightClass}`;
    tr.innerHTML = `
      <td class="px-4 py-3">
        <span class="font-medium text-white">${sc.label}</span>
        ${sc.note ? `<p class="text-[11px] text-slate-400">${sc.note}</p>` : ''}
      </td>
      <td class="px-4 py-3 text-right text-slate-200">Rp ${idr(sc.metrics.price)}</td>
      <td class="px-4 py-3 text-right ${sc.metrics.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}">Rp ${idr(sc.metrics.profit)}</td>
      <td class="px-4 py-3 text-right text-slate-200">${(sc.metrics.margin * 100).toFixed(2)}%</td>
      <td class="px-4 py-3 text-center">${statusBadge(status.label)}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnCalc').addEventListener('click', render);
['hpp','extraFlat','adminPct','adsPct','discountPct','targetProfitPct','currentPrice']
  .forEach(id => document.getElementById(id).addEventListener('input', render));
render();
