// FSPL calculator
// FSPL(dB) = 32.44 + 20 log10(d_km) + 20 log10(f_MHz)
// Pr(dBm) = Pt(dBm) + Gt + Gr - FSPL - L

const el = (id) => document.getElementById(id);

const state = {
  mode: 'single',
  chart: null,
};

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function ptToDbm(value, unit) {
  const x = toNumber(value);
  if (!Number.isFinite(x)) return NaN;
  if (unit === 'dBm') return x;
  if (unit === 'mW') {
    if (x <= 0) return NaN;
    return 10 * Math.log10(x);
  }
  if (unit === 'W') {
    if (x <= 0) return NaN;
    return 10 * Math.log10(x * 1000);
  }
  return NaN;
}

function formatDbm(x) {
  return `${x.toFixed(2)} dBm`;
}

function formatDb(x) {
  return `${x.toFixed(2)} dB`;
}

function dToKm(value, unit) {
  const x = toNumber(value);
  if (!Number.isFinite(x) || x <= 0) return NaN;
  if (unit === 'km') return x;
  if (unit === 'm') return x / 1000;
  return NaN;
}

function fToMHz(value, unit) {
  const x = toNumber(value);
  if (!Number.isFinite(x) || x <= 0) return NaN;
  switch (unit) {
    case 'GHz':
      return x * 1000;
    case 'MHz':
      return x;
    case 'kHz':
      return x / 1000;
    case 'Hz':
      return x / 1e6;
    default:
      return NaN;
  }
}

function fsplDb(dKm, fMHz) {
  if (!(dKm > 0) || !(fMHz > 0)) return NaN;
  return 32.44 + 20 * Math.log10(dKm) + 20 * Math.log10(fMHz);
}

function computeSingle() {
  const ptDbm = ptToDbm(el('ptValue').value, el('ptUnit').value);
  const dKm = dToKm(el('dValue').value, el('dUnit').value);
  const fMHz = fToMHz(el('fValue').value, el('fUnit').value);

  const gt = toNumber(el('gt').value) || 0;
  const gr = toNumber(el('gr').value) || 0;
  const loss = toNumber(el('loss').value) || 0;

  const L = fsplDb(dKm, fMHz);
  const pr = ptDbm + gt + gr - L - loss;

  return { ptDbm, dKm, fMHz, fspl: L, pr, gt, gr, loss };
}

function linspace(start, stop, step) {
  const out = [];
  if (!(step > 0)) return out;
  if (stop < start) return out;
  // guard against huge arrays
  const maxN = 3000;
  let x = start;
  while (x <= stop + 1e-12 && out.length < maxN) {
    out.push(x);
    x += step;
  }
  return out;
}

function computeRange() {
  const unit = el('fRangeUnit').value;
  const fStartMHz = fToMHz(el('fStart').value, unit);
  const fStopMHz = fToMHz(el('fStop').value, unit);
  const fStepMHz = fToMHz(el('fStep').value, unit);

  const ptDbm = ptToDbm(el('ptValue').value, el('ptUnit').value);
  const dKm = dToKm(el('dValue').value, el('dUnit').value);

  const gt = toNumber(el('gt').value) || 0;
  const gr = toNumber(el('gr').value) || 0;
  const loss = toNumber(el('loss').value) || 0;

  const freqs = linspace(fStartMHz, fStopMHz, fStepMHz);
  const points = freqs.map((fMHz) => {
    const L = fsplDb(dKm, fMHz);
    const pr = ptDbm + gt + gr - L - loss;
    return { fMHz, fspl: L, pr };
  });

  return { unit, fStartMHz, fStopMHz, fStepMHz, ptDbm, dKm, gt, gr, loss, points };
}

function showError(msg) {
  // lightweight: reuse rangeSummary
  const box = el('rangeSummary');
  box.classList.remove('hidden');
  box.style.borderColor = 'rgba(239,68,68,.5)';
  box.style.color = 'rgba(239,68,68,.95)';
  box.textContent = msg;
}

function clearError() {
  const box = el('rangeSummary');
  box.style.borderColor = 'rgba(255,255,255,.18)';
  box.style.color = 'var(--muted)';
}

function updateChart(labels, data) {
  const ctx = el('chart');
  if (state.chart) {
    state.chart.destroy();
  }
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '接收功率 Pr (dBm)',
          data,
          borderColor: 'rgba(34,197,94,.9)',
          backgroundColor: 'rgba(34,197,94,.15)',
          fill: true,
          tension: 0.25,
          pointRadius: labels.length > 80 ? 0 : 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e9eefc' },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `Pr: ${Number(ctx.raw).toFixed(2)} dBm`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: 'rgba(233,238,252,.8)' },
          grid: { color: 'rgba(255,255,255,.06)' },
        },
        y: {
          ticks: { color: 'rgba(233,238,252,.8)' },
          grid: { color: 'rgba(255,255,255,.06)' },
        },
      },
    },
  });
}

function setMode(mode) {
  state.mode = mode;
  el('tabSingle').classList.toggle('active', mode === 'single');
  el('tabRange').classList.toggle('active', mode === 'range');
  el('singlePanel').classList.toggle('hidden', mode !== 'single');
  el('rangePanel').classList.toggle('hidden', mode !== 'range');

  el('rangeSummary').classList.toggle('hidden', true);
}

function syncRangeUnits() {
  const u = el('fRangeUnit').value;
  el('fStopUnit').textContent = u;
  el('fStepUnit').textContent = u;
}

function calc() {
  clearError();

  if (state.mode === 'single') {
    const r = computeSingle();

    if (![r.ptDbm, r.dKm, r.fMHz, r.fspl, r.pr].every(Number.isFinite)) {
      showError('输入无效：请检查发射功率/频率/距离（必须为正数）。');
      return;
    }

    el('outPt').textContent = formatDbm(r.ptDbm);
    el('outD').textContent = `${r.dKm.toFixed(6)} km`;
    el('outF').textContent = `${r.fMHz.toFixed(6)} MHz`;
    el('outFspl').textContent = formatDb(r.fspl);
    el('outPr').textContent = formatDbm(r.pr);

    el('rangeSummary').classList.add('hidden');

    updateChart(['单频点'], [r.pr]);
    return;
  }

  // range mode
  const rr = computeRange();
  if (!Number.isFinite(rr.ptDbm) || !Number.isFinite(rr.dKm)) {
    showError('输入无效：请检查发射功率/距离（必须为正数）。');
    return;
  }
  if (!Number.isFinite(rr.fStartMHz) || !Number.isFinite(rr.fStopMHz) || !Number.isFinite(rr.fStepMHz)) {
    showError('输入无效：请检查频率范围（必须为正数）。');
    return;
  }
  if (rr.points.length === 0) {
    showError('频率范围无效：请确保 终止 >= 起始 且 步进 > 0。');
    return;
  }

  const prMin = Math.min(...rr.points.map((p) => p.pr));
  const prMax = Math.max(...rr.points.map((p) => p.pr));

  el('outPt').textContent = formatDbm(rr.ptDbm);
  el('outD').textContent = `${rr.dKm.toFixed(6)} km`;
  el('outF').textContent = `${rr.fStartMHz.toFixed(2)}–${rr.fStopMHz.toFixed(2)} MHz (step ${rr.fStepMHz.toFixed(2)} MHz)`;
  // fspl/pr are ranges
  const Lmin = Math.min(...rr.points.map((p) => p.fspl));
  const Lmax = Math.max(...rr.points.map((p) => p.fspl));
  el('outFspl').textContent = `${Lmin.toFixed(2)}–${Lmax.toFixed(2)} dB`;
  el('outPr').textContent = `${prMin.toFixed(2)}–${prMax.toFixed(2)} dBm`;

  const box = el('rangeSummary');
  box.classList.remove('hidden');
  box.style.borderColor = 'rgba(255,255,255,.18)';
  box.style.color = 'var(--muted)';
  box.innerHTML = `范围模式：共 <b>${rr.points.length}</b> 个点。Pr(dBm) 从 <b>${prMin.toFixed(2)}</b> 到 <b>${prMax.toFixed(2)}</b>。`;

  // create labels in chosen unit for display
  const toDisplay = (mhz) => {
    if (rr.unit === 'GHz') return (mhz / 1000);
    if (rr.unit === 'MHz') return mhz;
    if (rr.unit === 'kHz') return (mhz * 1000);
    return mhz;
  };
  const labels = rr.points.map((p) => toDisplay(p.fMHz));
  updateChart(labels, rr.points.map((p) => p.pr));
  if (state.chart) {
    state.chart.options.scales.x.title = { display: true, text: `频率 (${rr.unit})`, color: 'rgba(233,238,252,.8)' };
    state.chart.update();
  }
}

function reset() {
  el('ptValue').value = 20;
  el('ptUnit').value = 'dBm';
  el('dValue').value = 1;
  el('dUnit').value = 'km';

  el('fValue').value = 2400;
  el('fUnit').value = 'MHz';

  el('fStart').value = 800;
  el('fStop').value = 2600;
  el('fStep').value = 50;
  el('fRangeUnit').value = 'MHz';
  syncRangeUnits();

  el('gt').value = 0;
  el('gr').value = 0;
  el('loss').value = 0;

  setMode('single');
  calc();
}

// events
el('tabSingle').addEventListener('click', () => setMode('single'));
el('tabRange').addEventListener('click', () => setMode('range'));
el('fRangeUnit').addEventListener('change', syncRangeUnits);
el('btnCalc').addEventListener('click', calc);
el('btnReset').addEventListener('click', reset);

// recalc on Enter
['ptValue','dValue','fValue','fStart','fStop','fStep','gt','gr','loss'].forEach((id) => {
  el(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calc();
  });
});

syncRangeUnits();
calc();
