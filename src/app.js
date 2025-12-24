// src/app.js
(function () {
  const DATA_URL = "data/sessions.json";

  function $(id) { return document.getElementById(id); }

  function wireFooterYear() {
    const year = $("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  // -----------------------------
  // A001: Pricing + seasonal sales
  // Date override (DEV ONLY):
  // Format: YYYY-MM-DD (example: "2026-01-03")
  // Leave empty "" to use the real date.
  // -----------------------------
  const PRICE_PREVIEW_DATE = ""; // A001

  function parsePreviewDate(s){
    const raw = String(s || "").trim();
    if (!raw) return null;

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return null;

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);

    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    if (mo < 1 || mo > 12) return null;
    if (d < 1 || d > 31) return null;

    // Local date at noon to avoid DST edges
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (dt.getFullYear() !== y || (dt.getMonth() + 1) !== mo || dt.getDate() !== d) return null;

    return dt;
  }

  function mdKey(month, day){
    return month * 100 + day; // e.g. 12/25 -> 1225
  }

  function dateToMdKey(dt){
    return mdKey(dt.getMonth() + 1, dt.getDate());
  }

  function inWindowAnnual(dt, start, end){
    // Inclusive. Handles cross-year windows like Dec 25 -> Jan 7.
    const k = dateToMdKey(dt);
    const ks = mdKey(start.month, start.day);
    const ke = mdKey(end.month, end.day);

    if (ks <= ke){
      return k >= ks && k <= ke;
    }
    // Cross-year
    return (k >= ks) || (k <= ke);
  }

  function money(n){
    return "$" + String(Math.round(Number(n)));
  }

  function getPricingConfig(){
    const cfg = (window.DEANMETHOD_CONFIG && window.DEANMETHOD_CONFIG.pricing) ? window.DEANMETHOD_CONFIG.pricing : null;
    if (!cfg) {
      return {
        base: { foundation: 99, progress: 179, elite: 339 },
        sales: []
      };
    }
    return cfg;
  }

  function pickSaleForDate(dt, pricingCfg){
    const sales = Array.isArray(pricingCfg.sales) ? pricingCfg.sales : [];
    for (const sale of sales){
      if (!sale || !sale.start || !sale.end || !sale.prices) continue;
      if (inWindowAnnual(dt, sale.start, sale.end)){
        return sale;
      }
    }
    return null;
  }

  function applyPricingForDate(dt){
    const pricingCfg = getPricingConfig();
    const base = pricingCfg.base || { foundation: 99, progress: 179, elite: 339 };
    const sale = pickSaleForDate(dt, pricingCfg);

    const cards = document.querySelectorAll(".price-card[data-plan]");
    for (const card of cards){
      const plan = String(card.getAttribute("data-plan") || "").trim();
      if (!plan) continue;

      const basePrice = base[plan];
      const salePrice = sale && sale.prices ? sale.prices[plan] : null;

      const oldEl = card.querySelector(".price-old");
      const newEl = card.querySelector(".price-new");
      const valueWrap = card.querySelector(".price-value");

      if (!newEl || !valueWrap) continue;

      // Reset tooltip state
      valueWrap.classList.remove("has-sale-tooltip");
      valueWrap.removeAttribute("data-tooltip");

      if (
        sale &&
        Number.isFinite(Number(salePrice)) &&
        Number.isFinite(Number(basePrice)) &&
        Number(salePrice) !== Number(basePrice)
      ){
        // Sale active
        if (oldEl){
          oldEl.textContent = money(basePrice);
          oldEl.hidden = false;
        }
        newEl.textContent = money(salePrice);

        // Hover tooltip reason
        valueWrap.classList.add("has-sale-tooltip");
        valueWrap.setAttribute("data-tooltip", sale.reason || sale.label || "Sale");
      } else {
        // No sale
        if (oldEl) {
          oldEl.textContent = "";
          oldEl.hidden = true;
        }
        newEl.textContent = money(basePrice);
      }
    }
  }

  function initPricing(){
    const preview = parsePreviewDate(PRICE_PREVIEW_DATE);
    const dt = preview || new Date();
    applyPricingForDate(dt);
  }

  // -----------------------------
  // Heatmap logic (existing)
  // -----------------------------

  function emptyGrid(value = 0) {
    return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => value));
  }

  function addSessionToGrid(grid, start, end) {
    const ms = 60 * 1000;
    let t = new Date(start).getTime();
    const tEnd = new Date(end).getTime();
    if (!Number.isFinite(t) || !Number.isFinite(tEnd) || tEnd <= t) return 0;

    let minutesCounted = 0;
    while (t < tEnd) {
      const d = new Date(t);
      grid[d.getDay()][d.getHours()] += 1 / 60;
      minutesCounted += 1;
      t += ms;
    }
    return minutesCounted / 60;
  }

  function computeHeatmap(sessions) {
    const grid = emptyGrid(0);
    let totalHours = 0;

    for (const s of sessions) {
      if (!s || !s.start || !s.end) continue;
      totalHours += addSessionToGrid(grid, s.start, s.end);
    }
    return { grid, totalHours, sessionsCount: sessions.length };
  }

  function getMax(grid) {
    let max = 0;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 24; c++) max = Math.max(max, grid[r][c] || 0);
    return max;
  }

  function colorFor(t) {
    if (t <= 0.05) return "#1b2230";
    if (t <= 0.25) return "#24314a";
    if (t <= 0.50) return "#2d4167";
    if (t <= 0.75) return "#355487";
    return "#2f6feb";
  }

  function fmtHourAMPM(h) {
    const am = h < 12;
    const hour = (h % 12) === 0 ? 12 : (h % 12);
    return `${hour}${am ? "a" : "p"}`;
  }

  function hourRangeLabel(h, useAMPM) {
    if (!useAMPM) return `${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:59`;
    return `${fmtHourAMPM(h)}–${fmtHourAMPM((h + 1) % 24)} (≈)`;
  }

  function renderHeatmap(ctx, canvas, grid, hasData, useAMPM) {
    const W = canvas.width, H = canvas.height;

    const padL = 74, padT = 18, padR = 18, padB = 56;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const rows = 7, cols = 24;
    const cellW = plotW / cols;
    const cellH = plotH / rows;

    ctx.clearRect(0, 0, W, H);

    const maxVal = getMax(grid);
    const denom = (hasData && maxVal > 0) ? maxVal : 1;

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    ctx.font = "12px Inter, ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,248,0.88)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let r = 0; r < rows; r++) {
      ctx.fillText(days[r], padL - 10, padT + r * cellH + cellH / 2);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = hasData ? (grid[r][c] / denom) : 0.35;
        ctx.fillStyle = colorFor(v);
        ctx.fillRect(padL + c * cellW, padT + r * cellH, cellW, cellH);
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = padL + c * cellW;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = padT + r * cellH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(170,180,197,0.95)";
    const step = 2;
    for (let c = 0; c < cols; c += step) {
      const label = useAMPM ? fmtHourAMPM(c) : String(c).padStart(2, "0");
      const x = padL + c * cellW + (cellW / 2);
      ctx.fillText(label, x, padT + plotH + 14);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.strokeRect(padL, padT, plotW, plotH);

    return { padL, padT, padR, padB, plotW, plotH, rows, cols, cellW, cellH };
  }

  function cellFromPointer(layout, x, y) {
    const { padL, padT, plotW, plotH, cols, rows, cellW, cellH } = layout;
    const px = x - padL;
    const py = y - padT;
    if (px < 0 || py < 0 || px > plotW || py > plotH) return null;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(px / cellW)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(py / cellH)));
    return { r, c };
  }

  async function loadSessions() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (HTTP ${res.status})`);
    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  }

  async function main() {
    wireFooterYear();
    initPricing();

    const canvas = $("heatmapCanvas");
    const wrap = $("heatmapWrap");
    const tip = $("heatmapTip");
    const stats = $("heatmapStats");
    const toggleBtn = $("toggleTimeBtn");
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");

    let useAMPM = false;
    let grid = emptyGrid(0);
    let hasData = false;
    let totalHours = 0;
    let sessionsCount = 0;
    let layout = null;

    function hideTip() {
      if (!tip) return;
      tip.hidden = true;
      tip.textContent = "";
    }

    function showTip(text, clientX, clientY) {
      if (!tip) return;
      tip.textContent = text;
      tip.hidden = false;

      const rect = wrap.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      tip.style.left = `${Math.max(10, Math.min(rect.width - 10, x))}px`;
      tip.style.top = `${Math.max(10, Math.min(rect.height - 10, y))}px`;
    }

    function rerender() {
      layout = renderHeatmap(ctx, canvas, grid, hasData, useAMPM);
      if (stats) stats.textContent = hasData ? `${sessionsCount} session(s) • ${totalHours.toFixed(1)} total hour(s)` : "";
      if (toggleBtn) toggleBtn.textContent = useAMPM ? "24 hr" : "12 hr";
      hideTip();
    }

    try {
      const sessions = await loadSessions();
      hasData = sessions.length > 0;
      const computed = computeHeatmap(sessions);
      grid = computed.grid;
      totalHours = computed.totalHours;
      sessionsCount = computed.sessionsCount;
    } catch (e) {
      grid = emptyGrid(0);
      hasData = false;
    }

    rerender();

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        useAMPM = !useAMPM;
        rerender();
      });
    }

    canvas.addEventListener("mouseleave", () => hideTip());

    canvas.addEventListener("click", (ev) => {
      if (!layout) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (ev.clientX - rect.left) * scaleX;
      const cy = (ev.clientY - rect.top) * scaleY;

      const cell = cellFromPointer(layout, cx, cy);
      if (!cell) { hideTip(); return; }

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const day = days[cell.r];
      const hour = cell.c;

      const valueHours = hasData ? (grid[cell.r][cell.c] || 0) : 0;
      const range = hourRangeLabel(hour, useAMPM);
      const text = `${day} • ${range} • ${valueHours.toFixed(2)} hr`;

      showTip(text, ev.clientX, ev.clientY);
    });
  }

  main();
})();
