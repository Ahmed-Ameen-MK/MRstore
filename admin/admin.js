/* ====== لوحة الأدمن — ملف مستقل بالكامل داخل مجلد admin ====== */
const SUPABASE_URL = "https://cjjybcsrtbcjmnavyyph.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqanliY3NydGJjam1uYXZ5eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MDM4OTMsImV4cCI6MjEwOTE3OTg5M30.o9CxuojKekGe7bVtO5h-Xzs6l7ATza4_IK85scEW228";
const CURRENCY = "درهم إماراتي";
const BUCKET = "products";
const MAX_IMG = 5 * 1024 * 1024;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0d0d0f"/><path d="m20 70 20-24 14 16 10-12 16 20z" fill="#2a2b30"/></svg>');

let me = null;
try { me = JSON.parse(localStorage.getItem("mr_user")); } catch {}
let products = [], users = [];
const views = { products: "list", users: "list" };

function deny(){ location.replace("../404.html"); }

/* استدعاء دالة أدمن: الخادم نفسه يتحقق أن الحساب أدمن في كل استدعاء */
async function admin(fn, args = {}){
  const { data, error } = await sb.rpc(fn, { p_email: me.email, p_hash: me.h, ...args });
  if (error) throw error;
  return data;
}

/* ---------- حارس الدخول ---------- */
(async function boot(){
  if (!me || !me.email || !me.h) return deny();
  try {
    const { data, error } = await sb.rpc("mr_is_admin", { p_email: me.email, p_hash: me.h });
    if (error || data !== true) return deny();
  } catch { return deny(); }
  // ننتظر تحميل بقية ملفات اللوحة (inbox.js / news.js) قبل التشغيل
  if (document.readyState !== "complete") await new Promise(r => addEventListener("load", r, { once: true }));
  document.documentElement.classList.add("ready");
  init();
})();

/* ---------- أدوات واجهة ---------- */
let toastT;
function toast(text, type = "ok"){
  const t = $("#toast"); t.textContent = text; t.className = "show " + type;
  clearTimeout(toastT); toastT = setTimeout(() => t.className = "", 2600);
}
function setMsg(el, text, type){ el.textContent = text || ""; el.className = "msg " + (type || ""); }
function errText(e){
  const m = String(e && e.message || e);
  if (m.includes("forbidden")) return "ليست لديك صلاحية أدمن";
  if (m.includes("self")) return "لا يمكنك تعديل حالة حسابك أنت";
  if (m.toLowerCase().includes("bucket")) return "حاوية الصور غير موجودة، شغّل ملف SQL أولاً";
  return m;
}
function askConfirm(title, text, yes = "تأكيد", danger = false){
  return new Promise(res => {
    $("#cTitle").textContent = title; $("#cText").textContent = text;
    const y = $("#cYes"), n = $("#cNo"), m = $("#confirmModal");
    y.textContent = yes; y.className = "btn " + (danger ? "danger" : "primary");
    m.hidden = false;
    const close = v => { m.hidden = true; y.onclick = n.onclick = null; res(v); };
    y.onclick = () => close(true); n.onclick = () => close(false);
  });
}

/* ---------- التصنيفات (بدون تكرار) ---------- */
function categories(){
  return [...new Set(products.map(p => String(p.category ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ar"));
}
function makeCatPicker(root){
  const sel = root.querySelector("select"), addBtn = root.querySelector(".cat-add"),
        box = root.querySelector(".cat-new"), inp = box.querySelector("input"), ok = box.querySelector("button");
  const extra = new Set();
  function fill(value){
    const all = [...new Set([...categories(), ...extra])];
    sel.innerHTML = '<option value="">اختر التصنيف</option>' + all.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    if (value) sel.value = value;
  }
  function commit(){
    const v = inp.value.trim().replace(/\s+/g, " ");
    if (!v) return;
    extra.add(v); fill(v); inp.value = ""; box.hidden = true;
  }
  addBtn.onclick = () => { box.hidden = !box.hidden; if (!box.hidden) inp.focus(); };
  ok.onclick = commit;
  inp.onkeydown = e => { if (e.key === "Enter"){ e.preventDefault(); commit(); } };
  fill();
  return { get: () => sel.value, set: v => fill(v), refresh: () => fill(sel.value) };
}

/* ---------- رفع الصورة إلى Supabase Storage ---------- */
function checkImage(file){
  if (!file) return "اختر صورة للمنتج";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return "صيغة الصورة غير مدعومة (JPG / PNG / WEBP / GIF)";
  if (file.size > MAX_IMG) return "حجم الصورة أكبر من 5MB";
  return "";
}
async function uploadImage(file){
  const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[file.type] || "jpg";
  const id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
  const path = `${Date.now()}-${id}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ---------- التنقل ---------- */
function showSection(name){
  document.querySelectorAll("[data-sec]").forEach(b => b.classList.toggle("on", b.dataset.sec === name));
  closeDrawer();
  window.scrollTo({ top: 0 });
  ["publish", "products", "users", "inbox", "news", "payments"].forEach(s => $("#sec-" + s).hidden = s !== name);
  if (name === "users") loadUsers();
  if (name === "products") renderProducts();
  if (name === "inbox") loadInbox();
  if (name === "news") loadNewsAdmin();
  if (name === "payments") loadPayments();
}

function closeDrawer(){ $("#nav").classList.remove("open"); $("#navOverlay").classList.remove("show"); }

/* ---------- المنتجات ---------- */
async function loadProducts(){
  const { data, error } = await sb.from("store").select("*").order("id", { ascending: false });
  if (error) { toast("تعذر تحميل المنتجات: " + error.message, "err"); return; }
  products = data || [];
  renderProducts();
  pubCat.refresh();
}

function renderProducts(){
  $("#prodCount").textContent = products.length + " منتج";
  const box = $("#prodList");
  box.className = "items" + (views.products === "grid" ? " grid" : "");
  if (!products.length){ box.innerHTML = '<div class="empty">لا توجد منتجات بعد</div>'; return; }
  box.innerHTML = products.map(p => `
    <article class="item">
      <img class="pic" loading="lazy" src="${esc(p.avatar_url || PLACEHOLDER)}" alt="" onerror="this.src='${PLACEHOLDER}'">
      <div class="meta">
        <h4 title="${esc(p.title)}">${esc(p.title)}</h4>
        <div class="desc">${esc(p.description)}</div>
        <div class="tags"><span class="tag">${esc(p.category || "غير مصنف")}</span><span class="price">${esc(p.price)} ${CURRENCY}</span></div>
      </div>
      <div class="acts">
        <button class="btn sm" data-edit="${p.id}">تعديل</button>
        <button class="btn sm danger" data-del="${p.id}">حذف</button>
      </div>
    </article>`).join("");
}

$("#prodList").addEventListener("click", async e => {
  const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
  if (ed) openEdit(products.find(p => String(p.id) === ed.dataset.edit));
  if (del){
    const p = products.find(x => String(x.id) === del.dataset.del);
    if (!p) return;
    if (!await askConfirm("حذف المنتج", `هل تريد حذف "${p.title}" نهائياً؟`, "حذف", true)) return;
    try {
      await admin("admin_delete_product", { p_id: p.id });
      products = products.filter(x => x.id !== p.id);
      renderProducts(); pubCat.refresh(); toast("تم حذف المنتج");
    } catch (err) { toast(errText(err), "err"); }
  }
});

/* ---------- النشر ---------- */
const pubCat = makeCatPicker($("#pCat"));
$("#pFile").addEventListener("change", e => {
  const f = e.target.files[0], drop = $("#pDrop");
  drop.querySelector("img")?.remove();
  if (!f) return;
  const img = document.createElement("img"); img.src = URL.createObjectURL(f); drop.appendChild(img);
});

$("#pubForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#pMsg"), go = $("#pGo");
  const title = $("#pTitle").value.trim(), desc = $("#pDesc").value.trim(),
        priceRaw = $("#pPrice").value.trim(), cat = pubCat.get().trim(), file = $("#pFile").files[0];
  const price = Number(priceRaw);
  if (!title) return setMsg(msg, "اكتب اسم المنتج", "err");
  if (priceRaw === "" || !Number.isInteger(price) || price < 0) return setMsg(msg, "السعر يجب أن يكون رقماً صحيحاً", "err");
  if (!cat) return setMsg(msg, "اختر التصنيف أو أضف تصنيفاً جديداً", "err");
  if (!desc) return setMsg(msg, "اكتب وصف المنتج", "err");
  const ie = checkImage(file); if (ie) return setMsg(msg, ie, "err");

  go.disabled = true; setMsg(msg, "جاري رفع الصورة...");
  try {
    const url = await uploadImage(file);
    setMsg(msg, "جاري نشر المنتج...");
    const row = await admin("admin_add_product", { p_title: title, p_price: price, p_description: desc, p_avatar_url: url, p_category: cat });
    products.unshift(row);
    pubCat.refresh();
    e.target.reset(); $("#pDrop").querySelector("img")?.remove(); pubCat.set("");
    setMsg(msg, "تم نشر المنتج بنجاح ✓", "ok"); toast("تم نشر المنتج");
  } catch (err) { setMsg(msg, "فشل النشر: " + errText(err), "err"); }
  go.disabled = false;
});

/* ---------- تعديل منتج ---------- */
const editCat = makeCatPicker($("#eCat"));
let editing = null;
function openEdit(p){
  if (!p) return;
  editing = p;
  $("#eImg").src = p.avatar_url || PLACEHOLDER;
  $("#eFile").value = "";
  $("#eTitle").value = p.title ?? "";
  $("#ePrice").value = p.price ?? 0;
  $("#eDesc").value = p.description ?? "";
  editCat.set(String(p.category ?? "").trim());
  setMsg($("#eMsg"), "");
  $("#editModal").hidden = false;
}
$("#eCancel").onclick = () => { $("#editModal").hidden = true; editing = null; };
$("#editModal").addEventListener("mousedown", e => { if (e.target.id === "editModal") $("#eCancel").click(); });
$("#eFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) $("#eImg").src = URL.createObjectURL(f); });

$("#editForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!editing) return;
  const msg = $("#eMsg"), go = $("#eGo");
  const title = $("#eTitle").value.trim(), desc = $("#eDesc").value.trim(),
        price = Number($("#ePrice").value), cat = editCat.get().trim(), file = $("#eFile").files[0];
  if (!title) return setMsg(msg, "اكتب اسم المنتج", "err");
  if ($("#ePrice").value.trim() === "" || !Number.isInteger(price) || price < 0) return setMsg(msg, "السعر يجب أن يكون رقماً صحيحاً", "err");
  if (!cat) return setMsg(msg, "اختر التصنيف", "err");
  if (file){ const ie = checkImage(file); if (ie) return setMsg(msg, ie, "err"); }

  go.disabled = true; setMsg(msg, "جاري الحفظ...");
  try {
    const url = file ? await uploadImage(file) : (editing.avatar_url || "");
    const row = await admin("admin_update_product", {
      p_id: editing.id, p_title: title, p_price: price, p_description: desc, p_avatar_url: url, p_category: cat
    });
    products = products.map(p => p.id === editing.id ? row : p);
    renderProducts(); pubCat.refresh();
    $("#editModal").hidden = true; editing = null; toast("تم حفظ التعديلات");
  } catch (err) { setMsg(msg, "فشل الحفظ: " + errText(err), "err"); }
  go.disabled = false;
});

/* ---------- الأعضاء ---------- */
async function loadUsers(){
  try {
    users = await admin("admin_list_users") || [];
    renderUsers();
  } catch (err) { toast("تعذر تحميل الأعضاء: " + errText(err), "err"); }
}

const STATUS_LABEL = { user: "عضو", admin: "أدمن", blocked: "محظور" };

function renderUsers(){
  const admins = users.filter(u => u.status === "admin").length,
        blocked = users.filter(u => u.status === "blocked").length;
  $("#userCount").innerHTML =
    `<span class="chip">عدد الأعضاء: <b>${users.length}</b></span>` +
    `<span class="chip">أدمن: <b>${admins}</b></span><span class="chip">محظور: <b>${blocked}</b></span>`;
  const box = $("#userList");
  box.className = "items" + (views.users === "grid" ? " grid" : "");
  if (!users.length){ box.innerHTML = '<div class="empty">لا يوجد أعضاء</div>'; return; }
  box.innerHTML = users.map(u => {
    const st = STATUS_LABEL[u.status] ? u.status : "user";
    const isMe = u.id === me.id;
    let acts = "";
    if (isMe) acts = '<span class="tag">حسابك</span>';
    else if (st === "blocked") acts = `<button class="btn sm ok" data-act="user" data-id="${u.id}">رفع الحظر</button>`;
    else if (st === "admin") acts = `<button class="btn sm" data-act="user" data-id="${u.id}">إلغاء الأدمن</button><button class="btn sm danger" data-act="blocked" data-id="${u.id}">حظر</button>`;
    else acts = `<button class="btn sm primary" data-act="admin" data-id="${u.id}">ترقية إلى أدمن</button><button class="btn sm danger" data-act="blocked" data-id="${u.id}">حظر</button>`;
    return `
    <article class="item">
      <div class="avatar">${esc(String(u.name || "?").trim().charAt(0).toUpperCase())}</div>
      <div class="meta">
        <h4>${esc(u.name)}</h4>
        <div class="email">${esc(u.email)}</div>
        <div class="tags"><span class="st ${st}">${STATUS_LABEL[st]}</span><span class="tag">${esc(u.country || "—")}</span></div>
      </div>
      <div class="acts">${acts}</div>
    </article>`;
  }).join("");
}

const ACT_TEXT = {
  admin:   ["ترقية إلى أدمن", "سيحصل هذا العضو على صلاحيات كاملة في لوحة التحكم. متأكد؟", "ترقية", false],
  blocked: ["حظر العضو", "لن يتمكن هذا العضو من تسجيل الدخول. متأكد؟", "حظر", true],
  user:    ["تغيير الحالة", "سيصبح هذا الحساب عضواً عادياً. متأكد؟", "تأكيد", false]
};

$("#userList").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const u = users.find(x => String(x.id) === b.dataset.id), status = b.dataset.act;
  if (!u) return;
  let [title, text, yes, danger] = ACT_TEXT[status];
  if (status === "user" && u.status === "blocked"){ title = "رفع الحظر"; text = `سيتمكن "${u.name}" من تسجيل الدخول مجدداً.`; yes = "رفع الحظر"; }
  if (status === "user" && u.status === "admin"){ title = "إلغاء الأدمن"; text = `سيفقد "${u.name}" صلاحيات الأدمن.`; yes = "إلغاء الأدمن"; }
  if (!await askConfirm(title, text, yes, danger)) return;
  try {
    await admin("admin_set_status", { p_id: u.id, p_status: status });
    u.status = status; renderUsers(); toast("تم تحديث حالة العضو");
  } catch (err) { toast(errText(err), "err"); }
});

/* ---------- تبديل طريقة العرض ---------- */
document.querySelectorAll(".toggle").forEach(t => t.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const which = t.dataset.for;
  views[which] = b.dataset.v;
  t.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  which === "products" ? renderProducts() : renderUsers();
}));

/* ---------- تشغيل ---------- */
function init(){
  $("#who").textContent = "مرحباً، " + me.name;
  $("#logout").onclick = () => { localStorage.removeItem("mr_user"); location.replace("../index.html"); };
  const go = e => { const b = e.target.closest("[data-sec]"); if (b) showSection(b.dataset.sec); };
  $("#nav").addEventListener("click", go);
  // بار سفلي للموبايل: أيقونات الأقسام فقط
  const bn = $("#bnav");
  [...$("#nav").querySelectorAll("[data-sec]")].forEach(b => {
    const c = document.createElement("button");
    c.dataset.sec = b.dataset.sec; c.setAttribute("aria-label", b.textContent.trim());
    if (b.classList.contains("on")) c.classList.add("on");
    c.innerHTML = b.querySelector("svg").outerHTML + (b.dataset.sec === "inbox" ? '<span class="nb" id="inboxBadgeM" hidden></span>' : b.dataset.sec === "payments" ? '<span class="nb" id="payBadgeM" hidden></span>' : "");
    bn.appendChild(c);
  });
  bn.addEventListener("click", go);
  // زر ☰: قائمة جانبية بالأقسام مع أسمائها
  $("#menuToggle").onclick = () => { $("#nav").classList.add("open"); $("#navOverlay").classList.add("show"); };
  $("#navOverlay").onclick = closeDrawer;
  loadProducts();
  loadInbox(true);
  loadPayments(true);
  setInterval(() => { if (!document.hidden) loadInbox(!$("#sec-inbox") || $("#sec-inbox").hidden); }, 60000);
}
