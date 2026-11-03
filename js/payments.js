/* ====== قسم عمليات الدفع في لوحة الأدمن (يعتمد على admin.js) ====== */
let payRows = [];
let payCurrent = null;

const PAY_LABEL = { none: "بانتظار المراجعة", green: "تم التحقق", red: "لم يكتمل" };
const PAY_DOT = { none: "", green: "g", red: "r" };
const fmtPay = iso => { try { return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };
const payStatus = r => PAY_LABEL[r.status] ? r.status : "none";

async function loadPayments(silent){
  try {
    payRows = await admin("admin_payments_list") || [];   // الأحدث أولاً
    updatePayBadge();
    if (!silent || !$("#sec-payments").hidden) renderPayments();
  } catch (err) { if (!silent) toast("تعذر تحميل عمليات الدفع: " + errText(err), "err"); }
}

function updatePayBadge(){
  const n = payRows.filter(r => payStatus(r) === "none").length;
  ["#payBadge", "#payBadgeM"].forEach(id => { const b = $(id); if (b){ b.textContent = n > 99 ? "99+" : n; b.hidden = n === 0; } });
}

function renderPayments(){
  const n = payRows.filter(r => payStatus(r) === "none").length;
  $("#payCount").textContent = payRows.length + " عملية" + (n ? " — " + n + " بانتظار المراجعة" : "");
  const box = $("#payList");
  if (!payRows.length){ box.innerHTML = '<div class="empty">لا توجد عمليات دفع بعد</div>'; return; }
  box.innerHTML = payRows.map(r => {
    const st = payStatus(r);
    return `<article class="item pay ${st}" data-pid="${r.id}" tabindex="0">
      <span class="dot ${PAY_DOT[st]}"></span>
      <div class="meta">
        <h4 title="${esc(r.product)}">${esc(r.product)}</h4>
        <div class="desc" style="-webkit-line-clamp:1">المشتري: ${esc(r.buyer)}</div>
        <div class="tags"><span class="tag">#${esc(r.id)}</span><span class="tag">${fmtPay(r.created_at)}</span><span class="st ${st}">${PAY_LABEL[st]}</span></div>
      </div>
      <div class="acts"><button class="btn sm ${st === "none" ? "primary" : ""}">${st === "none" ? "فتح" : "تعديل الحالة"}</button></div>
    </article>`;
  }).join("");
}

function openPay(id){
  const r = payRows.find(x => String(x.id) === String(id));
  if (!r) return;
  payCurrent = r;
  $("#pmInfo").innerHTML = `المنتج: <b style="color:#fff">${esc(r.product)}</b><br>المشتري: <b style="color:#fff">${esc(r.buyer)}</b>`;
  $("#payModal").hidden = false;
}
function closePay(){ $("#payModal").hidden = true; payCurrent = null; }

async function savePay(status){
  if (!payCurrent) return;
  const btns = [$("#pmGreen"), $("#pmRed")];
  btns.forEach(b => b.disabled = true);
  try {
    const row = await admin("admin_payment_set_status", { p_id: payCurrent.id, p_status: status });
    payRows = payRows.map(x => x.id === payCurrent.id ? row : x);
    updatePayBadge(); renderPayments(); closePay();
    toast(status === "green" ? "تم تسجيل: تم التحقق" : "تم تسجيل: لم يكتمل");
  } catch (err) { toast(errText(err), "err"); }
  btns.forEach(b => b.disabled = false);
}

$("#payList").addEventListener("click", e => { const el = e.target.closest(".pay"); if (el) openPay(el.dataset.pid); });
$("#payList").addEventListener("keydown", e => { if (e.key === "Enter"){ const el = e.target.closest(".pay"); if (el) openPay(el.dataset.pid); } });
$("#pmGreen").onclick = () => savePay("green");
$("#pmRed").onclick = () => savePay("red");
$("#pmClose").onclick = closePay;
$("#payModal").addEventListener("mousedown", e => { if (e.target.id === "payModal") closePay(); });

setInterval(() => { if (!document.hidden && me) loadPayments(true); }, 60000);
