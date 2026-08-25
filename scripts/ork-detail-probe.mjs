// Discovery probe (Path B), round 3: the detail call is Event/GetEventDetails
// (plural), per jsork — request[EventId]=<id>&request[Current]=true. Dump its
// response in full so we can map end date / description / location / fee fields.
//
// Runs in CI with the x-nb-build header. Reads only; delete after we wire it in.

const BASE = 'https://ork.amtgard.com/orkservice/Json/index.php';
const E = process.env.EVENT_ID || '18686';   // Brawl-o-ween (spans Oct 17–18)
const KEY = process.env.ORK_BUILD_KEY || '';

const ATTEMPTS = [
  { label: 'EventId + Current=true (jsork)', qs: `request=&request%5BEventId%5D=${E}&request%5BCurrent%5D=true` },
  { label: 'EventId only',                   qs: `request=&request%5BEventId%5D=${E}` },
];

function isChallenge(body, ct) {
  return /just a moment|challenge-platform|cf[-_]mitigated/i.test(body) || (ct || '').includes('text/html');
}

function outline(obj, prefix = '') {
  if (Array.isArray(obj)) {
    console.log(`${prefix}[array length ${obj.length}]`);
    if (obj.length) outline(obj[0], prefix + '  ');
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const t = Array.isArray(v) ? `array[${v.length}]` : v === null ? 'null' : typeof v;
      const preview = (t === 'string' || t === 'number' || t === 'boolean')
        ? ` = ${JSON.stringify(v)}`.slice(0, 100) : '';
      console.log(`${prefix}${k}: ${t}${preview}`);
      if (v && typeof v === 'object') outline(v, prefix + '  ');
    }
  }
}

for (const a of ATTEMPTS) {
  console.log(`\n========== Event/GetEventDetails — ${a.label} ==========`);
  const url = `${BASE}?call=Event%2FGetEventDetails&${a.qs}`;
  try {
    const res = await fetch(url, { headers: { 'x-nb-build': KEY }, signal: AbortSignal.timeout(15000) });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (isChallenge(body, ct)) { console.log('  [Cloudflare challenge]'); continue; }
    let data;
    try { data = JSON.parse(body); } catch { console.log(`  [not JSON, status ${res.status}] ${body.slice(0, 160)}`); continue; }

    console.log('  --- field outline (nested) ---');
    outline(data, '  ');
    console.log('  --- full JSON ---');
    console.log(JSON.stringify(data, null, 2).split('\n').map((l) => '  ' + l).join('\n'));
  } catch (err) {
    console.log(`  [${err.name}: ${err.message}]`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
