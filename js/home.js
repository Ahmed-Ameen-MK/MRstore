/* ====== الصفحة الرئيسية ====== */
const PAGE_STEP = 4;         // عدد المنتجات في كل دفعة (حد أقصى 4 ثم "عرض المزيد")
const SLIDE_MS = 30000;      // مدة بقاء المنتج في العرض المميز
const SLIDE_COUNT = 6;       // عدد المنتجات في العرض المميز
const RANDOM_COUNT = 4;      // عدد المنتجات العشوائية
const ALL = "__all__";
const $ = s => document.querySelector(s);

let products = [];
let state = { cat: ALL, q: "", shown: PAGE_STEP };

const ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.2 11h9.6l2-8H6.3"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/></svg>';
const ICON_BELL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1.6 1.6 0 0 0-1.6 1.6v.7C7.7 5 6 7.3 6 10v3.6L4.3 16A1 1 0 0 0 5.1 17.6h13.8a1 1 0 0 0 .8-1.6L18 13.6V10c0-2.7-1.7-5-4.4-5.7v-.7A1.6 1.6 0 0 0 12 2Zm0 20a2.6 2.6 0 0 0 2.5-2h-5A2.6 2.6 0 0 0 12 22Z"/></svg>';

const catKey = p => String(p.category ?? "").trim() || "غير مصنف";
const shortDesc = t => {
  const w = String(t ?? "").trim().split(/\s+/).filter(Boolean);
  return w.length > 12 ? w.slice(0, 12).join(" ") + " ..." : w.join(" ");
};
const priceTxt = p => `${escapeHtml(p.price)} ${CURRENCY}`;
const imgOf = p => escapeHtml(p.avatar_url || "icon.png");
const slugOf = p => escapeHtml(slug(p.title));

/* ---------- التصنيفات ---------- */
function renderCats(){
  const map = new Map();
  products.forEach(p => { const k = catKey(p); map.set(k, (map.get(k) || 0) + 1); });
  const names = [...map.keys()].sort((a, b) => a.localeCompare(b, "ar"));
  const box = $("#cats");
  box.innerHTML =
    `<button class="cat ${state.cat === ALL ? "active" : ""}" data-c="${ALL}">الكل <small>${products.length}</small></button>` +
    names.map(n => `<button class="cat ${state.cat === n ? "active" : ""}" data-c="${escapeHtml(n)}">${escapeHtml(n)} <small>${map.get(n)}</small></button>`).join("");
  box.querySelectorAll(".cat").forEach(b => b.onclick = () => {
    state.cat = b.dataset.c; state.shown = PAGE_STEP;
    renderCats(); renderAll(); closeMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------- البحث + التصفية ---------- */
function matches(p){
  if (state.cat !== ALL && catKey(p) !== state.cat) return false;
  const q = norm(state.q);
  return !q || Object.values(p).some(v => norm(v).includes(q));
}
const filtering = () => state.cat !== ALL || norm(state.q) !== "";

/* ---------- كل المنتجات (4 ثم عرض المزيد) ---------- */
const cardHtml = p => `
  <article class="card glass tilt reveal" data-slug="${slugOf(p)}">
    <div class="thumb">
      <img loading="lazy" src="${imgOf(p)}" alt="${escapeHtml(p.title)}" onerror="this.src='icon.png'">
      <span class="badge">${escapeHtml(catKey(p))}</span>
    </div>
    <div class="info">
      <h4>${escapeHtml(p.title)}</h4>
      <p>${escapeHtml(shortDesc(p.description))}</p>
      <div class="price">${priceTxt(p)}</div>
    </div>
  </article>`;

function renderProducts(){
  const list = products.filter(matches);
  const grid = $("#grid");
  $("#title").textContent = state.cat === ALL ? "كل المنتجات" : state.cat;
  $("#count").textContent = list.length + " منتج";
  if (!list.length){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">لا توجد منتجات مطابقة</div>';
    $("#moreWrap").hidden = true; return;
  }
  grid.innerHTML = list.slice(0, state.shown).map(cardHtml).join("");
  observeReveal(grid);
  const left = list.length - state.shown;
  $("#moreWrap").hidden = left <= 0;
  if (left > 0) $("#moreBtn").textContent = `عرض المزيد (${left})`;
}
$("#moreBtn").onclick = () => {
  const before = state.shown;
  state.shown += PAGE_STEP;
  const list = products.filter(matches);
  $("#grid").insertAdjacentHTML("beforeend", list.slice(before, state.shown).map(cardHtml).join(""));
  observeReveal($("#grid"));
  const left = list.length - state.shown;
  $("#moreWrap").hidden = left <= 0;
  if (left > 0) $("#moreBtn").textContent = `عرض المزيد (${left})`;
};

/* ---------- العرض المميز (شريحة كاملة العرض) ---------- */
let slideIdx = 0, slideTimer = null, slides = [];
function renderSlider(){
  const list = products.slice(0, SLIDE_COUNT);
  $("#secSlider").hidden = !list.length || filtering();
  if (!list.length) return;
  $("#slider").innerHTML = list.map(p => `
    <article class="slide glass" data-slug="${slugOf(p)}">
      <div class="s-img"><img src="${imgOf(p)}" alt="${escapeHtml(p.title)}" onerror="this.src='icon.png'"></div>
      <div class="s-info">
        <span class="tagc">${escapeHtml(catKey(p))}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div class="price">${priceTxt(p)}</div>
      </div>
    </article>`).join("");
  $("#dots").innerHTML = list.length > 1 ? list.map((_, i) => `<button data-i="${i}" aria-label="${i + 1}"></button>`).join("") : "";
  slides = [...document.querySelectorAll("#slider .slide")];
  slideIdx = 0; slides[0].classList.add("active"); markDot();
  clearInterval(slideTimer);
  if (slides.length > 1) slideTimer = setInterval(() => goSlide((slideIdx + 1) % slides.length), SLIDE_MS);
}
function markDot(){ document.querySelectorAll("#dots button").forEach((b, i) => b.classList.toggle("on", i === slideIdx)); }
function goSlide(next){
  if (next === slideIdx || !slides.length) return;
  const cur = slides[slideIdx], nxt = slides[next];
  // الحالي يتحرك لليمين ويتبعه التالي ليحل محله
  slides.forEach(s => { if (s !== cur && s !== nxt){ s.classList.remove("active", "out"); } });
  nxt.style.transition = "none"; nxt.classList.remove("out", "active"); void nxt.offsetWidth; nxt.style.transition = "";
  cur.classList.remove("active"); cur.classList.add("out");
  nxt.classList.add("active");
  setTimeout(() => { cur.style.transition = "none"; cur.classList.remove("out"); void cur.offsetWidth; cur.style.transition = ""; }, 1200);
  slideIdx = next; markDot();
}
$("#dots").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  goSlide(+b.dataset.i);
  clearInterval(slideTimer); slideTimer = setInterval(() => goSlide((slideIdx + 1) % slides.length), SLIDE_MS);
});

/* ---------- 4 منتجات عشوائية ---------- */
function renderRandom(){
  $("#secRandom").hidden = !products.length || filtering();
  if (!products.length) return;
  const a = [...products];
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  $("#randGrid").innerHTML = a.slice(0, RANDOM_COUNT).map(cardHtml).join("");
  observeReveal($("#randGrid"));
}

function renderAll(){
  renderProducts();
  $("#secSlider").hidden = filtering() || !products.length;
  $("#secRandom").hidden = filtering() || !products.length;
}

/* ---------- زرا العين والسلة عند الضغط على منتج ---------- */
const actions = $("#pActions");
function showActions(card){
  document.querySelectorAll(".sel").forEach(e => e.classList.remove("sel"));
  card.classList.add("sel");
  const href = "details.html?title=" + encodeURIComponent(card.dataset.slug);
  actions.querySelectorAll("a").forEach(a => a.href = href);
  actions.classList.add("show");
}
function hideActions(){ actions.classList.remove("show"); document.querySelectorAll(".sel").forEach(e => e.classList.remove("sel")); }
document.addEventListener("click", e => {
  const c = e.target.closest("[data-slug]");
  if (c) showActions(c);
  else if (!e.target.closest("#pActions")) hideActions();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") hideActions(); });

/* ---------- شريط الأخبار ---------- */
async function loadNews(){
  try { if (sessionStorage.getItem("mr_news_closed")) return; } catch {}
  const { data, error } = await sb.from("news").select("id,content,created_at").order("created_at", { ascending: false }).limit(30);
  if (error || !data || !data.length) return;
  const bar = $("#newsBar"), track = $("#nbTrack");
  const group = '<div class="nb-group">' + data.map(n => `<span class="nb-item">${ICON_BELL}<span>${escapeHtml(n.content)}</span></span>`).join("") + "</div>";
  bar.hidden = false;
  track.innerHTML = group;
  const gw = track.firstElementChild.getBoundingClientRect().width || 1;
  const copies = Math.max(2, Math.ceil(($("#nbView").getBoundingClientRect().width * 2) / gw) + 1);
  track.innerHTML = group.repeat(copies);
  track.style.setProperty("--gw", gw + "px");
  track.style.setProperty("--dur", Math.max(18, gw / 55) + "s");
}
$("#nbClose").onclick = () => { $("#newsBar").hidden = true; try { sessionStorage.setItem("mr_news_closed", "1"); } catch {} };

/* ---------- التحميل ---------- */
async function load(){
  const { data, error } = await sb.from("store").select("*").order("id", { ascending: false });
  if (error){
    $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1">تعذر تحميل المنتجات: ${escapeHtml(error.message)}</div>`;
    return;
  }
  products = data || [];
  renderCats(); renderProducts(); renderSlider(); renderRandom();
  $("#secSlider").hidden = filtering() || !products.length;
  $("#secRandom").hidden = filtering() || !products.length;
}

let t;
$("#q").addEventListener("input", e => {
  clearTimeout(t);
  t = setTimeout(() => { state.q = e.target.value; state.shown = PAGE_STEP; renderAll(); }, 120);
});

const sidebar = $("#sidebar"), overlay = $("#overlay");
function closeMenu(){ sidebar.classList.remove("open"); overlay.classList.remove("show"); }
$("#menuBtn").onclick = () => { sidebar.classList.add("open"); overlay.classList.add("show"); };
overlay.onclick = closeMenu;

initSite();
loadNews();
load();
