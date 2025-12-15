(function () {
  const cfg = window.DEANMETHOD_CONFIG || {};

  // ---------------------------
  // Contact links
  // ---------------------------
  const email = cfg.businessEmail || "YOUR_EMAIL_HERE";
  const phoneDisplay = cfg.businessPhoneDisplay || "YOUR_PHONE_HERE";
  const phoneE164 = cfg.businessPhoneE164 || "YOUR_E164_HERE";

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function buildSmsHref(numberE164, body) {
    const encoded = encodeURIComponent(body);
    // iOS commonly uses ;body= while others accept ?body=
    if (isIOS()) return `sms:${numberE164};body=${encoded}`;
    return `sms:${numberE164}?body=${encoded}`;
  }

  function wireContactLinks() {
    const emailLink = document.getElementById("emailLink");
    const smsLink = document.getElementById("smsLink");
    const telLink = document.getElementById("telLink");
    const year = document.getElementById("year");

    if (year) year.textContent = String(new Date().getFullYear());

    if (emailLink) {
      emailLink.href = `mailto:${email}?subject=${encodeURIComponent("Training inquiry")}&body=${encodeURIComponent("Hi — I’d like to discuss training. Goals: ... Availability: ...")}`;
      emailLink.textContent = `Email (${email})`;
    }
    if (smsLink) {
      smsLink.href = buildSmsHref(phoneE164, "Hi — I’d like to discuss training. Goals: ... Availability: ...");
      smsLink.textContent = `Text (${phoneDisplay})`;
    }
    if (telLink) {
      telLink.href = `tel:${phoneE164}`;
      telLink.textContent = `Call (${phoneDisplay})`;
    }
  }

  // ---------------------------
  // Heatmap: compute + render
  // ---------------------------
  const DATA_URL = "data/sessions.json";

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
    // No gradient: 5 discrete levels
    // t in [0..1]
    if (t <= 0.05) return "#1b2230";
    if (t <= 0.25) return "#24314a";
    if (t <= 0.50) return "#2d4167";
    if (t <= 0.75) return "#355487";
    return "#2f6feb";
  }

  function renderHeatmap(canvas, grid, hasData) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const padL = 62, padT = 22, padR = 16, padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const rows = 7, cols = 24;
    const cellW = plotW / cols;
    const cellH = plotH / rows;

    // Background
    ctx.clearRect(0, 0, W, H);

    // If no data, show a neutral, even look (per your request)
    const maxVal = getMax(grid);
    const denom = (hasData && maxVal > 0) ? maxVal : 1;

    // Labels
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(238,242,248,0.85)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let r = 0; r < rows; r++) {
      ctx.fillText(days[r], padL - 10, padT + r * cellH + cellH / 2);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(170,180,197,0.95)";
    for (let c = 0; c < cols; c += 2) {
      const label = String(c).padStart(2, "0");
      ctx.fillText(label, padL + c * cellW + cellW, padT + plotH + 10);
    }

    // Cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = hasData ? (grid[r][c] / denom) : 0.35; // neutral even
        ctx.fillStyle = colorFor(v);
        ctx.fillRect(padL + c * cellW, padT + r * cellH, cellW, cellH);
      }
    }

    // Grid lines (subtle)
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

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(padL, padT, plotW, plotH);

    return { maxVal };
  }

  async function loadSessions() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (HTTP ${res.status})`);
    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  }

  async function main() {
    wireContactLinks();

    const canvas = document.getElementById("heatmapCanvas");
    const stats = document.getElementById("heatmapStats");
    if (!canvas) return;

    try {
      const sessions = await loadSessions();
      const hasData = sessions.length > 0;

      const { grid, totalHours, sessionsCount } = computeHeatmap(sessions);
      const { maxVal } = renderHeatmap(canvas, grid, hasData);

      if (stats) {
        stats.textContent = hasData
          ? `${sessionsCount} session(s) • ${totalHours.toFixed(1)} total hour(s) logged • peak hour-cell ≈ ${maxVal.toFixed(2)}`
          : `No sessions logged yet — showing neutral baseline`;
      }
    } catch (err) {
      // Still render a neutral baseline even if data fails to load
      renderHeatmap(canvas, emptyGrid(0), false);
      if (stats) stats.textContent = `Could not load sessions.json — showing neutral baseline`;
      console.error(err);
    }
  }

  main();
})();
