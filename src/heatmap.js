// Smooth 7×24 heatmap renderer using canvas + blur.
// We purposely keep it dependency-free and static-host friendly.

export function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function hexToRgb(hex){
  const h = hex.replace("#","").trim();
  const full = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(full, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

function lerp(a,b,t){ return a + (b-a)*t; }

function colorRamp(t){
  // Dark monotone -> blue highlight
  // t in [0,1]
  const low = { r: 20, g: 26, b: 38 };     // deep slate
  const mid = hexToRgb("#1f3a66");         // muted blue-gray
  const high = hexToRgb("#3b82f6");        // blue accent
  const tt = clamp01(t);

  if (tt < 0.55){
    const u = tt / 0.55;
    return {
      r: Math.round(lerp(low.r, mid.r, u)),
      g: Math.round(lerp(low.g, mid.g, u)),
      b: Math.round(lerp(low.b, mid.b, u))
    };
  }
  const u = (tt - 0.55) / 0.45;
  return {
    r: Math.round(lerp(mid.r, high.r, u)),
    g: Math.round(lerp(mid.g, high.g, u)),
    b: Math.round(lerp(mid.b, high.b, u))
  };
}

export function renderHeatmap(canvas, grid, opts = {}){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const pad = 56;
  const left = pad, top = 26, right = 20, bottom = 38;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  const rows = 7, cols = 24;

  // Background
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0,0,W,H);

  // Soft panel behind plot
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  roundRect(ctx, left-10, top-10, plotW+20, plotH+20, 14, true, false);

  // Prepare intensity buffer
  let maxVal = 0;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      maxVal = Math.max(maxVal, grid[r][c] || 0);
    }
  }
  const denom = maxVal > 0 ? maxVal : 1;

  // Draw hard-edged cells to an offscreen canvas, then blur+scale for smoothness
  const cellW = plotW / cols;
  const cellH = plotH / rows;

  const off = document.createElement("canvas");
  off.width = cols * 20;
  off.height = rows * 20;
  const octx = off.getContext("2d");

  // Paint intensity into offscreen at higher density
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const v = (grid[r][c] || 0) / denom;
      const col = colorRamp(v);
      octx.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
      octx.fillRect(c*20, r*20, 20, 20);
    }
  }

  // Blur for gradient edges
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.filter = "blur(10px)";
  ctx.drawImage(off, left, top, plotW, plotH);
  ctx.restore();

  // Overlay a subtle grid (very faint)
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let c=0;c<=cols;c++){
    const x = left + c*cellW;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top+plotH); ctx.stroke();
  }
  for (let r=0;r<=rows;r++){
    const y = top + r*cellH;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left+plotW, y); ctx.stroke();
  }
  ctx.restore();

  // Labels
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  ctx.fillStyle = "rgba(231,237,246,0.85)";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let r=0;r<rows;r++){
    const y = top + r*cellH + cellH/2;
    ctx.fillText(days[r], left-12, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let c=0;c<cols;c+=2){
    const x = left + c*cellW + cellW;
    const label = String(c).padStart(2,"0");
    ctx.fillText(label, x, top+plotH+10);
  }

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  roundRect(ctx, left-10, top-10, plotW+20, plotH+20, 14, false, true);

  return { maxVal };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

