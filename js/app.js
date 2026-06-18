/* kervan — shared + builder logic */

const MODELS = {
  k1: { code: "K1", name: "solo", rows: 2, cols: 3, payload: 40, base: 19 },
  k2: { code: "K2", name: "duo", rows: 2, cols: 4, payload: 60, base: 29 },
  k3: { code: "K3", name: "basecamp", rows: 3, cols: 4, payload: 80, base: 39 },
};

const MODULES = [
  { id: "slp01", code: "SLP-01", name: "Tent, 2-person", tag: "tent ×2p", kg: 3.9, eur: 12, size: 2, group: "sleep", mount: "slot" },
  { id: "slp02", code: "SLP-02", name: "Sleeping bags ×2", tag: "bags ×2", kg: 3.2, eur: 7, size: 1, group: "sleep", mount: "slot" },
  { id: "slp03", code: "SLP-03", name: "Sleep mats ×2", tag: "mats ×2", kg: 1.6, eur: 5, size: 1, group: "sleep", mount: "slot" },
  { id: "kit01", code: "KIT-01", name: "Camp oven", tag: "oven", kg: 5.4, eur: 15, size: 1, group: "kitchen", mount: "slot" },
  { id: "kit02", code: "KIT-02", name: "Camp kitchen — stove, pots, knives", tag: "kitchen", kg: 4.6, eur: 16, size: 1, group: "kitchen", mount: "slot" },
  { id: "kit03", code: "KIT-03", name: "Cooler, 25 L", tag: "cooler 25L", kg: 3.4, eur: 9, size: 1, group: "kitchen", mount: "slot" },
  { id: "kit04", code: "KIT-04", name: "Food crate — weekend menu for two", tag: "food crate", kg: 8.0, eur: 35, size: 1, group: "kitchen", mount: "slot" },
  { id: "kit05", code: "KIT-05", name: "Coffee kit — grinder, press, beans", tag: "coffee", kg: 1.4, eur: 7, size: 1, group: "kitchen", mount: "slot" },
  { id: "pwr01", code: "PWR-01", name: "Power station, 1 kWh", tag: "power 1kWh", kg: 10.8, eur: 14, size: 1, group: "power", mount: "slot" },
  { id: "pwr02", code: "PWR-02", name: "Starlink Mini — roof mount", tag: "starlink", kg: 2.2, eur: 25, size: 0, group: "power", mount: "roof" },
  { id: "pwr03", code: "PWR-03", name: "String lights, 10 m", tag: "lights 10m", kg: 0.6, eur: 6, size: 1, group: "power", mount: "slot" },
  { id: "fun01", code: "FUN-01", name: "Projector + folding screen", tag: "projector", kg: 3.8, eur: 18, size: 1, group: "leisure", mount: "slot" },
  { id: "fun02", code: "FUN-02", name: "Book crate — a librarian's dozen", tag: "books", kg: 5.0, eur: 5, size: 1, group: "leisure", mount: "slot" },
  { id: "fun03", code: "FUN-03", name: "Camp chairs ×2", tag: "chairs ×2", kg: 4.8, eur: 8, size: 1, group: "leisure", mount: "slot" },
  { id: "ski01", code: "SKI-01", name: "Ski & board upright rack", tag: "ski rack", kg: 2.9, eur: 14, size: 0, group: "winter", mount: "rack", season: "winter" },
];

const STD_ITEMS = [
  { code: "STD-01", name: "First-aid kit", kg: 0.5 },
  { code: "STD-02", name: "Toolkit + spare tube", kg: 1.2 },
];
const STD_KG = STD_ITEMS.reduce((s, i) => s + i.kg, 0);

const GROUPS = [
  { id: "winter", label: "On the slopes" },
  { id: "sleep", label: "Sleep" },
  { id: "kitchen", label: "Kitchen" },
  { id: "power", label: "Power & signal" },
  { id: "leisure", label: "Leisure" },
];

const PRESETS = {
  starter: { model: "k2", mods: ["slp01", "slp02", "slp03", "fun03"] },
  "film-night": { model: "k3", mods: ["slp01", "slp02", "slp03", "fun01", "pwr01", "pwr03", "kit05"] },
  chef: { model: "k3", mods: ["slp01", "slp02", "slp03", "kit02", "kit03", "kit04"] },
  light: { model: "k1", mods: ["slp02", "slp03", "kit05"] },
  books: { model: "k2", mods: ["slp01", "slp02", "fun02", "kit05", "pwr03"] },
  long: { model: "k3", mods: ["slp01", "slp02", "slp03", "kit02", "kit03", "pwr01", "pwr02"] },
};

const byId = (id) => MODULES.find((m) => m.id === id);
const fmtKg = (n) => (Math.round(n * 10) / 10).toFixed(1);
const currentSeason = () => (document.documentElement.dataset.season === "winter" ? "winter" : "summer");
const availableModules = () => MODULES.filter((m) => !m.season || m.season === currentSeason());
let builderReady = false;

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- builder state ---------- */
const state = {
  model: "k2",
  selected: [], // module ids, in the order they were added
};

function placeModules() {
  const model = MODELS[state.model];
  const grid = Array.from({ length: model.rows }, () => Array(model.cols).fill(null));
  const placed = [];
  let roof = null;
  let rack = null;
  const overflow = [];

  for (const id of state.selected) {
    const mod = byId(id);
    if (mod.mount === "roof") {
      roof = mod;
      continue;
    }
    if (mod.mount === "rack") {
      rack = mod;
      continue;
    }
    let spot = null;
    outer: for (let r = 0; r < model.rows; r++) {
      for (let c = 0; c <= model.cols - mod.size; c++) {
        let free = true;
        for (let k = 0; k < mod.size; k++) if (grid[r][c + k]) free = false;
        if (free) { spot = { r, c }; break outer; }
      }
    }
    if (spot) {
      for (let k = 0; k < mod.size; k++) grid[spot.r][spot.c + k] = mod.id;
      placed.push({ mod, ...spot });
    } else {
      overflow.push(mod);
    }
  }
  return { placed, roof, rack, overflow, grid };
}

function slotsUsed() {
  return state.selected.reduce((s, id) => s + byId(id).size, 0);
}

function totals() {
  const model = MODELS[state.model];
  const kg = state.selected.reduce((s, id) => s + byId(id).kg, 0) + STD_KG;
  const eur = state.selected.reduce((s, id) => s + byId(id).eur, 0) + model.base;
  return { kg, eur, payload: model.payload };
}

/* ---------- trailer drawing ---------- */
function drawTrailer(animateIds = []) {
  const model = MODELS[state.model];
  const { placed, roof, rack } = placeModules();

  const CELL_W = 148, CELL_H = 62, GAP = 10, PAD = 26;
  const innerW = model.cols * CELL_W + (model.cols - 1) * GAP;
  const bodyX = 120, bodyY = 64;
  const bodyW = innerW + PAD * 2;
  const innerX = bodyX + PAD;
  const innerY = bodyY + 30;
  const bodyH = 30 + model.rows * CELL_H + (model.rows - 1) * GAP + 30;
  const bodyBottom = bodyY + bodyH;
  const wheelR = model.rows === 1 ? 50 : 58;
  const wheelCy = bodyBottom + 14;
  const wheelCx = bodyX + bodyW * 0.56;
  const vbW = bodyX + bodyW + 24;
  const vbH = wheelCy + wheelR + 22;

  const cellX = (c) => innerX + c * (CELL_W + GAP);
  const cellY = (r) => innerY + r * (CELL_H + GAP);

  let cells = "";
  for (let r = 0; r < model.rows; r++)
    for (let c = 0; c < model.cols; c++)
      cells += `<rect x="${cellX(c)}" y="${cellY(r)}" width="${CELL_W}" height="${CELL_H}" rx="10" fill="#F0F3F5" stroke="#D4DADD" stroke-dasharray="5 5"/>`;

  let blocks = "";
  for (const { mod, r, c } of placed) {
    const w = mod.size * CELL_W + (mod.size - 1) * GAP;
    const x = cellX(c), y = cellY(r);
    const pop = animateIds.includes(mod.id) ? "mod-pop" : "";
    blocks += `<g class="${pop}">
      <rect x="${x}" y="${y}" width="${w}" height="${CELL_H}" rx="10" fill="#FFFFFF" stroke="#C2C9CE"/>
      <text x="${x + 13}" y="${y + 24}" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#7E868C">${mod.code}</text>
      <text x="${x + 13}" y="${y + 45}" font-family="Archivo, sans-serif" font-size="13.5" font-weight="600" fill="#16191C">${mod.tag}</text>
      <text x="${x + w - 12}" y="${y + 45}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10" fill="#98A0A6">${fmtKg(mod.kg)} kg</text>
    </g>`;
  }

  let roofRig = "";
  if (roof) {
    const rx = bodyX + bodyW - 150;
    const pop = animateIds.includes(roof.id) ? "mod-pop" : "";
    roofRig = `<g class="${pop}">
      <rect x="${rx}" y="${bodyY - 13}" width="64" height="13" rx="4" fill="#fff" stroke="#AEB6BB"/>
      <line x1="${rx + 32}" y1="${bodyY - 13}" x2="${rx + 32}" y2="${bodyY - 26}" stroke="#9AA2A8" stroke-width="3"/>
      <ellipse cx="${rx + 32}" cy="${bodyY - 33}" rx="20" ry="9" fill="#EFF2F4" stroke="#9AA2A8" stroke-width="1.5" transform="rotate(-16 ${rx + 32} ${bodyY - 33})"/>
    </g>`;
  }

  let rackRig = "";
  if (rack) {
    const cx = bodyX + bodyW * 0.40;
    const tipY = bodyY - 100;
    const pop = animateIds.includes(rack.id) ? "mod-pop" : "";
    rackRig = `<g class="${pop}">
      <rect x="${cx - 26}" y="${bodyY - 13}" width="52" height="13" rx="4" fill="#fff" stroke="#AEB6BB"/>
      <path d="M${cx - 9} ${bodyY - 13} L ${cx - 9} ${tipY + 16} Q ${cx - 9} ${tipY + 1} ${cx + 3} ${tipY + 5}" fill="none" stroke="#1F2326" stroke-width="6" stroke-linecap="round"/>
      <path d="M${cx + 8} ${bodyY - 13} L ${cx + 8} ${tipY + 16} Q ${cx + 8} ${tipY + 1} ${cx + 20} ${tipY + 5}" fill="none" stroke="#6B7176" stroke-width="6" stroke-linecap="round"/>
      <rect x="${cx - 15}" y="${bodyY - 58}" width="38" height="7" rx="3.5" fill="#FF471D"/>
    </g>`;
  }

  const spokes = [];
  const sr = wheelR - 16;
  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 4;
    const dx = Math.cos(ang) * sr, dy = Math.sin(ang) * sr;
    spokes.push(`<line x1="${wheelCx - dx}" y1="${wheelCy - dy}" x2="${wheelCx + dx}" y2="${wheelCy + dy}" stroke="#9AA2A8" stroke-width="3"/>`);
  }

  const topReach = rack ? bodyY - 100 : bodyY - 76;
  const vbTop = Math.min(0, topReach - 16);
  const svg = `<svg viewBox="0 ${vbTop} ${vbW} ${vbH - vbTop}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cutaway view of your ${model.code} trailer build">
    <defs>
      <linearGradient id="shellG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F5F7F8"/><stop offset="1" stop-color="#DFE4E7"/>
      </linearGradient>
    </defs>
    <ellipse cx="${bodyX + bodyW / 2}" cy="${vbH - 8}" rx="${bodyW * 0.52}" ry="9" fill="rgba(22,25,28,.08)"/>
    <path d="M${bodyX} ${bodyY + bodyH - 38} C ${bodyX - 44} ${bodyY + bodyH - 38} ${bodyX - 68} ${bodyY + bodyH - 16} ${bodyX - 86} ${bodyY + bodyH + 6}" stroke="#9AA2A8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="${bodyX - 90}" cy="${bodyY + bodyH + 10}" r="11" fill="#C4CBCF" stroke="#9AA2A8" stroke-width="3"/>
    <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="24" fill="url(#shellG)" stroke="#B6BDC2" stroke-width="1.5"/>
    <line x1="${bodyX + 16}" y1="${bodyY + 9}" x2="${bodyX + bodyW - 16}" y2="${bodyY + 9}" stroke="#A7AFB5" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 24"/>
    <line x1="${bodyX + 16}" y1="${bodyBottom - 9}" x2="${bodyX + bodyW - 16}" y2="${bodyBottom - 9}" stroke="#A7AFB5" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 24"/>
    <line x1="${bodyX + 14}" y1="${bodyY + 116}" x2="${bodyX + 14}" y2="${Math.max(bodyY + 120, bodyBottom - 60)}" stroke="#A7AFB5" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 24" opacity="${model.rows > 1 ? 1 : 0}"/>
    ${cells}
    ${blocks}
    ${roofRig}
    ${rackRig}
    <line x1="${bodyX + 14}" y1="${bodyY}" x2="${bodyX + 14}" y2="${bodyY - 76}" stroke="#4A4F53" stroke-width="3" stroke-linecap="round"/>
    <path class="flutter" d="M${bodyX + 14} ${bodyY - 74} L ${bodyX + 70} ${bodyY - 61} L ${bodyX + 14} ${bodyY - 47} Z" fill="#FF471D"/>
    <text x="${bodyX + PAD}" y="${bodyBottom - 17}" font-family="IBM Plex Mono, monospace" font-size="10.5" letter-spacing="1" fill="#98A0A6">LID POCKET — STD-01 FIRST AID · STD-02 TOOLKIT · INCLUDED</text>
    <circle cx="${wheelCx}" cy="${wheelCy}" r="${wheelR}" fill="none" stroke="#1F2326" stroke-width="15"/>
    <circle cx="${wheelCx}" cy="${wheelCy}" r="${wheelR - 13}" fill="#E2E7EA" stroke="#AEB6BB" stroke-width="2"/>
    ${spokes.join("")}
    <circle cx="${wheelCx}" cy="${wheelCy}" r="8" fill="#6B7176"/>
    <path d="M ${wheelCx - wheelR - 9} ${wheelCy - 4} A ${wheelR + 9} ${wheelR + 9} 0 0 1 ${wheelCx + wheelR + 9} ${wheelCy - 4}" stroke="#B6BDC2" stroke-width="8" fill="none"/>
    <text x="${bodyX + bodyW - PAD}" y="${bodyY + 22}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" fill="#8F979D">KERVAN · ${model.code}</text>
  </svg>`;

  return svg;
}

/* ---------- builder UI ---------- */
function renderModuleList() {
  const list = document.getElementById("module-list");
  if (!list) return;
  const season = currentSeason();
  let html = "";
  for (const g of GROUPS) {
    const mods = MODULES.filter((m) => m.group === g.id && (!m.season || m.season === season));
    if (!mods.length) continue;
    html += `<div class="mod-group"><h3 class="mod-group-title">${g.label}</h3>`;
    for (const m of mods) {
      const meta = m.mount === "roof" ? `${m.code} · ${fmtKg(m.kg)} kg · roof mount`
        : m.mount === "rack" ? `${m.code} · ${fmtKg(m.kg)} kg · upright rack`
        : `${m.code} · ${fmtKg(m.kg)} kg · ${m.size} slot${m.size > 1 ? "s" : ""}`;
      html += `<label class="mod">
        <input type="checkbox" data-mod="${m.id}" ${state.selected.includes(m.id) ? "checked" : ""}>
        <span class="tick"><svg viewBox="0 0 12 12" fill="none"><path d="M2 6.2 4.8 9 10 3.4" stroke="#F8FAFB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span><span class="mod-name">${m.name}</span><span class="mod-meta" style="display:block">${meta}</span></span>
        <span class="mod-price">+€${m.eur}</span>
      </label>`;
    }
    html += `</div>`;
  }
  html += `<div class="mod-group"><h3 class="mod-group-title">Always on board</h3>`;
  for (const s of STD_ITEMS) {
    html += `<div class="mod mod--std">
      <span class="tick"><svg viewBox="0 0 12 12" fill="none"><path d="M2 6.2 4.8 9 10 3.4" stroke="#16191C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span><span class="mod-name">${s.name}</span><span class="mod-meta" style="display:block">${s.code} · ${fmtKg(s.kg)} kg · lid pocket</span></span>
      <span class="mod-tag">included</span>
    </div>`;
  }
  html += `</div>`;
  list.innerHTML = html;

  list.querySelectorAll("input[data-mod]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.mod;
      if (input.checked) {
        const mod = byId(id);
        if (mod.mount === "roof" && state.selected.some((s) => byId(s).mount === "roof")) {
          input.checked = false;
          toast("The roof rail takes one mount. Remove Starlink first.");
          return;
        }
        if (mod.mount === "slot") {
          const model = MODELS[state.model];
          const free = model.rows * model.cols - slotsUsed();
          if (mod.size > free) {
            input.checked = false;
            toast(`No free slot in ${model.code}. Switch shells or remove a module.`);
            return;
          }
        }
        state.selected.push(id);
        renderBuild([id]);
      } else {
        state.selected = state.selected.filter((s) => s !== id);
        renderBuild();
      }
    });
  });
}

function renderBuild(animateIds = []) {
  const rigSvg = document.getElementById("rig-svg");
  if (!rigSvg) return;
  rigSvg.innerHTML = drawTrailer(animateIds);

  const model = MODELS[state.model];
  const { kg, eur, payload } = totals();
  const used = slotsUsed();
  const cap = model.rows * model.cols;
  const over = kg > payload;

  const fill = document.getElementById("gauge-fill");
  fill.style.width = Math.min(100, (kg / payload) * 100) + "%";
  fill.classList.toggle("is-over", over);

  document.getElementById("gauge-kg").textContent = `${fmtKg(kg)} / ${payload} kg`;
  document.getElementById("gauge-slots").textContent = `${used} / ${cap} slots · roof ${state.selected.some((s) => byId(s).mount === "roof") ? "1/1" : "0/1"}`;
  document.getElementById("gauge-warn").textContent = over
    ? `Over payload by ${fmtKg(kg - payload)} kg. Drop a module or switch to a bigger shell.`
    : "";

  const empty = document.getElementById("rig-empty");
  if (empty) empty.style.display = state.selected.length ? "none" : "block";

  document.getElementById("bar-eur").textContent = `€${eur}`;
  document.getElementById("bar-kg").textContent = `${fmtKg(kg)} kg`;
  document.getElementById("bar-mods").textContent = `${state.selected.length} of ${availableModules().length}`;

  const cont = document.getElementById("bar-continue");
  if (cont) cont.href = `builder.html?model=${state.model}&mods=${state.selected.join(",")}`;

  const reserveBtn = document.getElementById("bar-reserve");
  if (reserveBtn) reserveBtn.disabled = over;

  document.querySelectorAll(".preset").forEach((b) => {
    const p = PRESETS[b.dataset.preset];
    const match = p && p.model === state.model &&
      p.mods.length === state.selected.length &&
      p.mods.every((m) => state.selected.includes(m));
    b.classList.toggle("is-on", !!match);
  });
}

function setModel(modelId, { announce = true } = {}) {
  state.model = modelId;
  const radio = document.querySelector(`input[name="model"][value="${modelId}"]`);
  if (radio) radio.checked = true;

  const model = MODELS[modelId];
  const cap = model.rows * model.cols;
  let used = 0;
  const keep = [], dropped = [];
  let roofKept = false;
  for (const id of state.selected) {
    const m = byId(id);
    if (m.mount === "roof") { roofKept = true; keep.push(id); continue; }
    if (used + m.size <= cap) { used += m.size; keep.push(id); }
    else dropped.push(m);
  }
  state.selected = keep;
  if (dropped.length && announce) {
    toast(`Trimmed to fit ${model.code} — removed ${dropped.map((d) => d.tag).join(", ")}.`);
  }
  document.querySelectorAll("#module-list input[data-mod]").forEach((i) => {
    i.checked = state.selected.includes(i.dataset.mod);
  });
  renderBuild();
}

function applyPreset(presetId) {
  const p = PRESETS[presetId];
  if (!p) return;
  state.selected = [...p.mods];
  setModel(p.model, { announce: false });
  document.querySelectorAll("#module-list input[data-mod]").forEach((i) => {
    i.checked = state.selected.includes(i.dataset.mod);
  });
  renderBuild(state.selected);
}

/* ---------- reserve dialog ---------- */
function nextFridays(n) {
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (out.length < n) {
    if (d.getDay() === 5) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function initReserve() {
  const dlg = document.getElementById("reserve-dialog");
  const openBtn = document.getElementById("bar-reserve");
  if (!dlg || !openBtn) return;

  openBtn.addEventListener("click", () => {
    if (!state.selected.length) {
      toast("Nothing on board yet. Add a module to start your build.");
      return;
    }
    const model = MODELS[state.model];
    const { eur } = totals();

    let rows = `<div class="manifest-row"><span>${model.code} ${model.name} — shell</span><span>€${model.base}</span></div>`;
    for (const id of state.selected) {
      const m = byId(id);
      rows += `<div class="manifest-row"><span>${m.code} ${m.tag}</span><span>+€${m.eur}</span></div>`;
    }
    rows += `<div class="manifest-row"><span>STD-01/02 first aid · toolkit</span><span>included</span></div>`;
    rows += `<div class="manifest-row is-total"><span>weekend total</span><span>€${eur}</span></div>`;
    document.getElementById("reserve-manifest").innerHTML = rows;

    const fridays = nextFridays(3);
    document.getElementById("weekend-list").innerHTML = fridays
      .map((f, i) => {
        const sun = new Date(f);
        sun.setDate(sun.getDate() + 2);
        const label = `fri ${f.getDate()} ${MONTHS[f.getMonth()]} – sun ${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
        const val = `${String(f.getMonth() + 1).padStart(2, "0")}${String(f.getDate()).padStart(2, "0")}`;
        return `<label><input type="radio" name="weekend" value="${val}" ${i === 0 ? "checked" : ""}><span>${label}</span><span>${i === 0 ? "next up" : ""}</span></label>`;
      })
      .join("");

    document.getElementById("reserve-form").style.display = "";
    document.getElementById("reserve-confirm").style.display = "none";
    document.getElementById("form-error").textContent = "";
    dlg.showModal();
  });

  document.getElementById("reserve-cancel").addEventListener("click", () => dlg.close());

  document.getElementById("reserve-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("f-name").value.trim();
    const email = document.getElementById("f-email").value.trim();
    const bike = document.getElementById("f-bike").value.trim();
    const err = document.getElementById("form-error");
    if (!name) { err.textContent = "Add a name for the delivery label."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "Enter an email so we can send the manifest."; return; }
    if (!bike) { err.textContent = "Tell us your bike model so we can fit the right hitch."; return; }
    err.textContent = "";

    const weekend = document.querySelector('input[name="weekend"]:checked').value;
    const ref = `KV-${weekend}-${MODELS[state.model].code}-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById("confirm-ref").textContent = ref;
    document.getElementById("confirm-email").textContent = email;
    const confirmBike = document.getElementById("confirm-bike");
    if (confirmBike) confirmBike.textContent = bike;
    document.getElementById("reserve-form").style.display = "none";
    document.getElementById("reserve-confirm").style.display = "block";
  });

  document.getElementById("reserve-done").addEventListener("click", () => {
    dlg.close();
    toast("Build reserved. See you Friday morning.");
  });
}

/* ---------- season ---------- */
function initSeason() {
  const root = document.documentElement;
  const btns = document.querySelectorAll("[data-season-set]");
  const meta = document.querySelector('meta[name="theme-color"]');
  const summerTheme = meta ? meta.getAttribute("content") : "#E8EBED";

  function apply(season, initial) {
    root.dataset.season = season;
    try { localStorage.setItem("kervan-season", season); } catch (e) {}
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seasonSet === season)));
    document.querySelectorAll("[data-label-summer]").forEach((el) => {
      el.textContent = season === "winter" ? el.dataset.labelWinter : el.dataset.labelSummer;
    });
    if (meta) meta.setAttribute("content", season === "winter" ? "#DCE7EC" : summerTheme);

    if (!initial) {
      // season-only blocks load hidden, so the scroll observer never fires — reveal the now-visible set
      const sel = season === "winter" ? ".season-winter" : ".season-summer";
      document.querySelectorAll(`${sel}, ${sel} .reveal`).forEach((el) => el.classList.add("in"));
      // the builder is shared between seasons — drop ski-only gear when leaving winter, then redraw
      if (builderReady) {
        if (season !== "winter") {
          state.selected = state.selected.filter((id) => { const m = byId(id); return !m.season || m.season === season; });
        }
        renderModuleList();
        renderBuild();
      }
    }
  }

  btns.forEach((b) => b.addEventListener("click", () => apply(b.dataset.seasonSet)));
  apply(currentSeason(), true);
}

/* ---------- premade winter kits ---------- */
function initKits() {
  document.querySelectorAll("[data-kit]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      toast(`“${card.dataset.kit}” — boxed and ready. We'll bolt it in and have it hitch-ready Friday.`);
    });
  });
}

/* ---------- init ---------- */
function initBuilder() {
  if (!document.getElementById("rig-svg")) return;

  const params = new URLSearchParams(location.search);
  const preset = params.get("preset");
  const modelParam = params.get("model");
  const modsParam = params.get("mods");

  if (preset && PRESETS[preset]) {
    state.model = PRESETS[preset].model;
    state.selected = [...PRESETS[preset].mods];
  } else {
    if (modelParam && MODELS[modelParam]) state.model = modelParam;
    if (modsParam !== null) {
      state.selected = modsParam.split(",").filter((id) => byId(id));
    } else if (document.body.dataset.defaultPreset) {
      const p = PRESETS[document.body.dataset.defaultPreset];
      state.model = p.model;
      state.selected = [...p.mods];
    }
  }

  renderModuleList();
  const radio = document.querySelector(`input[name="model"][value="${state.model}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('input[name="model"]').forEach((r) => {
    r.addEventListener("change", () => setModel(r.value));
  });

  document.querySelectorAll(".preset").forEach((b) => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });

  renderBuild();
  initReserve();
  builderReady = true;
}

document.addEventListener("DOMContentLoaded", () => {
  initSeason();
  initReveal();
  initBuilder();
  initKits();
});
