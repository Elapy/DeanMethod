import { renderHeatmap } from "./heatmap.js";

const DATA_URL = "data/sessions.json";

function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function buildSmsHref(numberE164, body){
  const encoded = encodeURIComponent(body);
  // iOS uses ;body= while many Android browsers accept ?body=
  // (Platform differences are widely documented.) :contentReference[oaicite:2]{index=2}
  if (isIOS()) return `sms:${numberE164};body=${encoded}`;
  return `sms:${numberE164}?body=${encoded}`;
}

function setSmsLinks(){
  const msg = "Hi Dean — I’d like to discuss training. My goals are: ... Preferred times: ...";
  const href = buildSmsHref("+18056653528", msg);

  const a1 = document.getElementById("smsLink");
  const a2 = document.getElementById("smsLinkTop");
  if (a1) a1.href = href;
  if (a2) a2.href = href;
}

function emptyGrid(){
  return Array.from({length:7}, () => Array.from({length:24}, () => 0));
}

function addSessionToGrid(grid, start, end){
  // Walk minute by minute and accumulate fraction of an hour per cell.
  // This is robust across partial hours.
  const ms = 60 * 1000;
  let t = new Date(start).getTime();
  const tEnd = new Date(end).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(tEnd) || tEnd <= t) return 0;

  let minutesCounted = 0;
  while (t < tEnd){
    const d = new Date(t);
    const day = d.getDay();        // 0..6 (Sun..Sat)
    const hour = d.getHours();     // 0..23
    grid[day][hour] += 1/60;       // each minute adds 1/60 hour
    minutesCounted += 1;
    t += ms;
  }
  return minutesCounted / 60;
}

async function loadSessions(){
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
  const data = await res.json();
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  return sessions;
}

function computeHeatmap(sessions){
  const grid = emptyGrid();
  let totalHours = 0;

  for (const s of sessions){
    if (!s || !s.start || !s.end) continue;
    totalHours += addSessionToGrid(grid, s.start, s.end);
  }

  return { grid, totalHours, sessionsCount: sessions.length };
}

async function main(){
  setSmsLinks();
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const canvas = document.getElementById("heatmapCanvas");
  const stats = document.getElementById("heatmapStats");

  try{
    const sessions = await loadSessions();
    const { grid, totalHours, sessionsCount } = computeHeatmap(sessions);
    const { maxVal } = renderHeatmap(canvas, grid);

    if (stats){
      stats.textContent =
        `${sessionsCount} session(s) • ${totalHours.toFixed(1)} total hour(s) logged • peak cell ≈ ${maxVal.toFixed(2)} hour(s)`;
    }
  } catch (err){
    if (stats) stats.textContent = `Heatmap unavailable: ${err.message}`;
    console.error(err);
  }
}

main();

