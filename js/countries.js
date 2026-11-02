/* قائمة الدول: 22 دولة عربية أولاً ثم دول العالم (مرتبة أبجدياً) */
const ARAB_CODES = ["DZ","BH","KM","DJ","EG","IQ","JO","KW","LB","LY","MR","MA","OM","PS","QA","SA","SO","SD","SY","TN","AE","YE"];

const WORLD_CODES = ("AF AL AD AO AG AR AM AU AT AZ BS BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO CG CD CR CI HR CU CY CZ DK DM DO EC SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IE IL IT JM JP KZ KE KI KP KR XK LA LV LS LR LI LT LU MG MW MY MV ML MT MH MU MX FM MD MC MN ME MZ MM NA NR NP NL NZ NI NE NG MK NO PK PW PA PG PY PE PH PL PT RO RU RW KN LC VC WS SM ST SN RS SC SL SG SK SI SB ZA SS ES LK SR SE CH TW TJ TZ TH TL TG TO TT TR TM TV UG UA GB US UY UZ VU VA VE VN ZW").split(" ");

const COUNTRY_NAME_OVERRIDES = { IL: "الكيان الصهيوني" };

const _dn = (typeof Intl !== "undefined" && Intl.DisplayNames) ? new Intl.DisplayNames(["ar"], { type: "region" }) : null;

function countryName(code){
  if (COUNTRY_NAME_OVERRIDES[code]) return COUNTRY_NAME_OVERRIDES[code];
  try { return _dn ? _dn.of(code) : code; } catch { return code; }
}

function buildCountryLists(){
  const arab = ARAB_CODES.map(c => ({ code: c, name: countryName(c) })).sort((a,b)=>a.name.localeCompare(b.name,"ar"));
  const world = WORLD_CODES.map(c => ({ code: c, name: countryName(c) }))
    .filter(x => x.name && x.name !== x.code)
    .sort((a,b)=>a.name.localeCompare(b.name,"ar"));
  return { arab, world };
}

/* تحديد الدولة تلقائياً من الـ IP */
async function detectCountryCode(){
  const tries = [
    async () => (await (await fetch("https://ipapi.co/json/")).json()).country_code,
    async () => (await (await fetch("https://ipwho.is/")).json()).country_code,
    async () => (await (await fetch("https://api.country.is/")).json()).country
  ];
  for (const t of tries){
    try { const c = await t(); if (c) return String(c).toUpperCase(); } catch {}
  }
  return null;
}
