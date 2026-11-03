/* ====== واجهة مشتركة للصفحات العامة: الهيدر، الدعم، الرسائل، الفوتر ====== */
const ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
const ICON_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-4 2h-2"/></svg>';

const ICON_LOGOUT = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="m16 8 4 4-4 4M20 12H9"/></svg>';
const ICON_DASH = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>';

const CHAT = {
  support: {
    title: "الدعم — اتصل بنا", ph: "اكتب رسالتك للدعم...",
    empty: "اكتب مشكلتك أو استفسارك وسنرد عليك في أقرب وقت.",
    thanks: "شكراً على مراسلتنا، سيتم الرد عليك قريباً.",
    login: "سجّل الدخول لتتمكن من مراسلة الدعم ومتابعة الردود."
  },
  message: {
    title: "الرسائل", ph: "اكتب رسالتك للإدارة...",
    empty: "لا توجد رسائل بعد. اكتب رسالتك للإدارة من الأسفل.",
    thanks: "تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا.",
    login: "سجّل الدخول لعرض رسائلك ومراسلة الإدارة."
  }
};

const fmtTime = iso => { try { return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };
const ticksHtml = seen => seen === "done"
  ? '<span class="ticks done"><b>✓✓</b>تم قراءتها</span>'
  : '<span class="ticks none"><b>✓✓</b>لم تقرأ بعد</span>';

/* استدعاء دالة تخص المستخدم الحالي (الخادم يتحقق من الإيميل + الهاش) */
async function rpcUser(fn, args = {}){
  const u = getUser();
  if (!u || !u.h) throw new Error("login");
  const { data, error } = await sb.rpc(fn, { p_email: u.email, p_hash: u.h, ...args });
  if (error) throw error;
  return data;
}
function sendContact(type, content){ return rpcUser("mr_send_contact", { p_type: type, p_content: content }); }

/* ---------- الإشعارات الحمراء ---------- */
function setBadge(id, n){
  const el = document.getElementById(id);
  if (!el) return;
  if (n > 0){ el.textContent = n > 99 ? "99+" : n; el.hidden = false; } else el.hidden = true;
}
async function refreshBadges(){
  if (!getUser()) return;
  try {
    const c = await rpcUser("mr_unread_counts");
    setBadge("msgBadge", Number(c.message) || 0);
    setBadge("supBadge", Number(c.support) || 0);
  } catch {}
}

/* ---------- الهيدر ---------- */
function renderAuthArea(){
  const u = getUser(), box = document.getElementById("authArea");
  if (!box) return;
  if (u){
    box.innerHTML =
      (u.status === "admin" ? `<a class="btn primary sq" href="admin/dashboard.html" title="لوحة التحكم" aria-label="لوحة التحكم">${ICON_DASH}<span class="hide-sm">لوحة التحكم</span></a>` : "") +
      `<button class="icon-btn" id="msgBtn" title="الرسائل" aria-label="الرسائل">${ICON_MAIL}<span class="badge-red" id="msgBadge" hidden></span></button>
       <div class="user-chip" title="${escapeHtml(u.name)}"><span class="hide-sm">أهلاً</span> <b class="u-name">${escapeHtml(u.name)}</b><span class="u-circle">${escapeHtml(String(u.name || "?").trim().charAt(0).toUpperCase())}</span></div>
       <button class="btn sq" id="logoutBtn" title="خروج" aria-label="خروج">${ICON_LOGOUT}<span class="hide-sm">خروج</span></button>`;
    document.getElementById("logoutBtn").onclick = logout;
    document.getElementById("msgBtn").onclick = () => openChat("message");
  } else {
    box.innerHTML = '<a class="btn" href="auth/login.html">Login</a><a class="btn primary" href="auth/register.html">Sign up</a>';
  }
}

/* ---------- زر الدعم العائم ---------- */
function initSupportFab(){
  const b = document.createElement("button");
  b.className = "support-fab"; b.id = "supportBtn"; b.setAttribute("aria-label", "اتصل بنا");
  b.innerHTML = `${ICON_HEAD}<span class="t">اتصل بنا</span><span class="badge-red" id="supBadge" hidden></span>`;
  b.onclick = () => openChat("support");
  document.body.appendChild(b);
}

/* ---------- الفوتر ---------- */
function renderFooter(){
  const page = location.pathname.split("/").pop().replace(/\.html$/, "");
  const links = [["privacy.html", "privacy", "سياسة الخصوصية"], ["terms.html", "terms", "شروط الاستخدام"], ["about.html", "about", "عن المتجر"]];
  const f = document.createElement("footer");
  f.className = "site-footer";
  f.innerHTML = `<div class="foot-in">
      <nav class="foot-links">${links.map(([h, k, t]) => `<a class="${page === k ? "on" : ""}" href="${h}">${t}</a>`).join("")}</nav>
      <div class="dev" id="devTxt" aria-label="Developed by 9roo"></div>
    </div>
    <div class="copy">© ${new Date().getFullYear()} MR store</div>`;
  document.body.appendChild(f);
  startDevTyping(document.getElementById("devTxt"));
}

/* كتابة مباشرة:  < Developed by = "9roo" >  ثم تكبر 9roo وتعود، وتتكرر طالما الفوتر ظاهر */
function startDevTyping(box){
  const A = '< Developed by = "', N = "9roo", Z = '" >', FULL = A + N + Z;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let token = 0;

  function draw(n, pop){
    const t = FULL.slice(0, n);
    const a = t.slice(0, A.length), nm = t.slice(A.length, A.length + N.length), z = t.slice(A.length + N.length);
    box.innerHTML = esc(a) + (nm ? `<span class="nine${pop ? " pop" : ""}">${esc(nm)}</span>` : "") + esc(z) + '<span class="caret2"></span>';
  }
  async function loop(my){
    while (my === token){
      for (let i = 1; i <= FULL.length && my === token; i++){ draw(i); await sleep(rnd(55, 150) + (Math.random() < 0.12 ? rnd(100, 220) : 0)); }
      if (my !== token) return;
      await sleep(350);
      draw(FULL.length, true);  await sleep(1500);   // تكبر بشكل ملحوظ
      if (my !== token) return;
      draw(FULL.length, false); await sleep(2600);   // ترجع لحجمها وتبقى
      for (let i = FULL.length; i >= 0 && my === token; i--){ draw(i); await sleep(rnd(18, 40)); }
      await sleep(500);
    }
  }
  if (!("IntersectionObserver" in window)){ loop(++token); return; }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ loop(++token); } else { token++; }
  }), { threshold: 0.4 }).observe(box);
}

/* ---------- مؤثرات: ظهور تدريجي + لمعة الزجاج ---------- */
let _revealIO = null;
function observeReveal(root = document){
  const els = root.querySelectorAll(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)){ els.forEach(e => e.classList.add("in")); return; }
  if (!_revealIO) _revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add("in"); _revealIO.unobserve(e.target); }
  }), { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
  els.forEach((e, i) => { if (!e.style.getPropertyValue("--d")) e.style.setProperty("--d", Math.min(i % 8, 7) * 70 + "ms"); _revealIO.observe(e); });
}
function initGlass(){
  document.addEventListener("pointermove", e => {
    const g = e.target.closest && e.target.closest(".glass");
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--mx", (e.clientX - r.left) + "px");
    g.style.setProperty("--my", (e.clientY - r.top) + "px");
    if (g.classList.contains("tilt") && e.pointerType === "mouse"){
      g.style.setProperty("--ry", (((e.clientX - r.left) / r.width - .5) * 7).toFixed(2) + "deg");
      g.style.setProperty("--rx", ((.5 - (e.clientY - r.top) / r.height) * 7).toFixed(2) + "deg");
    }
  }, { passive: true });
  document.addEventListener("pointerout", e => {
    const g = e.target.closest && e.target.closest(".tilt");
    if (g && !g.contains(e.relatedTarget)){ g.style.removeProperty("--rx"); g.style.removeProperty("--ry"); }
  });
}

/* ---------- النوافذ المنبثقة ---------- */
function closeModal(){ document.querySelectorAll(".m-back").forEach(e => e.remove()); document.body.style.overflow = ""; }
function modal(title, bodyHtml, footHtml){
  closeModal();
  const back = document.createElement("div");
  back.className = "m-back";
  back.innerHTML = `<div class="m-box" role="dialog" aria-modal="true">
      <div class="m-head"><h3>${title}</h3><button class="m-x" aria-label="إغلاق">×</button></div>
      <div class="m-body">${bodyHtml}</div>${footHtml ? `<div class="m-foot">${footHtml}</div>` : ""}</div>`;
  back.addEventListener("mousedown", e => { if (e.target === back) closeModal(); });
  back.querySelector(".m-x").onclick = closeModal;
  document.body.appendChild(back);
  document.body.style.overflow = "hidden";
  return back;
}

/* محادثة مع الإدارة: type = support | message */
async function openChat(type){
  const cfg = CHAT[type], u = getUser();
  if (!u || !u.h){
    modal(cfg.title, `<div class="chat-empty">${cfg.login}<br>
      <a class="btn primary" href="auth/login.html">تسجيل الدخول</a> <a class="btn" href="auth/register.html">إنشاء حساب</a></div>`);
    return;
  }
  const back = modal(cfg.title, '<div class="chat-empty">جاري التحميل...</div>',
    `<textarea class="txt" id="chatTxt" maxlength="2000" placeholder="${cfg.ph}"></textarea>
     <div class="row"><small id="chatMsg" style="color:var(--muted)">Ctrl + Enter للإرسال</small><button class="btn primary" id="chatSend">إرسال</button></div>`);
  const body = back.querySelector(".m-body"), txt = back.querySelector("#chatTxt"),
        send = back.querySelector("#chatSend"), msg = back.querySelector("#chatMsg");
  let rows = [], thanks = false;

  const bubble = r => r.from === "admin"
    ? `<div class="bub admin">${escapeHtml(r.content)}<small>الإدارة · ${fmtTime(r.created_at)}</small></div>`
    : `<div class="bub me">${escapeHtml(r.content)}<small>${fmtTime(r.created_at)} ${ticksHtml(r.seen)}</small></div>`;
  const draw = () => {
    body.innerHTML = rows.length ? rows.map(bubble).join("") : `<div class="chat-empty">${cfg.empty}</div>`;
    if (thanks) body.insertAdjacentHTML("beforeend", `<div class="thanks">${cfg.thanks}</div>`);
    body.scrollTop = body.scrollHeight;
  };

  try {
    rows = await rpcUser("mr_my_messages", { p_type: type }) || [];
    draw();
    if (rows.some(r => r.from === "admin")){
      await rpcUser("mr_mark_read", { p_type: type });
      setBadge(type === "support" ? "supBadge" : "msgBadge", 0);
    }
  } catch (e) { body.innerHTML = `<div class="chat-empty">تعذر التحميل: ${escapeHtml(e.message || e)}</div>`; }

  async function doSend(){
    const v = txt.value.trim();
    if (!v) return;
    send.disabled = true; msg.textContent = "جاري الإرسال...";
    try {
      const row = await sendContact(type, v);
      rows.push(row); thanks = true; txt.value = ""; msg.textContent = ""; draw();
    } catch (e) { msg.textContent = "تعذر الإرسال: " + (e.message || e); msg.style.color = "var(--danger)"; }
    send.disabled = false;
  }
  send.onclick = doSend;
  txt.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) doSend(); });
  txt.addEventListener("input", () => { if (thanks){ thanks = false; draw(); } });
}

/* ---------- تشغيل ---------- */
function initSite(){
  renderAuthArea();
  initSupportFab();
  renderFooter();
  initGlass();
  observeReveal();
  refreshBadges();
  setInterval(() => { if (!document.hidden) refreshBadges(); }, 45000);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}
