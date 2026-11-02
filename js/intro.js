/* شاشة التحميل: كتابة متحركة مع صوت كيبورد */
const INTRO_ONCE = true;   // true = مرة واحدة لكل جلسة متصفح، false = كل مرة تُفتح فيها الصفحة
const INTRO_PHRASES = ["متجر MR store", "الثقة تكتسب", "نحن الأفضل"];

(function runIntro(){
  const el = document.getElementById("intro");
  if (!el) return;
  const txt = document.getElementById("introText");
  if (INTRO_ONCE) { try { sessionStorage.setItem("mr_intro", "1"); } catch {} }
  document.body.style.overflow = "hidden";

  /* ---- الصوت (WebAudio، بدون ملفات) ---- */
  let ctx = null;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  const wake = () => { if (ctx && ctx.state === "suspended") ctx.resume(); };
  ["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, wake, { once: true, passive: true }));
  wake();

  function click(kind){
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.035);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.value = kind === "space" ? 900 : 1700 + Math.random() * 1500; f.Q.value = 1.1;
    const g = ctx.createGain(); g.gain.value = kind === "space" ? 0.6 : kind === "back" ? 0.32 : 0.42;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);

    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(kind === "space" ? 120 : 170 + Math.random() * 70, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.05);
    og.gain.setValueAtTime(0.22, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(og); og.connect(ctx.destination); o.start(t); o.stop(t + 0.08);
  }

  /* ---- الكتابة ---- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  let done = false;

  async function type(s){
    for (const ch of s){
      if (done) return;
      txt.textContent += ch;
      click(ch === " " ? "space" : "key");
      await sleep(rnd(50, 150) + (Math.random() < 0.15 ? rnd(120, 260) : 0)); // سرعة متفاوتة + توقفات
    }
  }
  async function erase(){
    while (txt.textContent.length && !done){
      txt.textContent = txt.textContent.slice(0, -1);
      click("back");
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
  el.addEventListener("click", () => { wake(); finish(); });

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
