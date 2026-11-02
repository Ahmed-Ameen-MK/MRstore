/* ====== قسم الرسائل في لوحة الأدمن (يعتمد على admin.js) ====== */
let inboxRows = [];
let inboxTab = "message";   // message | support | rating

const fmtT = iso => { try { return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };
const ticks = seen => seen === "done"
  ? '<span class="ticks done"><b>✓✓</b>تم قراءتها</span>'
  : '<span class="ticks none"><b>✓✓</b>لم تقرأ بعد</span>';
const splitTo = s => String(s || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
const isIncoming = r => r.to === "admin" && r.from !== "admin";

async function loadInbox(silent){
  try {
    inboxRows = await admin("admin_contact_list") || [];
    updateInboxBadge();
    if (!silent) renderInbox();
  } catch (err) { if (!silent) toast("تعذر تحميل الرسائل: " + errText(err), "err"); }
}
function unreadIncoming(type){ return inboxRows.filter(r => isIncoming(r) && r.type === type && r.seen !== "done"); }
function updateInboxBadge(){
  const n = unreadIncoming("message").length + unreadIncoming("support").length;
  const b = $("#inboxBadge"); b.textContent = n > 99 ? "99+" : n; b.hidden = n === 0;
  [["message", "tabMsgN"], ["support", "tabSupN"]].forEach(([t, id]) => {
    const c = unreadIncoming(t).length, el = $("#" + id);
    el.textContent = c; el.hidden = c === 0;
  });
}

/* ---------- التبويبات ---------- */
function renderInbox(){
  document.querySelectorAll("#inboxTabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === inboxTab));
  $("#inboxNew").hidden = inboxTab === "rating";
  const box = $("#inboxBody");
  if (inboxTab === "rating") box.innerHTML = ratingsHtml();
  else renderThreads(box, inboxTab);
}
$("#inboxTabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  inboxTab = b.dataset.tab; renderInbox();
});
$("#inboxNew").onclick = () => openCompose(inboxTab);

/* ---------- المحادثات (الرسائل / الدعم) ---------- */
function threadsOf(type){
  const map = new Map();
  inboxRows.filter(r => r.type === type).forEach(r => {
    const emails = isIncoming(r) ? [String(r.from).toLowerCase()] : splitTo(r.to);
    emails.forEach(e => { if (!map.has(e)) map.set(e, []); map.get(e).push(r); });
  });
  return [...map.entries()].map(([email, rows]) => {
    rows.sort((a, b) => a.id - b.id);
    return { email, rows, last: rows[rows.length - 1], unread: rows.filter(r => isIncoming(r) && r.seen !== "done").length };
  }).sort((a, b) => (b.unread > 0) - (a.unread > 0) || b.last.id - a.last.id);
}
function userName(email){ const u = users.find(x => String(x.email).toLowerCase() === email); return u ? u.name : ""; }

function renderThreads(box, type){
  const th = threadsOf(type);
  if (!th.length){ box.innerHTML = `<div class="empty">${type === "support" ? "لا توجد رسائل دعم" : "لا توجد رسائل"}</div>`; return; }
  box.innerHTML = `<div class="items">${th.map(t => {
    const nm = userName(t.email);
    return `<article class="item thread ${t.unread ? "unread" : "read"}" data-email="${esc(t.email)}" tabindex="0">
      <span class="dot ${t.unread ? "" : "off"}"></span>
      <div class="meta">
        <h4>${esc(nm || t.email)} <span class="email-s">${nm ? esc(t.email) : ""}</span></h4>
        <div class="desc">${t.last.from === "admin" ? "أنت: " : ""}${esc(t.last.content)}</div>
        <div class="tags">
          <span class="tag">${fmtT(t.last.created_at)}</span>
          ${t.unread ? `<span class="st admin">${t.unread} غير مقروءة</span>` : ""}
          ${t.last.from === "admin" ? ticks(t.last.seen) : ""}
        </div>
      </div>
      <div class="acts"><button class="btn sm ${t.unread ? "primary" : ""}">${t.unread ? "فتح والرد" : "فتح"}</button></div>
    </article>`; }).join("")}</div>`;
}
$("#inboxBody").addEventListener("click", e => {
  const el = e.target.closest(".thread"); if (el) openThread(inboxTab, el.dataset.email);
});

/* ---------- نافذة المحادثة والرد ---------- */
let curThread = null;
function openThread(type, email){
  curThread = { type, email };
  const nm = userName(email);
  $("#thTitle").textContent = (type === "support" ? "دعم: " : "رسائل: ") + (nm || email);
  $("#thSub").textContent = nm ? email : "";
  $("#thTxt").value = ""; setMsg($("#thMsg"), "");
  $("#threadModal").hidden = false;
  drawThread();
  const ids = inboxRows.filter(r => isIncoming(r) && r.type === type && String(r.from).toLowerCase() === email && r.seen !== "done").map(r => r.id);
  if (ids.length) admin("admin_contact_mark_read", { p_ids: ids }).then(() => {
    inboxRows.forEach(r => { if (ids.includes(r.id)) r.seen = "done"; });
    updateInboxBadge(); renderInbox();
  }).catch(() => {});
}
function drawThread(){
  const { type, email } = curThread;
  const rows = inboxRows.filter(r => r.type === type && (isIncoming(r) ? String(r.from).toLowerCase() === email : splitTo(r.to).includes(email))).sort((a, b) => a.id - b.id);
  const box = $("#thBody");
  box.innerHTML = rows.map(r => isIncoming(r)
    ? `<div class="bub user">${esc(r.content)}<small>${fmtT(r.created_at)}</small></div>`
    : `<div class="bub adm">${esc(r.content)}<small>${fmtT(r.created_at)} ${ticks(r.seen)}${splitTo(r.to).length > 1 ? ` <span class="tag">إلى ${splitTo(r.to).length} أعضاء</span>` : ""}</small></div>`
  ).join("") || '<div class="empty">لا توجد رسائل</div>';
  box.scrollTop = box.scrollHeight;
}
$("#thClose").onclick = () => { $("#threadModal").hidden = true; curThread = null; };
$("#threadModal").addEventListener("mousedown", e => { if (e.target.id === "threadModal") $("#thClose").click(); });

async function sendReply(){
  const v = $("#thTxt").value.trim(); if (!v || !curThread) return;
  const btn = $("#thSend"); btn.disabled = true; setMsg($("#thMsg"), "جاري الإرسال...");
  try {
    const row = await admin("admin_contact_send", { p_to: curThread.email, p_type: curThread.type, p_content: v });
    inboxRows.unshift(row); $("#thTxt").value = ""; setMsg($("#thMsg"), "");
    drawThread(); renderInbox();
  } catch (err) { setMsg($("#thMsg"), "تعذر الإرسال: " + errText(err), "err"); }
  btn.disabled = false;
}
$("#thSend").onclick = sendReply;
$("#thTxt").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); });

/* ---------- إرسال رسالة جديدة (اختيار مستخدمين) ---------- */
let picked = new Set();
async function openCompose(type){
  if (!users.length){ try { users = await admin("admin_list_users") || []; } catch (err) { return toast(errText(err), "err"); } }
  picked = new Set();
  $("#cpTitle").textContent = type === "support" ? "رسالة دعم جديدة" : "إرسال رسالة";
  $("#cpType").value = type;
  $("#cpTxt").value = ""; $("#cpSearch").value = ""; setMsg($("#cpMsg"), "");
  drawPicker(); $("#composeModal").hidden = false;
}
function drawPicker(){
  const q = $("#cpSearch").value.trim().toLowerCase();
  const list = users.filter(u => !q || String(u.name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q));
  $("#cpList").innerHTML = list.map(u => {
    const em = String(u.email).toLowerCase(), blocked = u.status === "blocked";
    return `<label class="pick ${picked.has(em) ? "on" : ""}">
      <input type="checkbox" value="${esc(em)}" ${picked.has(em) ? "checked" : ""}>
      <span class="box-c">✓</span>
      <span class="pn">${esc(u.name)}${blocked ? ' <span class="st blocked">محظور</span>' : ""}<small>${esc(u.email)}</small></span>
    </label>`; }).join("") || '<div class="empty">لا يوجد أعضاء</div>';
  $("#cpCount").textContent = "المحدد: " + picked.size;
}
$("#cpList").addEventListener("change", e => {
  if (e.target.type !== "checkbox") return;
  e.target.checked ? picked.add(e.target.value) : picked.delete(e.target.value);
  e.target.closest(".pick").classList.toggle("on", e.target.checked);
  $("#cpCount").textContent = "المحدد: " + picked.size;
});
$("#cpSearch").addEventListener("input", drawPicker);
$("#cpAll").onclick = () => {
  const vis = [...$("#cpList").querySelectorAll("input")].map(i => i.value);
  const all = vis.length && vis.every(v => picked.has(v));
  vis.forEach(v => all ? picked.delete(v) : picked.add(v)); drawPicker();
};
$("#cpClose").onclick = () => $("#composeModal").hidden = true;
$("#composeModal").addEventListener("mousedown", e => { if (e.target.id === "composeModal") $("#cpClose").click(); });
$("#cpSend").onclick = async () => {
  const v = $("#cpTxt").value.trim(), to = [...picked];
  if (!to.length) return setMsg($("#cpMsg"), "اختر عضواً واحداً على الأقل", "err");
  if (!v) return setMsg($("#cpMsg"), "اكتب محتوى الرسالة", "err");
  const btn = $("#cpSend"); btn.disabled = true; setMsg($("#cpMsg"), "جاري الإرسال...");
  try {
    const row = await admin("admin_contact_send", { p_to: to.join(","), p_type: $("#cpType").value, p_content: v });
    inboxRows.unshift(row); $("#composeModal").hidden = true; renderInbox(); toast("تم إرسال الرسالة إلى " + to.length + " عضو");
  } catch (err) { setMsg($("#cpMsg"), "تعذر الإرسال: " + errText(err), "err"); }
  btn.disabled = false;
};

/* ---------- التقييمات ---------- */
function starsStr(n){ n = Math.max(0, Math.min(5, Math.round(n))); return "★".repeat(n) + '<span class="off">' + "★".repeat(5 - n) + "</span>"; }
function ratingsHtml(){
  const rows = inboxRows.filter(r => r.type === "rating" && isIncoming(r)).map(r => ({ ...r, n: Number(r.content) })).filter(r => r.n >= 1 && r.n <= 5);
  if (!rows.length) return '<div class="empty">لا توجد تقييمات بعد</div>';
  const avg = rows.reduce((s, r) => s + r.n, 0) / rows.length;
  const dist = [5, 4, 3, 2, 1].map(k => ({ k, c: rows.filter(r => r.n === k).length }));
  return `
  <div class="rate-sum">
    <div class="rate-avg"><b>${avg.toFixed(1)}</b><div class="stars-s">${starsStr(avg)}</div><small>متوسط ${rows.length} تقييم</small></div>
    <div class="rate-dist">${dist.map(d => `<div class="rd"><span>${d.k} ★</span><div class="bar"><i style="width:${(d.c / rows.length * 100).toFixed(0)}%"></i></div><em>${d.c}</em></div>`).join("")}</div>
  </div>
  <div class="items">${rows.map(r => `
    <article class="item">
      <div class="avatar">${esc(String(userName(String(r.from).toLowerCase()) || r.from).trim().charAt(0).toUpperCase())}</div>
      <div class="meta"><h4>${esc(userName(String(r.from).toLowerCase()) || r.from)}</h4>
        <div class="email">${esc(r.from)}</div><div class="tags"><span class="tag">${fmtT(r.created_at)}</span></div></div>
      <div class="stars-s big">${starsStr(r.n)}</div>
    </article>`).join("")}</div>`;
}
