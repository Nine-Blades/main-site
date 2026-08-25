// Prerender upcoming Kingdom events into the static HTML at build time, so
// crawlers (and users with JS off) see a populated events section plus rich
// schema.org/Event JSON-LD — instead of the empty grid the client-side
// js/events.js leaves behind.
//
// Two ORK calls: SearchService/Event for the list, then Event/GetEventDetails
// per event (the jsork call) for the end date, full description, real venue
// address, and price. Both use the x-nb-build header (ORK_BUILD_KEY).
//
// Testing: set ORK_FIXTURE=path.json to a { "search": [...], "details": {id:{...}} }
// object to render offline.
//
// GUARD: if the SEARCH fails / is Cloudflare-challenged / returns no upcoming
// events, the script writes NOTHING and exits 0 — the last good render stays.
// A failed *detail* call degrades that one event to list-only data (still a
// card, just without end date / rich JSON-LD).

import { readFile, writeFile } from 'node:fs/promises';

const ORK = 'https://ork.amtgard.com/orkservice/Json/index.php';
const SEARCH = `${ORK}?call=SearchService%2FEvent&date_order=true&name=&limit=200&kingdom_id=31`;
const DETAIL = (id) => `${ORK}?call=Event%2FGetEventDetails&request=&request%5BEventId%5D=${id}&request%5BCurrent%5D=true`;

const TARGETS = ['index.html', 'events/index.html'];
const DESC_MAX = 300;
const ORG = { '@type': 'Organization', name: 'Kingdom of the Nine Blades', url: 'https://nineblades.ca' };

const PROVINCE_CODE = {
  ontario: 'ON', quebec: 'QC', 'québec': 'QC', manitoba: 'MB', alberta: 'AB',
  'british columbia': 'BC', saskatchewan: 'SK', 'nova scotia': 'NS', 'new brunswick': 'NB',
  'newfoundland and labrador': 'NL', 'prince edward island': 'PE',
  'northwest territories': 'NT', yukon: 'YT', nunavut: 'NU',
};

const FIXTURE = process.env.ORK_FIXTURE
  ? JSON.parse(await readFile(process.env.ORK_FIXTURE, 'utf8')) : null;

// ---- helpers ---------------------------------------------------------------

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function torontoToday() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

// DST-correct America/Toronto offset for a wall-clock time. "…T10:00:00" -> "-04:00".
function torontoOffset(localIso) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', timeZoneName: 'shortOffset',
  }).formatToParts(new Date(localIso + 'Z')).find((x) => x.type === 'timeZoneName').value;
  const m = name.match(/GMT([+-]?)(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return '-05:00';
  return `${m[1] === '-' ? '-' : '+'}${String(Math.abs(+m[2])).padStart(2, '0')}:${m[3] || '00'}`;
}

// "2026-10-17 10:00:00" -> "2026-10-17T10:00:00-04:00"
function toIso(dt) {
  const local = dt.replace(' ', 'T');
  return local + torontoOffset(local);
}

const fmt = (opts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', ...opts });
const D_FULL = fmt({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const D_NOYR = fmt({ weekday: 'short', month: 'short', day: 'numeric' });
const T_ONLY = fmt({ hour: 'numeric', minute: '2-digit' });
const DAYKEY = fmt({ year: 'numeric', month: '2-digit', day: 'numeric' });

function formatRange(startIso, endIso) {
  const s = new Date(startIso);
  if (!endIso) return `${D_FULL.format(s)} · ${T_ONLY.format(s)}`;
  const e = new Date(endIso);
  if (DAYKEY.format(s) === DAYKEY.format(e)) {
    return `${D_FULL.format(s)} · ${T_ONLY.format(s)} – ${T_ONLY.format(e)}`;
  }
  return `${D_NOYR.format(s)} – ${D_FULL.format(e)}`;
}

function cleanDescription(raw, max) {
  if (!raw) return '';
  let s = String(raw).replace(/[\r\n]+/g, ' ').replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[#*`_]+/g, '').replace(/\s+/g, ' ').trim();
  if (max && s.length > max) {
    s = s.slice(0, max).replace(/[\s,;:.–-]+\S*$/, '').trim() + '…';
  }
  return s;
}

// ---- ORK access ------------------------------------------------------------

async function fetchOrk(url) {
  const key = process.env.ORK_BUILD_KEY;
  if (!key) { console.error('GUARD: ORK_BUILD_KEY not set.'); return null; }
  try {
    const res = await fetch(url, { headers: { 'x-nb-build': key }, signal: AbortSignal.timeout(20000) });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (/just a moment|challenge-platform|cf[-_]mitigated/i.test(body) || ct.includes('text/html')) {
      console.error('GUARD: Cloudflare challenge / non-JSON.');
      return null;
    }
    return JSON.parse(body);
  } catch (err) {
    console.error(`GUARD: fetch failed (${err.name}: ${err.message}).`);
    return null;
  }
}

async function loadSearch() {
  if (FIXTURE) return FIXTURE.search || (Array.isArray(FIXTURE) ? FIXTURE : []);
  const data = await fetchOrk(SEARCH);
  return data ? (data.Result || []) : null;
}

// Returns the single occurrence for an event, or null.
async function loadDetail(eventId, detailId) {
  const data = FIXTURE ? (FIXTURE.details || {})[eventId] : await fetchOrk(DETAIL(eventId));
  const arr = data && data.CalendarEventDetails;
  if (!Array.isArray(arr) || !arr.length) return null;
  const byId = arr.find((o) => Number(o.EventCalendarDetailId) === Number(detailId));
  if (byId) return byId;
  const today = torontoToday();
  const upcoming = arr.filter((o) => o.EventStart && o.EventStart.slice(0, 10) >= today)
    .sort((a, b) => (a.EventStart < b.EventStart ? -1 : 1));
  return upcoming[0] || arr[0];
}

// ---- shaping ---------------------------------------------------------------

function locationFrom(occ, parkName) {
  if (!occ) return null;
  const street = occ.Address ? occ.Address.split(',')[0].trim() : '';
  const region = PROVINCE_CODE[(occ.Province || '').toLowerCase()] || occ.Province || undefined;
  if (!street && !occ.City) return null; // not enough to place it
  const address = { '@type': 'PostalAddress', addressCountry: /united states|usa/i.test(occ.Country || '') ? 'US' : 'CA' };
  if (street) address.streetAddress = street;
  if (occ.City) address.addressLocality = occ.City;
  if (region) address.addressRegion = region;
  if (occ.PostalCode) address.postalCode = occ.PostalCode;
  const place = { '@type': 'Place', address };
  if (parkName) place.name = parkName;
  try {
    const loc = JSON.parse(occ.Location);
    if (loc && loc.location && typeof loc.location.lat === 'number') {
      place.geo = { '@type': 'GeoCoordinates', latitude: loc.location.lat, longitude: loc.location.lng };
    }
  } catch { /* Location may be absent or non-JSON */ }
  return place;
}

async function enrich(ev) {
  const occ = await loadDetail(ev.EventId, ev.NextDetailId);
  const startRaw = (occ && occ.EventStart) || ev.NextDate;
  const endRaw = occ && occ.EventEnd && occ.EventEnd > occ.EventStart ? occ.EventEnd : null;
  const startIso = toIso(startRaw);
  const endIso = endRaw ? toIso(endRaw) : null;
  const url = (occ && occ.Url) ? occ.Url
    : `https://ork.amtgard.com/orkui/index.php?Route=Event/detail/${ev.EventId}/${ev.NextDetailId}`;
  return {
    name: ev.Name,
    parkName: ev.ParkName,
    lastDate: (endRaw || startRaw).slice(0, 10),
    startIso, endIso, url,
    description: cleanDescription((occ && occ.Description) || ev.ShortDescription, DESC_MAX),
    price: occ && occ.Price != null ? Number(occ.Price) : null,
    location: locationFrom(occ, ev.ParkName),
  };
}

// ---- rendering -------------------------------------------------------------

function cardHtml(e) {
  const rows = [`            <div class="event-date">${esc(formatRange(e.startIso, e.endIso))}</div>`];
  if (e.parkName) rows.push(`            <div class="event-date">${esc(e.parkName)}</div>`);
  if (e.price === 0) rows.push('            <div class="event-date">Free</div>');
  if (e.description) rows.push(`            <div class="event-description">${esc(e.description)}</div>`);
  return `        <a class="event-card" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">
          <div class="event-header">${esc(e.name)}</div>
          <div class="event-content">
${rows.join('\n')}
          </div>
        </a>`;
}

function eventLd(e) {
  if (!e.location) return null; // only mark up events we can place
  const obj = {
    '@context': 'https://schema.org', '@type': 'Event',
    name: e.name, startDate: e.startIso,
    ...(e.endIso ? { endDate: e.endIso } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: e.location, organizer: ORG, url: e.url,
  };
  if (e.description) obj.description = e.description;
  if (e.price != null) {
    obj.offers = {
      '@type': 'Offer', price: String(e.price), priceCurrency: 'CAD',
      availability: 'https://schema.org/InStock', url: e.url, validFrom: e.startIso,
    };
    obj.isAccessibleForFree = e.price === 0;
  }
  return obj;
}

function jsonLdBlock(events) {
  const items = events.map(eventLd).filter(Boolean);
  if (!items.length) return '';
  const json = JSON.stringify(items.length === 1 ? items[0] : items, null, 2).replace(/</g, '\\u003c');
  return `    <script type="application/ld+json">\n${json}\n    </script>`;
}

function injectBetween(html, start, end, content) {
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  if (s === -1 || e === -1 || e < s) throw new Error(`markers not found: ${start}`);
  return html.slice(0, s + start.length) + '\n' + content + '\n' + html.slice(e).replace(/^\s*/, '    ');
}

// ---- main ------------------------------------------------------------------

const raw = await loadSearch();
if (!raw) process.exit(0); // guard logged; nothing written

const today = torontoToday();
const listUpcoming = raw
  .filter((ev) => ev && ev.NextDate && ev.NextDate.slice(0, 10) >= today)
  .sort((a, b) => (a.NextDate < b.NextDate ? -1 : a.NextDate > b.NextDate ? 1 : a.EventId - b.EventId));

if (!listUpcoming.length) {
  console.error('GUARD: no upcoming events — leaving pages unchanged.');
  process.exit(0);
}

// Enrich with detail, then re-filter by the (now known) end date so multi-day
// events that started yesterday but run through today still show.
const enriched = [];
for (const ev of listUpcoming) enriched.push(await enrich(ev));
const events = enriched
  .filter((e) => e.lastDate >= today)
  .sort((a, b) => (a.startIso < b.startIso ? -1 : a.startIso > b.startIso ? 1 : 0));

const cards = events.map(cardHtml).join('\n');
const jsonld = jsonLdBlock(events);

let wrote = 0;
for (const file of TARGETS) {
  const before = await readFile(file, 'utf8');
  let after = injectBetween(before, '<!-- EVENTS:START -->', '<!-- EVENTS:END -->', cards);
  after = injectBetween(after, '<!-- EVENTS-JSONLD:START -->', '<!-- EVENTS-JSONLD:END -->', jsonld);
  if (after !== before) { await writeFile(file, after); wrote++; }
  console.log(`${file}: ${after !== before ? 'updated' : 'unchanged'}`);
}

const withLd = events.filter((e) => e.location).length;
const free = events.filter((e) => e.price === 0).length;
console.log(`\n${events.length} upcoming; ${withLd} with JSON-LD; ${free} free; ${wrote} file(s) changed.`);
