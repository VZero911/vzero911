#!/usr/bin/env node
// Auto-generate V's GitHub profile card: a 5x3 grid of 15 stats (three tiers — identity, activity,
// project & AI), plus a level bar and the language breakdown. Renders assets/counters.svg +
// assets/milestones.svg from a single state file (assets/stats.json), refreshes the live numbers it
// can reach, and bumps the ?v= cache-buster in README.md so GitHub's image cache (camo) actually
// shows the update — that cache-buster is why the card looked frozen before.
//
//   node tools/profile-stats.mjs            # fetch live numbers (needs a token), render, bump cache
//   node tools/profile-stats.mjs --render   # render from stats.json only, no network (always safe)
//
// Token: STATS_TOKEN (a PAT: read access to your repos + read:user) for the full card incl. private
// repos, contributions and streak. Falls back to GITHUB_TOKEN (public only). Every fetch is
// FAIL-SOFT — on any error the previous value in stats.json is kept, so the card never shows garbage.
// Claude tokens/cost come from the cloud A.L.I.C.E (it writes stats.json fields `tokensTotal` and
// `costUsd` from get_session); the runner keeps them as-is.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => join(ROOT, 'assets', p);
const USER = process.env.GH_USER || 'VZero911';
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN || '';
const renderOnly = process.argv.includes('--render');

const s = JSON.parse(readFileSync(A('stats.json'), 'utf8'));
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n ?? '—');
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
};

// ---- live refresh (fail-soft) --------------------------------------------------------------------
const api = async (path) => {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
};
const graphql = async (query) => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(15000),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(`graphql -> ${r.status} ${JSON.stringify(j.errors || '')}`);
  return j.data;
};
const tryset = async (label, fn) => { try { await fn(); console.log(`  ok   ${label}`); } catch (e) { console.log(`  keep ${label} (${e.message})`); } };

const LANG_COLORS = { Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', C: '#555555', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c', Solidity: '#AA6746', Shell: '#89e051', Makefile: '#427819', Dockerfile: '#384d54', Rust: '#dea584' };

if (!renderOnly && TOKEN) {
  console.log('refreshing live numbers:');
  await tryset('user (followers)', async () => { const u = await api(`users/${USER}`); s.followers = u.followers; });
  await tryset('stars + repos + languages', async () => {
    let page = 1, repos = [], got;
    do { got = await api(`user/repos?per_page=100&affiliation=owner&page=${page++}`); repos = repos.concat(got); } while (got.length === 100 && page < 6);
    if (!repos.length) repos = await api(`users/${USER}/repos?per_page=100&type=owner`);
    const own = repos.filter((r) => !r.fork);
    s.stars = own.reduce((a, r) => a + (r.stargazers_count || 0), 0);
    s.repos = own.length;
    const bytes = {};
    for (const r of own) { try { const L = await api(`repos/${r.full_name}/languages`); for (const [k, v] of Object.entries(L)) bytes[k] = (bytes[k] || 0) + v; } catch { /* skip */ } }
    const total = Object.values(bytes).reduce((a, b) => a + b, 0);
    if (total > 0) s.languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, b]) => ({ name, pct: Math.round((b / total) * 1000) / 10, color: LANG_COLORS[name] || '#8f6cf0' }));
  });
  await tryset('issues + reviews (search)', async () => {
    const iss = await api(`search/issues?q=${encodeURIComponent(`author:${USER} type:issue`)}&per_page=1`);
    if (Number.isFinite(iss.total_count)) s.issues = iss.total_count;
    const rev = await api(`search/issues?q=${encodeURIComponent(`reviewed-by:${USER} type:pr`)}&per_page=1`);
    if (Number.isFinite(rev.total_count)) s.reviews = rev.total_count;
  });
  await tryset('contributions + commits + streak', async () => {
    const d = await graphql(`{ user(login:"${USER}"){ contributionsCollection{ totalCommitContributions contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount } } } } } }`);
    const cc = d.user.contributionsCollection;
    s.contributions = cc.contributionCalendar.totalContributions;
    s.commits = cc.totalCommitContributions;
    const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
    let run = 0, best = 0; for (const day of days) { if (day.contributionCount > 0) { run++; best = Math.max(best, run); } else run = 0; }
    let trail = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount > 0) trail++; else break; }
    s.streak = trail; s.bestStreak = Math.max(best, s.bestStreak || 0);
  });
  s.points = s.contributions + s.commits + s.stars * 10 + s.prsMerged * 15 + s.repos * 20;
  writeFileSync(A('stats.json'), JSON.stringify(s, null, 1) + '\n');
}

// ---- derived ------------------------------------------------------------------------------------
const locTotal = s.loc ? Object.values(s.loc).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
const LEVELS = [
  { lv: 1, name: 'Seed', at: 0 }, { lv: 2, name: 'Sprout', at: 150 }, { lv: 3, name: 'Sapling', at: 400 },
  { lv: 4, name: 'Young tree', at: 700 }, { lv: 5, name: 'Tree', at: 1500 }, { lv: 6, name: 'Old tree', at: 3000 }, { lv: 7, name: 'Forest', at: 6000 },
];
const pts = s.points || 0;
let cur = LEVELS[0], next = LEVELS[LEVELS.length - 1];
for (let i = 0; i < LEVELS.length; i++) if (pts >= LEVELS[i].at) { cur = LEVELS[i]; next = LEVELS[i + 1] || LEVELS[i]; }
const progress = Math.min(1, (pts - cur.at) / Math.max(1, next.at - cur.at));
const toNext = Math.max(0, next.at - pts);

// ---- counters.svg: 5 columns x 3 tiers = 15 stats, then level + languages -----------------------
const COLS = [64, 192, 320, 448, 576];
const PURPLE = '#a58bff', GOLD = '#f2c14e', GREEN = '#5fd38d', ORANGE = '#f2a94e', INK = '#c0caf5', CLAUDE = '#d97757', TEAL = '#7ee0c0';
// tier 1 — identity · tier 2 — activity · tier 3 — project & AI
const GRID = [
  [ { v: s.views, l: 'PROFILE VIEWS', c: PURPLE }, { v: s.stars, l: 'STARS', c: GOLD }, { v: s.followers, l: 'FOLLOWERS', c: GREEN }, { v: s.contributions, l: 'CONTRIBUTIONS', c: PURPLE }, { v: `${s.streak} d`, l: `STREAK · BEST ${s.bestStreak}`, c: ORANGE } ],
  [ { v: s.commits, l: 'COMMITS', c: INK }, { v: `${s.prsMerged}/${s.prsTotal}`, l: 'PRS MERGED', c: INK }, { v: s.issues, l: 'ISSUES', c: INK }, { v: s.reviews, l: 'REVIEWS', c: INK }, { v: s.repos, l: 'REPOSITORIES', c: INK } ],
  [ { v: fmt(locTotal), l: 'LINES OF CODE', c: TEAL }, { v: fmt(s.tests ?? (s.loc && s.loc.unit_tests) ?? 0), l: 'UNIT TESTS', c: GREEN }, { v: s.contracts ?? 13, l: 'CONTRACTS', c: '#AA6746' }, { v: fmt(s.tokensTotal ?? 0), l: 'CLAUDE TOKENS', c: CLAUDE }, { v: `$${fmt(Math.round(s.costUsd ?? 0))}`, l: 'BUILT FOR', c: GOLD } ],
];
const cell = (col, row, d) => {
  const x = COLS[col];
  const vy = [44, 98, 152][row], ly = [62, 116, 170][row];
  const big = row === 0;
  return `<text x="${x}" y="${vy}" fill="${d.c}" font-size="${big ? 24 : 19}" font-weight="700" text-anchor="middle">${esc(d.v)}</text>`
    + `<text x="${x}" y="${ly}" fill="#787c99" font-size="9" letter-spacing="1.1" text-anchor="middle">${esc(d.l)}</text>`;
};
let cells = '';
GRID.forEach((rowArr, r) => rowArr.forEach((d, c) => { cells += cell(c, r, d); }));
const tierLines = [76, 130].map((y) => `<line x1="24" y1="${y}" x2="616" y2="${y}" stroke="#2a2e44"/>`).join('');
// language bars + legend
const W = 592; let bx = 24; const bars = [];
for (const L of s.languages) { const w = (L.pct / 100) * W; bars.push(`<rect x="${bx.toFixed(1)}" y="236" width="${w.toFixed(1)}" height="7" fill="${L.color}" clip-path="url(#c)"/>`); bx += w; }
let lx = 28; const legend = [];
for (const L of s.languages) { legend.push(`<circle cx="${lx.toFixed(1)}" cy="264" r="4" fill="${L.color}"/><text x="${(lx + 9).toFixed(1)}" y="268" fill="#c0caf5" font-size="11">${esc(L.name)} <tspan fill="#787c99">${L.pct}%</tspan></text>`); lx += 9 + (L.name.length * 6.1 + String(L.pct).length * 6.4 + 34); }
const H = 284;
const counters = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${H}" viewBox="0 0 640 ${H}" font-family="Segoe UI, Ubuntu, sans-serif"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#ffd166"/></linearGradient><clipPath id="c"><rect x="24" y="236" width="592" height="7" rx="3.5"/></clipPath></defs><rect x="1" y="1" width="638" height="${H - 2}" rx="18" fill="#12121c" stroke="url(#b)" stroke-opacity="1" stroke-width="1.6"/>${cells}${tierLines}<line x1="24" y1="184" x2="616" y2="184" stroke="#2a2e44"/><text x="24" y="206" fill="#c0caf5" font-size="13" font-weight="700">Lv ${cur.lv} · ${cur.name} <tspan fill="#787c99" font-weight="400">(${pts} pts)</tspan></text><text x="616" y="206" fill="#787c99" font-size="11" text-anchor="end">${toNext} pts to ${next.name}</text><rect x="24" y="214" width="592" height="7" rx="3.5" fill="#2a2e44"/><rect x="24" y="214" width="${(592 * progress).toFixed(0)}" height="7" rx="3.5" fill="url(#b)"/>${bars.join('')}${legend.join('')}</svg>`;

// ---- milestones.svg (tier badges) ----------------------------------------------------------------
const tierOf = (v, steps) => { let t = steps[0]; for (const st of steps) if (v >= st.at) t = st; const nx = steps.find((st) => st.at > v); return { name: t.name, color: t.color, next: nx ? nx.at : null }; };
const SILVER = '#c0c8d8', BRONZE = '#b87333', GOLDT = '#f2c14e';
const STEPS = [{ at: 0, name: 'Bronze', color: BRONZE }, { at: 100, name: 'Silver', color: SILVER }, { at: 1000, name: 'Gold', color: GOLDT }];
const STEPS_SMALL = [{ at: 0, name: 'Bronze', color: BRONZE }, { at: 25, name: 'Silver', color: SILVER }, { at: 100, name: 'Gold', color: GOLDT }];
const ms = s.milestones;
const badge = (x, glyph, value, label, steps) => {
  const t = tierOf(value, steps);
  const nextTxt = t.next ? `${t.name} · next ${t.next >= 1000 ? t.next.toLocaleString('en-US') : t.next}` : `${t.name} · max`;
  return `<g transform="translate(${x},48)"><polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="${t.color}" fill-opacity="0.18" stroke="${t.color}" stroke-width="2.5"/><polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill="none" stroke="${t.color}" stroke-opacity="0.5"/><text y="7" fill="${t.color}" font-size="20" font-weight="700" text-anchor="middle">${glyph}</text></g><text x="${x}" y="98" fill="#c0caf5" font-size="15" font-weight="700" text-anchor="middle">${value}</text><text x="${x}" y="113" fill="${t.color}" font-size="9" letter-spacing="1.4" text-anchor="middle">${label}</text><text x="${x}" y="127" fill="#787c99" font-size="9.5" text-anchor="middle">${nextTxt}</text>`;
};
const milestones = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="146" viewBox="0 0 640 146" font-family="Segoe UI, Ubuntu, sans-serif"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs><rect x="1" y="1" width="638" height="144" rx="18" fill="#12121c" stroke="url(#b)" stroke-width="1.6"/>${badge(64, '◆', ms.commits, 'COMMITS', STEPS)}${badge(192, '⇄', ms.prsMerged, 'MERGED PRS', STEPS_SMALL)}${badge(320, '!', ms.issues, 'ISSUES', STEPS_SMALL)}${badge(448, '✓', ms.reviews, 'REVIEWS', STEPS_SMALL)}${badge(576, '▣', ms.repos, 'REPOS', STEPS_SMALL)}</svg>`;

writeFileSync(A('counters.svg'), counters);
writeFileSync(A('milestones.svg'), milestones);

// ---- README: bump ?v= on counters.svg, refresh the loc line --------------------------------------
const readmePath = join(ROOT, 'README.md');
let readme = readFileSync(readmePath, 'utf8');
readme = readme.replace(/counters\.svg\?v=(\d+)/, (_, n) => `counters.svg?v=${Number(n) + 1}`);
if (s.loc) {
  const order = ['The Seed', 'TOA - Infernal', 'A.L.I.C.E', 'The Seed OS'];
  const line = order.filter((k) => k in s.loc).map((k) => `${k} ${Number(s.loc[k]).toLocaleString('en-US')}`).join(' · ');
  readme = readme.replace(/<!-- loc -->[\s\S]*?<!-- \/loc -->/, `<!-- loc -->\n<p align="center"><sub>Lines of code (code + tests): ${line}</sub></p>\n<!-- /loc -->`);
}
writeFileSync(readmePath, readme);

console.log(`rendered 5x3: ${fmt(locTotal)} LOC · ${s.stars}★ · ${s.contributions} contrib · ${fmt(s.tokensTotal ?? 0)} tokens · Lv ${cur.lv} ${cur.name} (${pts} pts)`);
