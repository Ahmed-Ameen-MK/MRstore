/* ====== إعدادات Supabase ====== */
const SUPABASE_URL = "https://cjjybcsrtbcjmnavyyph.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqanliY3NydGJjam1uYXZ5eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MDM4OTMsImV4cCI6MjEwOTE3OTg5M30.o9CxuojKekGe7bVtO5h-Xzs6l7ATza4_IK85scEW228";
const CURRENCY = "$"; // غيّر العملة من هنا

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ====== تطبيع النص للبحث ======
   - يتجاهل المسافات
   - لا فرق بين أ إ آ ا
   - لا فرق بين ى ي  و ة ه
   - لا فرق بين الأحرف الكبيرة والصغيرة
   - يتجاهل التشكيل والتطويل، ويوحّد الأرقام العربية */
function norm(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[\s\u200b-\u200f\u00a0]+/g, "");
}

/* ====== تشفير كلمة المرور (SHA-256) ====== */
async function sha256(text){
  if (!window.crypto || !crypto.subtle) throw new Error("يلزم فتح الموقع عبر HTTPS لتشفير كلمة المرور");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ====== الجلسة ====== */
function getUser(){ try { return JSON.parse(localStorage.getItem("mr_user")); } catch { return null; } }
function setUser(u){ localStorage.setItem("mr_user", JSON.stringify(u)); }
function logout(){ localStorage.removeItem("mr_user"); location.reload(); }

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function escapeLike(s){ return String(s).replace(/[\\%_]/g, "\\$&"); }
function showMsg(el, text, type){ el.textContent = text || ""; el.className = "msg " + (type || ""); }
