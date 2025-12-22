(function () {
  const DATA_URL = "data/sessions.json";

  function $(id) { return document.getElementById(id); }

  function wireFooterYear() {
    const year = $("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

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

    // Y labels centered in each row
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    ctx.font = "12px Inter, ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,248,0.88)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let r = 0; r < rows; r++) {
      ctx.fillText(days[r], padL - 10, padT + r * cellH + cellH / 2);
    }

    // cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = hasData ? (grid[r][c] / denom) : 0.35; // neutral baseline if no data
        ctx.fillStyle = colorFor(v);
        ctx.fillRect(padL + c * cellW, padT + r * cellH, cellW, cellH);
      }
    }

    // grid lines
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

    // X labels — centered under each HOUR BLOCK (not on grid lines)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(170,180,197,0.95)";
    const step = 2;
    for (let c = 0; c < cols; c += step) {
      const label = useAMPM ? fmtHourAMPM(c) : String(c).padStart(2, "0");
      const x = padL + c * cellW + (cellW / 2);
      ctx.fillText(label, x, padT + plotH + 14);
    }

    // border
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

    const canvas = $("heatmapCanvas");
    const wrap = $("heatmapWrap");
    const tip = $("heatmapTip");
    const stats = $("heatmapStats");
    const toggleBtn = $("toggleTimeBtn");
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");

    let useAMPM = false;
    let sessions = [];
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

      // IMPORTANT: no “no sessions” message, no fallback message
      if (stats) {
        stats.textContent = hasData ? `${sessionsCount} session(s) • ${totalHours.toFixed(1)} total hour(s)` : "";
      }
      if (toggleBtn) toggleBtn.textContent = useAMPM ? "24 hr" : "12 hr";
      hideTip();
    }

    try {
      sessions = await loadSessions();
      hasData = sessions.length > 0;
      const computed = computeHeatmap(sessions);
      grid = computed.grid;
      totalHours = computed.totalHours;
      sessionsCount = computed.sessionsCount;
    } catch (e) {
      // neutral baseline, no visible error text
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

    canvas.addEventListener("mousemove", (ev) => {
      // optional: keep tooltip only on click; so do nothing here
    });

    canvas.addEventListener("mouseleave", () => hideTip());

    canvas.addEventListener("click", (ev) => {
      if (!layout) return;

      const rect = canvas.getBoundingClientRect();
      // convert client coords to canvas coords
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (ev.clientX - rect.left) * scaleX;
      const cy = (ev.clientY - rect.top) * scaleY;

      const cell = cellFromPointer(layout, cx, cy);
      if (!cell) {
        hideTip();
        return;
      }

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const day = days[cell.r];
      const hour = cell.c;

      const valueHours = hasData ? (grid[cell.r][cell.c] || 0) : 0;

      const range = hourRangeLabel(hour, useAMPM);
      const text = `${day} • ${range} • ${valueHours.toFixed(2)} hr`;

      showTip(text, ev.clientX, ev.clientY);
    });
  }

  /* src/app.js
     Pricing: infinite looping carousel + 3D wheel coverflow
     (No dependencies)
  */

  (function () {
    function initPricingCarousel(carousel) {
      const track = carousel.querySelector(".pricing-track");
      const btnLeft = carousel.querySelector(".carousel-btn.left");
      const btnRight = carousel.querySelector(".carousel-btn.right");
      if (!track || !btnLeft || !btnRight) return;
  
      // Prevent double-init (important on hot reload / GitHub pages caching oddities)
      if (track.dataset.pricingInit === "1") return;
      track.dataset.pricingInit = "1";
  
      const originals = Array.from(track.querySelectorAll(".price-card"));
      const originalCount = originals.length;
      if (originalCount < 2) return;
  
      // Clone count: 2 gives the nicest "wheel" illusion (center + neighbors + far neighbors)
      const CLONE_COUNT = Math.min(2, originalCount);
  
      // Helper: clone cards without duplicating IDs (you don't have IDs, but safe anyway)
      function cloneCard(card) {
        const c = card.cloneNode(true);
        c.classList.add("is-clone");
        return c;
      }
  
      // Build clones
      const headClones = originals.slice(-CLONE_COUNT).map(cloneCard);
      const tailClones = originals.slice(0, CLONE_COUNT).map(cloneCard);
  
      headClones.forEach((c) => track.insertBefore(c, track.firstChild));
      tailClones.forEach((c) => track.appendChild(c));
  
      // Compute "step" as distance between card centers (robust vs CSS gap changes)
      function getStep() {
        const cards = track.querySelectorAll(".price-card");
        if (cards.length < 2) return 360;
  
        const a = cards[0].getBoundingClientRect();
        const b = cards[1].getBoundingClientRect();
        const step = Math.round(b.left - a.left);
        return Math.max(1, step);
      }
  
      // Jump to first real card position
      function jumpToRealStart() {
        const step = getStep();
        track.scrollLeft = step * CLONE_COUNT;
      }
  
      // Find card closest to center of track viewport
      function getClosestToCenter() {
        const cards = Array.from(track.querySelectorAll(".price-card"));
        const rect = track.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
  
        let closest = null;
        let closestDist = Infinity;
  
        for (const card of cards) {
          const r = card.getBoundingClientRect();
          const cardCenter = r.left + r.width / 2;
          const d = Math.abs(cardCenter - centerX);
          if (d < closestDist) {
            closestDist = d;
            closest = card;
          }
        }
        return { cards, closest };
      }
  
      function updateWheelClasses() {
        const { cards, closest } = getClosestToCenter();
        if (!closest) return;
  
        // Clear
        for (const c of cards) {
          c.classList.remove("is-active", "is-left", "is-right", "is-far-left", "is-far-right");
        }
  
        const i = cards.indexOf(closest);
        closest.classList.add("is-active");
  
        // Immediate neighbors
        if (i - 1 >= 0) cards[i - 1].classList.add("is-left");
        if (i + 1 < cards.length) cards[i + 1].classList.add("is-right");
  
        // Far neighbors (2 away) — behind the immediate neighbors
        if (i - 2 >= 0) cards[i - 2].classList.add("is-far-left");
        if (i + 2 < cards.length) cards[i + 2].classList.add("is-far-right");
      }
  
      // Infinite loop: when you scroll into clone region, jump by originalCount steps
      function handleLoopIfNeeded() {
        const step = getStep();
  
        // Boundaries are intentionally "soft" so we don't jitter during smooth scroll
        const leftBoundary = step * (CLONE_COUNT - 0.5);
        const rightBoundary = step * (CLONE_COUNT + originalCount + 0.5);
  
        if (track.scrollLeft < leftBoundary) {
          track.scrollLeft += step * originalCount;
        } else if (track.scrollLeft > rightBoundary) {
          track.scrollLeft -= step * originalCount;
        }
      }
  
      // Arrow scroll — align with step
      function scrollByOne(dir) {
        const step = getStep();
        track.scrollBy({ left: dir * step, behavior: "smooth" });
      }
  
      btnLeft.addEventListener("click", () => scrollByOne(-1));
      btnRight.addEventListener("click", () => scrollByOne(1));
  
      // Keyboard: left/right when focused
      track.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          scrollByOne(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          scrollByOne(1);
        }
      });
  
      // Scroll handler (throttled)
      let ticking = false;
      track.addEventListener(
        "scroll",
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            handleLoopIfNeeded();
            updateWheelClasses();
            ticking = false;
          });
        },
        { passive: true }
      );
  
      // Resize: keep stable
      window.addEventListener("resize", () => {
        jumpToRealStart();
        updateWheelClasses();
      });
  
      // Init after layout
      // Use two RAFs + small timeout to avoid "not centered until scroll" on first paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          jumpToRealStart();
          updateWheelClasses();
          setTimeout(updateWheelClasses, 50);
        });
      });
    }
  
    document.querySelectorAll(".pricing-carousel").forEach(initPricingCarousel);
  })();

  <script>
  /* ============================
     Pricing coverflow + loop
     - Adds is-active/is-left/is-right classes
     - Makes arrow buttons work
     - Creates an "infinite" loop illusion using clones + jump
     ============================ */
  (function () {
    const carousel = document.querySelector("#pricing .pricing-carousel");
    if (!carousel) return;
  
    const track = carousel.querySelector(".pricing-track");
    const btnPrev = carousel.querySelector(".carousel-btn.left");
    const btnNext = carousel.querySelector(".carousel-btn.right");
    if (!track) return;
  
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
    // ---- Config ----
    const CLONES_PER_SIDE = 1;        // 1 is enough for 4 cards. Use 2 if you add many.
    const ACTIVE_CLASS = "is-active";
    const LEFT_CLASS = "is-left";
    const RIGHT_CLASS = "is-right";
    const CLONE_CLASS = "is-clone";
  
    let baseCards = [];
    let allCards = [];
    let isJumping = false;
    let rafId = 0;
  
    function getCards() {
      return Array.from(track.querySelectorAll(".price-card"));
    }
  
    function cardCenterX(card) {
      const r = card.getBoundingClientRect();
      return r.left + r.width / 2;
    }
  
    function trackCenterX() {
      const r = track.getBoundingClientRect();
      return r.left + r.width / 2;
    }
  
    function clearClasses() {
      allCards.forEach((c) => {
        c.classList.remove(ACTIVE_CLASS, LEFT_CLASS, RIGHT_CLASS);
      });
    }
  
    function setCoverflowByNearestCard() {
      if (!allCards.length) return;
  
      const center = trackCenterX();
      let bestIdx = 0;
      let bestDist = Infinity;
  
      for (let i = 0; i < allCards.length; i++) {
        const d = Math.abs(cardCenterX(allCards[i]) - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
  
      clearClasses();
  
      const active = allCards[bestIdx];
      if (active) active.classList.add(ACTIVE_CLASS);
  
      const left = allCards[bestIdx - 1];
      const right = allCards[bestIdx + 1];
      if (left) left.classList.add(LEFT_CLASS);
      if (right) right.classList.add(RIGHT_CLASS);
    }
  
    function snapToCard(card, behavior) {
      if (!card) return;
  
      const trackRect = track.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
  
      // desired scrollLeft so card center aligns with track center
      const currentScroll = track.scrollLeft;
      const deltaToCenter =
        (cardRect.left + cardRect.width / 2) - (trackRect.left + trackRect.width / 2);
  
      const nextScrollLeft = currentScroll + deltaToCenter;
  
      track.scrollTo({
        left: nextScrollLeft,
        behavior: prefersReducedMotion ? "auto" : (behavior || "smooth"),
      });
    }
  
    function nearestCard() {
      const center = trackCenterX();
      let best = null;
      let bestDist = Infinity;
  
      allCards.forEach((c) => {
        const d = Math.abs(cardCenterX(c) - center);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      });
  
      return best;
    }
  
    function nextCard(direction) {
      // direction: +1 next, -1 prev
      const active = track.querySelector(".price-card." + ACTIVE_CLASS) || nearestCard();
      if (!active) return;
  
      const idx = allCards.indexOf(active);
      const target = allCards[idx + direction];
      if (target) snapToCard(target, "smooth");
    }
  
    function measureCardStep() {
      // Distance between centers of adjacent cards (assumes consistent layout)
      if (allCards.length < 2) return 360;
      const c0 = allCards[0].getBoundingClientRect();
      const c1 = allCards[1].getBoundingClientRect();
      return (c1.left + c1.width / 2) - (c0.left + c0.width / 2);
    }
  
    function buildClones() {
      // Remove any existing clones (so refresh works)
      track.querySelectorAll("." + CLONE_CLASS).forEach((n) => n.remove());
  
      baseCards = getCards().filter((c) => !c.classList.contains(CLONE_CLASS));
      if (baseCards.length < 2) {
        // Not enough to loop / coverflow meaningfully
        allCards = getCards();
        return;
      }
  
      // Clone first N and last N
      const head = baseCards.slice(0, CLONES_PER_SIDE).map((c) => {
        const clone = c.cloneNode(true);
        clone.classList.add(CLONE_CLASS);
        clone.setAttribute("aria-hidden", "true");
        return clone;
      });
  
      const tail = baseCards.slice(-CLONES_PER_SIDE).map((c) => {
        const clone = c.cloneNode(true);
        clone.classList.add(CLONE_CLASS);
        clone.setAttribute("aria-hidden", "true");
        return clone;
      });
  
      // Prepend tail clones
      tail.forEach((clone) => track.insertBefore(clone, track.firstChild));
      // Append head clones
      head.forEach((clone) => track.appendChild(clone));
  
      allCards = getCards();
    }
  
    function jumpIfInCloneZone() {
      if (isJumping) return;
      if (baseCards.length < 2) return;
  
      // Identify the active-ish card (nearest)
      const active = nearestCard();
      if (!active) return;
  
      const idx = allCards.indexOf(active);
      if (idx < 0) return;
  
      // If we're in the leading clones, jump forward by baseCards.length
      // If we're in the trailing clones, jump backward by baseCards.length
      const total = baseCards.length;
      const inLeadingClones = idx < CLONES_PER_SIDE;
      const inTrailingClones = idx >= (CLONES_PER_SIDE + total);
  
      if (!inLeadingClones && !inTrailingClones) return;
  
      // Compute equivalent real card index in the middle section
      let targetIdx = idx;
      if (inLeadingClones) targetIdx = idx + total;
      if (inTrailingClones) targetIdx = idx - total;
  
      const target = allCards[targetIdx];
      if (!target) return;
  
      // Do an instant scroll jump so the user doesn't "hit the edge"
      isJumping = true;
      snapToCard(target, "auto");
      // Allow layout to settle before enabling another jump
      window.setTimeout(() => {
        isJumping = false;
        setCoverflowByNearestCard();
      }, 0);
    }
  
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setCoverflowByNearestCard();
        jumpIfInCloneZone();
      });
    }
  
    function initPosition() {
      // After clones exist, put the view on the first real card (not a clone)
      if (!baseCards.length) return;
      const firstReal = allCards[CLONES_PER_SIDE]; // first real card in the middle region
      snapToCard(firstReal, "auto");
      setCoverflowByNearestCard();
    }
  
    // ---- Wire up ----
    buildClones();
    // Wait one frame so DOM/layout is stable before centering
    requestAnimationFrame(initPosition);
  
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      // Rebuild to keep things sane on layout changes
      buildClones();
      requestAnimationFrame(initPosition);
    });
  
    if (btnPrev) btnPrev.addEventListener("click", () => nextCard(-1));
    if (btnNext) btnNext.addEventListener("click", () => nextCard(+1));
  
    // Keyboard support (optional but nice)
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); nextCard(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); nextCard(+1); }
    });
  })();
  </script>
  
  main();
})();
