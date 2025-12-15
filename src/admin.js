const ADMIN_PASSPHRASE = "CHANGE_THIS_TO_SOMETHING_ONLY_YOU_KNOW";
const DATA_URL = "data/sessions.json";

const elGate = document.getElementById("gate");
const elPanel = document.getElementById("panel");
const elPass = document.getElementById("pass");
const elUnlock = document.getElementById("unlock");

const elStart = document.getElementById("start");
const elEnd = document.getElementById("end");
const elTz = document.getElementById("tz");

const elAdd = document.getElementById("add");
const elClear = document.getElementById("clear");
const elDownload = document.getElementById("download");
const elCopy = document.getElementById("copy");
const elList = document.getElementById("list");
const elCount = document.getElementById("count");

let sessions = [];

function toIsoWithOffset(dtLocalValue, tz){
  // dtLocalValue: "YYYY-MM-DDTHH:mm"
  // tz: "-08:00"
  if (!dtLocalValue) return null;
  const cleanedTz = (tz || "").trim() || "-08:00";
  return `${dtLocalValue}:00${cleanedTz}`;
}

function renderList(){
  elList.innerHTML = "";
  elCount.textContent = `${sessions.length} session(s) in local editor`;

  sessions
    .slice()
    .sort((a,b)=> String(a.start).localeCompare(String(b.start)))
    .forEach((s, idx)=>{
      const item = document.createElement("div");
      item.className = "session-item";
      item.innerHTML = `
        <div>
          <div class="muted small">#${idx+1}</div>
          <div><code>${escapeHtml(s.start)}</code> → <code>${escapeHtml(s.end)}</code></div>
        </div>
        <div>
          <button data-del="${idx}">Delete</button>
        </div>
      `;
      elList.appendChild(item);
    });

  elList.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const i = Number(btn.getAttribute("data-del"));
      if (!Number.isFinite(i)) return;
      sessions.splice(i, 1);
      renderList();
    });
  });
}

function downloadJson(){
  const payload = JSON.stringify({ sessions }, null, 2);
  const blob = new Blob([payload], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sessions.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function copyJson(){
  const payload = JSON.stringify({ sessions }, null, 2);
  await navigator.clipboard.writeText(payload);
  elCopy.textContent = "Copied!";
  setTimeout(()=> elCopy.textContent = "Copy JSON to clipboard", 900);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function loadExisting(){
  try{
    const res = await fetch(DATA_URL, { cache:"no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.sessions)) sessions = data.sessions;
  }catch{
    // ignore
  }
}

function unlock(){
  const v = (elPass.value || "").trim();
  if (!v || v !== ADMIN_PASSPHRASE){
    elPass.value = "";
    elPass.placeholder = "Wrong passphrase";
    return;
  }
  elGate.classList.add("hidden");
  elPanel.classList.remove("hidden");
}

elUnlock.addEventListener("click", unlock);
elPass.addEventListener("keydown", (e)=>{ if (e.key === "Enter") unlock(); });

elAdd.addEventListener("click", ()=>{
  const tz = elTz.value;
  const startIso = toIsoWithOffset(elStart.value, tz);
  const endIso = toIsoWithOffset(elEnd.value, tz);

  if (!startIso || !endIso){
    return;
  }
  sessions.push({ start: startIso, end: endIso });
  renderList();
});

elClear.addEventListener("click", ()=>{
  sessions = [];
  renderList();
});

elDownload.addEventListener("click", downloadJson);
elCopy.addEventListener("click", copyJson);

(async function init(){
  await loadExisting();
  renderList();
})();

