/* ====== قسم الأخبار في لوحة الأدمن (يعتمد على admin.js) ====== */
let newsRows = [];
let newsEditing = null;   // null = إضافة، غير ذلك = تعديل

const fmtN = iso => { try { return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };

async function loadNewsAdmin(){
  const { data, error } = await sb.from("news").select("*").order("created_at", { ascending: false });
  if (error){ toast("تعذر تحميل الأخبار: " + error.message, "err"); return; }
  newsRows = data || [];
  renderNewsAdmin();
}

function renderNewsAdmin(){
  $("#newsCount").textContent = newsRows.length + " خبر";
  const box = $("#newsList");
  if (!newsRows.length){ box.innerHTML = '<div class="empty">لا توجد أخبار بعد</div>'; return; }
  box.innerHTML = newsRows.map(n => `
    <article class="item">
      <div class="avatar" style="font-size:1.1rem">🔔</div>
      <div class="meta">
        <div class="desc" style="-webkit-line-clamp:3;color:var(--text);font-size:.95rem">${esc(n.content)}</div>
        <div class="tags"><span class="tag">${fmtN(n.created_at)}</span></div>
      </div>
      <div class="acts">
        <button class="btn sm" data-nedit="${n.id}">تعديل</button>
        <button class="btn sm danger" data-ndel="${n.id}">حذف</button>
      </div>
    </article>`).join("");
}

function openNews(n){
  newsEditing = n || null;
  $("#nTitle").textContent = n ? "تعديل الخبر" : "إضافة خبر جديد";
  $("#nTxt").value = n ? n.content : "";
  setMsg($("#nMsg"), "");
  $("#newsModal").hidden = false;
  $("#nTxt").focus();
}
$("#newsAdd").onclick = () => openNews(null);
$("#nCancel").onclick = () => { $("#newsModal").hidden = true; newsEditing = null; };
$("#newsModal").addEventListener("mousedown", e => { if (e.target.id === "newsModal") $("#nCancel").click(); });

$("#newsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const v = $("#nTxt").value.trim(), btn = $("#nGo");
  if (!v) return setMsg($("#nMsg"), "اكتب نص الخبر", "err");
  btn.disabled = true; setMsg($("#nMsg"), "جاري الحفظ...");
  try {
    if (newsEditing){
      const row = await admin("admin_news_update", { p_id: newsEditing.id, p_content: v });
      newsRows = newsRows.map(x => x.id === newsEditing.id ? row : x);
    } else {
      const row = await admin("admin_news_add", { p_content: v });
      newsRows.unshift(row);
    }
    renderNewsAdmin(); $("#newsModal").hidden = true; newsEditing = null;
    toast("تم حفظ الخبر");
  } catch (err) { setMsg($("#nMsg"), "فشل الحفظ: " + errText(err), "err"); }
  btn.disabled = false;
});

$("#newsList").addEventListener("click", async e => {
  const ed = e.target.closest("[data-nedit]"), del = e.target.closest("[data-ndel]");
  if (ed) openNews(newsRows.find(x => String(x.id) === ed.dataset.nedit));
  if (del){
    const n = newsRows.find(x => String(x.id) === del.dataset.ndel);
    if (!n || !await askConfirm("حذف الخبر", "هل تريد حذف هذا الخبر نهائياً؟", "حذف", true)) return;
    try {
      await admin("admin_news_delete", { p_id: n.id });
      newsRows = newsRows.filter(x => x.id !== n.id); renderNewsAdmin(); toast("تم حذف الخبر");
    } catch (err) { toast(errText(err), "err"); }
  }
});
