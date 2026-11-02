/* ====== واجهة مشتركة للصفحات العامة: الهيدر، الدعم، الرسائل، الفوتر ====== */
const ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
const ICON_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-4 2h-2"/></svg>';

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
      (u.status === "admin" ? '<a class="btn primary" href="admin/dashboard.html">لوحة التحكم</a>' : "") +
      `<button class="icon-btn" id="msgBtn" title="الرسائل" aria-label="الرسائل">${ICON_MAIL}<span class="badge-red" id="msgBadge" hidden></span></button>
       <div class="user-chip"><span class="hide-sm">أهلاً</span> <b>${escapeHtml(u.name)}</b></div>
       <button class="btn" id="logoutBtn">خروج</button>`;
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
  const page = location.pathname.split("/").pop();
  const links = [["privacy.html", "سياسة الخصوصية"], ["terms.html", "شروط الاستخدام"], ["about.html", "عن المتجر"]];
  const f = document.createElement("footer");
  f.className = "site-footer";
  f.innerHTML = `<div class="links">${links.map(([h, t]) => `<a class="btn ${page === h ? "on" : ""}" href="${h}">${t}</a>`).join("")}</div>
                 <p>© ${new Date().getFullYear()} MR store — جميع الحقوق محفوظة</p>`;
  document.body.appendChild(f);
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
  refreshBadges();
  setInterval(() => { if (!document.hidden) refreshBadges(); }, 45000);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}
