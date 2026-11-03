/* شاشة التحميل: كتابة متحركة (بدون صوت). التخطي من زر "تخطي" فقط */
const INTRO_ONCE = true;   // true = مرة واحدة لكل جلسة متصفح، false = كل مرة تُفتح فيها الصفحة
const INTRO_PHRASES = ["متجر MR store", "الثقة تكتسب", "نحن الأفضل"];

(function runIntro(){
  const el = document.getElementById("intro");
  if (!el) return;
  // نفس الجلسة: الشاشة مخفية بالـCSS، فلا نشغّل الأنيميشن ولا نقفل السكرول
  if (document.documentElement.classList.contains("no-intro")){ el.remove(); return; }
  const txt = document.getElementById("introText");
  if (INTRO_ONCE) { try { sessionStorage.setItem("mr_intro", "1"); } catch {} }
  document.body.style.overflow = "hidden";

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  let done = false;

  async function type(s){
    for (const ch of s){
      if (done) return;
      txt.textContent += ch;
      await sleep(rnd(50, 150) + (Math.random() < 0.15 ? rnd(120, 260) : 0)); // سرعة متفاوتة + توقفات
    }
  }
  async function erase(){
    while (txt.textContent.length && !done){
      txt.textContent = txt.textContent.slice(0, -1);
      await sleep(rnd(22, 55));
    }
  }
  function finish(){
    if (done) return;
    done = true;
    el.classList.add("hide");
    document.body.style.overflow = "";
    setTimeout(() => el.remove(), 700);
  }
  document.getElementById("introSkip").addEventListener("click", finish);

  (async () => {
    await sleep(500);
    for (let i = 0; i < INTRO_PHRASES.length; i++){
      await type(INTRO_PHRASES[i]);
      if (done) return;
      if (i < INTRO_PHRASES.length - 1){ await sleep(rnd(450, 750)); await erase(); await sleep(rnd(180, 320)); }
    }
    await sleep(900);
    finish();
  })();
})();
