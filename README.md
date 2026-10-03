<!-- Header -->
<p align="center"><img src="assets/header.svg" alt="V0" width="100%" /></p>

<p align="center"><img src="assets/identity.svg" alt="42 Student · Web3 builder · AI agents · open to freelance" /></p>
<p align="center"><img src="assets/counters.svg" alt="Profile views, stars, followers, streak" /></p>

---

## 👋 About me

```python
class V:
    school    = "42"
    roles     = ["Full-Stack Developer", "AI Developer", "Blockchain Developer", "Software Engineer"]
    learning  = ["Kernel", "DevOps", "Cybersecurity"]
    building  = "🌱 The Seed — a Web3 + AI monster-collecting game, Summoners War and beyond"
    style     = "ship clean, test twice, automate everything"
    remote    = True
    available = True  # freelance missions & collaborations
    looking_for = ["3D artists", "2D artists / illustrators", "UI artists"]  # sound & music: later
```

---

## 🌱 Featured project — The Seed

<p align="center">
  <a href="https://github.com/VZero911/The_Seed.V0-Public">
    <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/30-chain-3d.png" alt="The Seed — the chain in 3D" width="860" />
  </a>
</p>

<details>
<summary><b>🖼️ More screens</b> (the Village art is V2 and will be replaced)</summary>

<p align="center">
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/50-battle-paused-v2.png" width="250" />
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/51-summon-altar-v2.png" width="250" />
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/49-inventory-v2.png" width="250" />
</p>
<p align="center"><img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/46-village-floating-island.png" alt="The Village, V2 art" width="560" /></p>

</details>

An evolving **Web3 + AI** environment, and its first use: a monster-collecting game in the spirit of
*Summoners War*, bigger, on-chain. Your identity is a **wallet**; trades between players go through
**smart contracts**; every action is **signed for free** and relayed by the game.

| Layer | What's inside |
|---|---|
| ⛓️ **Smart contracts** | Solidity · Foundry · OpenZeppelin UUPS — tokens, NFT monsters, on-chain **marketplace** (auctions, offers, escrow), polls, achievements · 570 tests, upgrade-safe (validated against the deployed version) |
| 🐍 **Backend** | Python · FastAPI · PostgreSQL · web3.py — SIWE login, encrypted wallet vaults, indexer, deterministic battle engine, 450 species, 575 stages, 1,170 backend tests |
| 🎮 **Game** | Expo · React Native (mobile + web) — summons, runes, dungeons, tower, world boss, guilds, marketplace (UI V2) |
| 🖥️ **Admin console** | React · wagmi · **three.js** — live 3D view of the chain with wallets, block explorer, players, market, AI agents |
| 🤖 **AI** | automation registry, agent runs, MCP servers — the project is built to run itself |
| ✅ **Quality** | ~1,900 tests, 18 browser walks on an isolated stack (game, console, phone layout), security and licence scans, balance simulation |

<p align="center">
  <a href="https://vzero911.github.io/The_Seed.V0-Public/"><img src="assets/links.svg" alt="The Seed website and public showcase" /></a><br/>
  <a href="https://vzero911.github.io/The_Seed.V0-Public/">Website</a> · <a href="https://github.com/VZero911/The_Seed.V0-Public">Showcase</a>
</p>

### 🌍 Why it matters in real life: a concert ticket, with the code you can see above

The marketplace of the game is a small, tested version of how **any** asset could be traded
without a middleman. The same four steps, on a real example, a **concert ticket**:

| Step | In The Seed today | The same mechanism for a ticket |
|---|---|---|
| **1. Issue** | Only the `MintManager` contract mints a monster NFT, within a daily budget | The organizer mints exactly 5,000 tickets, nobody can add one |
| **2. List** | A player signs a fixed-price sale or an auction (reserve price, anti-sniping) | A fan lists the ticket at face value; the contract can cap the price |
| **3. Swap** | Escrow: the monster and the payment are locked together and swapped in one transaction | Money and ticket change hands at once: no scam, no "I paid but never got it" |
| **4. Share** | 2.5 % of each sale goes to the creator, shown *before* you sign | 5 % of every resale goes to the artist, forever, without a platform |
| **5. Prove** | Every sale is public on the chain, with its history | Provenance and authenticity of the ticket, checkable by anyone |

<p align="center">
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/40-market-listing.png" width="250" />
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/44-market-offer-received.png" width="250" />
  <img src="https://raw.githubusercontent.com/VZero911/The_Seed.V0-Public/main/screenshots/45-market-journal.png" width="250" />
</p>
<p align="center"><sub>The real screens: a sale, an offer received, the journal of every trade.</sub></p>

It is not a promise: the contracts are upgrade-tested, covered by invariant tests (no asset is ever
lost or created by a trade) and wait for an audit. **Real value needs audits and a legal frame
first.**

---

## 🧰 Tech stack

**Languages**

<p align="center">
  <img src="https://skillicons.dev/icons?i=c,cpp,python,ts,js,solidity,bash,html,css&perline=9&theme=dark" alt="Languages" />
</p>

**Web, mobile & 3D**

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,nextjs,vite,nodejs,tailwind,threejs,fastapi,flask&perline=8&theme=dark" alt="Web" />
</p>

**Blockchain, data & infra**

<p align="center">
  <img src="https://skillicons.dev/icons?i=postgres,supabase,redis,docker,githubactions,linux,arch,git,github,vscode&perline=10&theme=dark" alt="Infra" />
</p>

<p align="center">
  <img src="assets/stack.svg" alt="Foundry, OpenZeppelin, wagmi, Expo, SQLAlchemy, Claude Code, MCP" />
</p>

---

## 🎨 Looking for artists

**The Seed** needs faces. I build the chain, the server and the game; I am looking for people to
give it a look worth the world behind it (dark magic, floating island, a giant scary tower):

- 🧊 **3D artists**: monsters, props, the Village island and its tower (glTF, low to mid poly, for three.js and mobile)
- 🖌️ **2D artists / illustrators**: monster art and skins, rune and item icons, banners, key art
- 🧩 **UI artists**: game screens on the V2 design tokens (gold frames, display font)
- 🎵 *Sound and music: not yet, later.*

Credit and a share of the project's contribution points (**POC**, earned, never bought) are on the
table; real money only after audits and a legal frame. See what exists in the
[showcase](https://github.com/VZero911/The_Seed.V0-Public), then write me:
[vzero911@gmail.com](mailto:vzero911@gmail.com) or Discord **vzero911**.

<p align="center"><img src="assets/wanted.svg" alt="Looking for 3D and 2D artists, sound later" /></p>

---

## 🖤 The Seed OS — *something is growing*

<p align="center"><img src="assets/seedos.svg" alt="The Seed OS" width="100%" /></p>

<p align="center"><i>Same seed. Another soil.</i><br/>
An operating system, built from an Arch Linux base, where the wallet is the identity and the AI is
not an app — it is part of the system.<br/>
<b>Nothing more for now.</b> 👁️</p>

---

## 🔮 Incoming

<details>
<summary><b>👁️ ALICE</b> — to be presented soon</summary>

<br/>

<p align="center"><i>Another piece of the same seed.</i><br/>
<b>ALICE</b> will be introduced here when it is ready. <b>Nothing more for now.</b> 👁️</p>

</details>

---

## 🔭 Right now

- 🌱 **The Seed** — floating-island Village, marketplace UI, graphics V2, admin console in 3D, the first AI agents
- 🎨 **Looking for 3D and 2D artists** — see above
- 🔮 **Incoming: ALICE** — presented soon 👁️
- 🖤 **The Seed OS** — classified 🤫 ([first sprout](https://github.com/VZero911/The_Seed_OS.V0-Public-ArchLinux-Fork-))
- 🎓 **42** — C, C++, algorithms, systems ([42-Public](https://github.com/VZero911/42-Public))
- 📚 Learning **kernel**, **DevOps** and **cybersecurity**

---

## 📬 Let's build something

<p align="center"><img src="assets/contact.svg" alt="Email, Discord, PayPal" /></p>
<p align="center">
  <a href="mailto:vzero911@gmail.com">Email</a> ·
  <a href="https://discord.com/users/vzero911">Discord</a> ·
  <a href="https://github.com/vzero911">GitHub</a> ·
  <a href="https://www.paypal.com/paypalme/vzero911">PayPal</a>
</p>

---

<p align="center"><i>« Dream Higher, Assume Later. »</i></p>

<p align="center"><img src="assets/footer.svg" alt="" width="100%" /></p>
