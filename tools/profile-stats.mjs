#!/usr/bin/env node
// Auto-generate V's GitHub profile card. Renders assets/counters.svg + assets/milestones.svg from a
// single state file (assets/stats.json), refreshes the live numbers it can reach, and — crucially —
// bumps the ?v= cache-buster in README.md so GitHub's image cache (camo) actually shows the update.
// That cache-buster is why stats looked frozen: the file changed but the URL did not.
//
//   node tools/profile-stats.mjs            # fetch live numbers (needs a token), render, bump cache
//   node tools/profile-stats.mjs --render   # render from stats.json only, no network (always safe)
//
// Token: STATS_TOKEN (a PAT: read access to your repos + read:user) for the full card incl. private
// repos, contributions and streak. Falls back to GITHUB_TOKEN (public only). GraphQL is used for
// contributions/streak when the token allows; every fetch is FAIL-SOFT — on any error the previous
// value in stats.json is kept, so the card never shows garbage.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => join(ROOT, 'assets', p);
const USER = process.env.GH_USER || 'VZero911';
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN || '';
const renderOnly = process.argv.includes('--render');

const s = JSON.parse(readFileSync(A('stats.json'), 'utf8'));
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  await tryset('user (followers, repos)', async () => {
    const u = await api(`users/${USER}`);
    s.followers = u.followers;
  });
  // Stars + languages across all accessible repos (public always; private with a PAT).
  await tryset('stars + languages', async () => {
    let page = 1, repos = [], got;
    do { got = await api(`user/repos?per_page=100&affiliation=owner&page=${page++}`); repos = repos.concat(got); } while (got.length === 100 && page < 6);
    if (!repos.length) { // fallback to public list if user/repos is not permitted
      repos = await api(`users/${USER}/repos?per_page=100&type=owner`);
    }
    s.stars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
    s.repos = repos.filter((r) => !r.fork).length;
    const bytes = {};
    for (const r of repos.filter((r) => !r.fork)) {
      try { const L = await api(`repos/${r.full_name}/languages`); for (const [k, v] of Object.entries(L)) bytes[k] = (bytes[k] || 0) + v; } catch { /* skip */ }
    }
    const total = Object.values(bytes).reduce((a, b) => a + b, 0);
    if (total > 0) {
      s.languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, b]) => ({ name, pct: Math.round((b / total) * 1000) / 10, color: LANG_COLORS[name] || '#8f6cf0' }));
    }
  });
  // Contributions + streak via GraphQL (works on a runner with a user token).
  await tryset('contributions + streak', async () => {
    const d = await graphql(`{ user(login:"${USER}"){ contributionsCollection{ totalCommitContributions contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount date } } } } } }`);
    const cc = d.user.contributionsCollection;
    s.contributions = cc.contributionCalendar.totalContributions;
    s.commits = cc.totalCommitContributions;
    const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
    let cur = 0, best = 0;
    for (const day of days) { if (day.contributionCount > 0) { cur++; best = Math.max(best, cur); } else { cur = 0; } }
    // current streak = trailing run ending today/yesterday
    let trail = 0;
    for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount > 0) trail++; else break; }
    s.streak = trail; s.bestStreak = Math.max(best, s.bestStreak || 0);
  });
  // Points: a simple, stable formula from the real numbers.
  s.points = s.contributions * 1 + s.commits * 1 + s.stars * 10 + s.prsMerged * 15 + s.repos * 20;
  writeFileSync(A('stats.json'), JSON.stringify(s, null, 1) + '\n');
}

// ---- level ---------------------------------------------------------------------------------------
const LEVELS = [
  { lv: 1, name: 'Seed', at: 0 }, { lv: 2, name: 'Sprout', at: 150 }, { lv: 3, name: 'Sapling', at: 400 },
  { lv: 4, name: 'Young tree', at: 700 }, { lv: 5, name: 'Tree', at: 1500 }, { lv: 6, name: 'Old tree', at: 3000 },
  { lv: 7, name: 'Forest', at: 6000 },
];
const pts = s.points || 0;
let cur = LEVELS[0], next = LEVELS[LEVELS.length - 1];
for (let i = 0; i < LEVELS.length; i++) { if (pts >= LEVELS[i].at) { cur = LEVELS[i]; next = LEVELS[i + 1] || LEVELS[i]; } }
const span = Math.max(1, next.at - cur.at);
const progress = Math.min(1, (pts - cur.at) / span);
const toNext = Math.max(0, next.at - pts);

// ---- counters.svg --------------------------------------------------------------------------------
const W = 592, X0 = 24; // language bar track
let bx = X0; const bars = [];
for (const L of s.languages) { const w = (L.pct / 100) * W; bars.push(`<rect x="${bx.toFixed(1)}" y="202" width="${w.toFixed(1)}" height="7" fill="${L.color}" clip-path="url(#c)"/>`); bx += w; }
let lx = 28; const legend = [];
for (const L of s.languages) {
  legend.push(`<circle cx="${lx.toFixed(1)}" cy="228" r="4" fill="${L.color}"/><text x="${(lx + 9).toFixed(1)}" y="232" fill="#c0caf5" font-size="11">${esc(L.name)} <tspan fill="#787c99">${L.pct}%</tspan></text>`);
  lx += 9 + (L.name.length * 6.1 + String(L.pct).length * 6.4 + 34);
}
const counters = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="252" viewBox="0 0 640 252" font-family="Segoe UI, Ubuntu, sans-serif"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#ffd166"/></linearGradient><clipPath id="c"><rect x="24" y="202" width="592" height="7" rx="3.5"/></clipPath></defs><rect x="1" y="1" width="638" height="250" rx="18" fill="#12121c" stroke="url(#b)" stroke-opacity="1" stroke-width="1.6"/><text x="80" y="46" fill="#a58bff" font-size="28" font-weight="700" text-anchor="middle">${s.views}</text><text x="80" y="66" fill="#787c99" font-size="10.5" letter-spacing="1.5" text-anchor="middle">PROFILE VIEWS</text><text x="240" y="46" fill="#f2c14e" font-size="28" font-weight="700" text-anchor="middle">${s.stars}</text><text x="240" y="66" fill="#787c99" font-size="10.5" letter-spacing="1.5" text-anchor="middle">STARS</text><line x1="160" y1="22" x2="160" y2="64" stroke="#2a2e44"/><text x="400" y="46" fill="#5fd38d" font-size="28" font-weight="700" text-anchor="middle">${s.followers}</text><text x="400" y="66" fill="#787c99" font-size="10.5" letter-spacing="1.5" text-anchor="middle">FOLLOWERS</text><line x1="320" y1="22" x2="320" y2="64" stroke="#2a2e44"/><text x="560" y="46" fill="#f2a94e" font-size="28" font-weight="700" text-anchor="middle">${s.streak} d</text><text x="560" y="66" fill="#787c99" font-size="10.5" letter-spacing="1.5" text-anchor="middle">STREAK · BEST ${s.bestStreak}</text><line x1="480" y1="22" x2="480" y2="64" stroke="#2a2e44"/><line x1="24" y1="88" x2="616" y2="88" stroke="#2a2e44"/><text x="80" y="116" fill="#c0caf5" font-size="17" font-weight="600" text-anchor="middle">${s.commits}</text><text x="80" y="133" fill="#787c99" font-size="9.5" letter-spacing="1.2" text-anchor="middle">COMMITS</text><text x="240" y="116" fill="#c0caf5" font-size="17" font-weight="600" text-anchor="middle">${s.prsMerged}/${s.prsTotal}</text><text x="240" y="133" fill="#787c99" font-size="9.5" letter-spacing="1.2" text-anchor="middle">PRS MERGED</text><text x="400" y="116" fill="#c0caf5" font-size="17" font-weight="600" text-anchor="middle">${s.repos}</text><text x="400" y="133" fill="#787c99" font-size="9.5" letter-spacing="1.2" text-anchor="middle">REPOSITORIES</text><text x="560" y="116" fill="#c0caf5" font-size="17" font-weight="600" text-anchor="middle">${s.contributions}</text><text x="560" y="133" fill="#787c99" font-size="9.5" letter-spacing="1.2" text-anchor="middle">CONTRIBUTIONS, 1 YEAR</text><text x="24" y="168" fill="#c0caf5" font-size="13" font-weight="700">Lv ${cur.lv} · ${cur.name} <tspan fill="#787c99" font-weight="400">(${pts} pts)</tspan></text><text x="616" y="168" fill="#787c99" font-size="11" text-anchor="end">${toNext} pts to ${next.name}</text><rect x="24" y="176" width="592" height="7" rx="3.5" fill="#2a2e44"/><rect x="24" y="176" width="${(592 * progress).toFixed(0)}" height="7" rx="3.5" fill="url(#b)"/>${bars.join('')}${legend.join('')}</svg>`;

// ---- milestones.svg ------------------------------------------------------------------------------
const tierOf = (v, steps) => { let t = steps[0]; for (const st of steps) if (v >= st.at) t = st; const nx = steps.find((st) => st.at > v); return { name: t.name, color: t.color, next: nx ? nx.at : null }; };
const SILVER = '#c0c8d8', BRONZE = '#b87333', GOLD = '#f2c14e';
const STEPS = [{ at: 0, name: 'Bronze', color: BRONZE }, { at: 100, name: 'Silver', color: SILVER }, { at: 1000, name: 'Gold', color: GOLD }];
const STEPS_SMALL = [{ at: 0, name: 'Bronze', color: BRONZE }, { at: 25, name: 'Silver', color: SILVER }, { at: 100, name: 'Gold', color: GOLD }];
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

console.log(`rendered: Lv ${cur.lv} ${cur.name} (${pts} pts) · ${s.stars}★ · ${s.followers} followers · ${s.contributions} contrib · streak ${s.streak}d`);
console.log('bumped counters.svg cache-buster in README.');
