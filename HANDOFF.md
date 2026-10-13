# Rolo — Project Handoff

> Read this first. It is the complete context for continuing work on **Rolo** with any AI model or developer.
> Current version: **v1.4.0** (October 2026). Owner: Thomas (Director of Sales Enablement at an insurance brokerage, Tahlequah, OK).

---

## 1. What Rolo is

A modern take on the old-school sales **rolodex**: a contact tool that helps you remember everything about the people you sell to. You can flip through cards, search everything, and open a rich record that makes calling, texting and emailing one tap away. Family, hobbies, favorite spots and notes drive rapport.

- **Name:** Rolo (Thomas's pick). Use "Rolo" in branding. Don't use "Rolodex" in marketing copy, because it's a Newell trademark. ROLO is also a candy brand, so check domains (getrolo, rolo.cards, userolo).
- **Audience:** sales people and executives first. Defaults lean sales, but anyone who needs a rolodex can use it.
- **Platform strategy:** a **mobile-first website** now (installable PWA), with a native app later. All layout decisions are mobile-first, and desktop gets a two-pane layout.
- **Self-contained:** no build step, no framework, no server for core features. Data lives on the device (IndexedDB).

---

## 2. Thomas's preferences and design decisions (respect these)

| Topic | Decision |
|---|---|
| Look (v1.4) | Clean, technical, editorial. Inspired by references Thomas shared: **Ironclad Labs** footer (off-white, hairlines, mono section labels, dithered green landscape), **Chokepoint Watch** dashboard (mono uppercase labels, bracketed titles, `+` corner ticks, hatched dividers, big numerals, orange alerts), and **Gaia baby app** (gaiababy.app — calm off-white `#F6F7F4`, big sentence-case headlines). |
| Palette (v1.4) | Light: canvas `#F6F7F4`, surface `#FFFFFF`, ink `#111412`, accent deep green `#157257`. Dark: canvas `#0F1211`, surface `#171B1A`, ink `#ECF0ED`, accent soft teal `#5FCBAA`. **Primary buttons are ink** (black in light, near-white in dark). **Orange `#F0561D` / `#FF7A45` is only for signals** (overdue, going cold, delete). "Match device" is the default mode. |
| Typography (v1.4) | **Geist** (UI) + **Geist Mono** (labels, numbers, data: uppercase, letter-spaced, 10–11px). Both bundled locally. |
| Details (v1.4) | Hairline borders, small radii (6–10px), no drop shadows. Neutral avatars, outlined group tags with a small color square, neutral rolodex divider tabs. Corner tick marks on key panels (`.ticks`), dot-matrix fields (`.dots-bg`, rolodex floor), hatched divider (`.hatch`). |
| History | Midnight Ledger / Executive Desk / Forest & Paper (v1.0, rejected) → Slate + Indigo with teal dark (v1.1–1.3) → current field-instrument look (v1.4). |
| Paper texture | **Removed.** He felt it looked cheap and gimmicky. Cards are flat white/slate with a thin border and soft shadow. |
| Colored left borders/stripes | **Never.** He sees them as a tell-tale "designed by AI" pattern. No colored left-edge bars on cards, boxes or callouts. Group color only appears on tags/chips and avatar circles. |
| Sound effects | Skipped. They could get annoying for regular users. |
| Kids | Users enter an **age**, not a birthday (asking a prospect for a kid's birthday is awkward). Rolo stores the date the age was entered and adds a year each year. A birthday is optional, only if it comes up naturally. |
| Rolodex scroll | **Reversed**: scrolling or pulling **down** flips forward. |
| Share icon | iOS-style box with an up arrow (the original three-dots "share" icon didn't make sense to him). |
| Delete | Swipe right-to-left in List view to show Delete. A quiet "Delete contact" button sits at the bottom of every record. Both offer **Undo**. |
| Logging touches | Producers mostly **dial from their personal cell phones**. Tapping Call/Text/Email inside Rolo **auto-logs** the touch (with Add note / Undo). It can be turned off in Settings. |
| Email/calendar | Most teams use **Outlook / Microsoft 365**, which may be locked down (it needs IT admin consent for Microsoft Graph). |

---

## 3. Deployment

- Hosted on **Vercel** via a **GitHub** repo. Pushing to GitHub auto-deploys.
- Vercel settings: Framework **Other**, no build command, output directory `.` (repo root). `index.html` must be at the repo root.
- **On every release:** bump `VERSION` in `sw.js` (currently `rolo-v1.3.0`) so installed PWAs pick up changes.
- Release flow Thomas uses: replace repo contents with the new build (keep `.git`), commit, push.
- Local copy of the project lives on his Mac in a folder named **Rolo** (under "ai docs and work").
- Optional AI for Quick intake: add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, default `claude-haiku-4-5`) in Vercel → Project → Settings → Environment Variables, then redeploy. **Not enabled yet.** Thomas needs to decide and check with compliance, because notes would contain client details.

---

## 4. Architecture

- **Plain HTML/CSS/JS**, classic `<script>` tags (not ES modules), loaded in order. They share the global scope (top-level `const`/`function`). That order matters (see `index.html`).
- **Router:** hash-based (`#/today`, `#/rolo`, `#/search?q=`, `#/c/:id`, `#/c/:id/edit`, `#/new`, `#/settings`, `#/import`). `?nointro` in the query string skips the first-run intro (used by tests).
- **Rendering:** template strings → `innerHTML`, with event delegation (`data-act`, `data-log`, `data-href`, etc.). All user text goes through `esc()`.
- **State:** the `Store` object (in `model.js`) holds `contacts` (Map), `groups`, `settings`. `Store.save()` writes to IndexedDB and emits a change → `onStoreChange()` re-renders the current view. It never re-renders the editor while someone is typing.
- **Storage:** IndexedDB database `rolo`, stores `contacts` (keyPath `id`) and `meta` (`groups`, `settings`). Photos are stored inline as compressed JPEG data URLs. The theme preference is mirrored to `localStorage['rolo-theme']` so `index.html` can set the theme before first paint.
- **PWA:** `manifest.webmanifest` plus `sw.js` (network-first, cache fallback; skips `/api/`). It calls `navigator.storage.persist()`.
- **Layout:** mobile-first with a bottom tab bar (Today · Rolo · + · Search · Settings). At ≥960px the nav becomes a left rail, and Rolo/record become a **split view** (rolodex left, record right; the right pane follows the front card).
- **Desktop/keyboard:** ⌘K or `/` opens search. Arrow keys / PageUp / PageDown / letter keys drive the wheel, and Enter opens the front card.
- **Contact rows** are `<div class="row tap" data-href="#/c/id">`, not `<a>`, so the Call/Text links inside them are valid HTML. A global click handler in `app.js` routes them.

### File map
```
index.html              shell + script order; pre-paint theme script
styles.css              all styles; tokens for light ([data-theme="light"]) and dark ([data-theme="dark"])
sw.js                   offline cache — bump VERSION each release
manifest.webmanifest    PWA install settings
vercel.json             no-cache header for sw.js
api/intake.js           Vercel serverless function: optional Claude-powered Quick intake (tool-use JSON)
js/util.js              $, esc, uid, date helpers, toasts (multi-action), bottom sheets, confirm, image compression, sha256
js/icons.js             inline SVG icon set (icon(name))
js/db.js                IndexedDB wrapper
js/model.js             Store, data model, groups/colors, kid ages, warmth, dates, time zones, search, duplicates
js/sample.js            25 fictional sample contacts (seeded on first run)
js/rolodex.js           3D flipping wheel (class Rolodex)
js/views.js             Today, Rolo (wheel + list + swipe-to-delete), Search
js/record.js            Record page, log sheet, next-step/gift/photo sheets, contact picker, deleteContact()
js/editor.js            Add/Edit form
js/intake.js            Quick intake: dictation, on-device parser, AI call, review screen
js/share.js             vCard builder, share sheet (vCard/text/image), print cards
js/importer.js          vCard/CSV/XLSX import with column mapping + dedupe, phone contact picker, CSV/vCard/JSON export, backup/restore
js/intro.js             ~27s intro tour (timeline-driven renderAt(t); Intro.play())
js/settings.js          Settings, theme, groups, auto-log toggle, passcode lock, install help, roadmap
js/app.js               router, nav, split view, auto-logging, boot, first-run intro
fonts/                  Geist + Geist Mono variable (OFL)
icons/                  app icons (SVG + PNGs; ink tile, off-white card, green square)
vendor/xlsx.full.min.js SheetJS 0.18.5, lazy-loaded only for Excel import
README.md, CHANGELOG.md
```

---

## 5. Data model

### Contact
```js
{
  id, firstName, lastName, nickname, company, title,
  photo,                        // data URL (square, ~400px)
  phones: [{label, value}],     // labels: Mobile, Work, Office, Home, Other
  emails: [{label, value}],     // Work, Personal, Other
  address: {street, city, state, zip},
  linkedin, website,
  groupIds: [], tags: [], favorite,
  prefs: {method: ''|'call'|'text'|'email', bestTime, timezone},  // timezone auto from US state if blank
  cadenceDays,                  // keep-in-touch override; else group cadence; else settings.defaultCadence
  nextStep: {text, due},        // due = YYYY-MM-DD
  pinned: [],                   // "Don't forget" facts, max 3
  spouse: {name, notes}, anniversary,           // 'MM-DD' or 'YYYY-MM-DD'
  kids: [{id, name, age, ageAsOf, birthday}],   // age auto-increments from ageAsOf
  pets: [{id, name, kind}],
  hobbies: [], favoriteTreat, favoriteLunch, favoriteDinner, giftIdeas,
  gifts: [{id, date, item, occasion}],
  birthday, keyDates: [{id, label, date, recurring}],
  touches: [{id, type: call|text|email|meeting|note|gift, date (ISO), note, auto?}],
  photos: [{id, data, caption, date}],          // "memory photos"
  connections: [{contactId, relation}], referredBy, metAt,
  custom: [{id, label, value}],
  createdAt, updatedAt
}
```
`normalizeContact()` fills defaults, so new fields are safe to add.

### Groups (defaults)
Clients (green, 45d) · Prospects (blue, 14d) · Referral Partners (amber, 30d) · Centers of Influence (violet, 30d) · Vendors & Carriers (cyan, 90d) · Personal (rose, 60d). Color keys are stored (`sapphire, emerald, garnet, amber, plum, teal, copper, slate`) and mapped to hex in `GROUP_COLORS`.

### Settings
`theme ('system'|'light'|'dark'), autoLog, userName, pinHash, pinSalt, lastBackup, seeded, rolodexView, defaultCadence, lockAfterMin, installDismissed, introSeen, createdAt`

### Derived logic
- **Warmth:** days since last non-note touch ÷ cadence → Hot (≤0.5) / Warm (≤1) / Cooling (≤1.6) / Going cold. Shown as a 4-bar meter.
- **Today view:** overdue and this-week follow-ups, dates in the next 30 days (birthdays, anniversaries, kids' birthdays if known, key dates/renewals), going-cold list, recent activity, plus backup and install banners.
- **Search:** token AND-match across names, company, phones, emails, city, spouse, kids, pets, hobbies, treat, lunch/dinner spots, tags, groups, pinned, next step, custom fields, gifts, notes and photo captions. Results show a highlighted snippet of where the match was.

---

## 6. Feature inventory (v1.3)

**Views**
- **Today:** greeting, stat tiles, follow-ups (check off → logs "Done" with Undo), coming-up dates, going cold, recent activity.
- **Rolo:** 3D rolodex wheel with colored A–Z divider cards, an A–Z rail (tap or slide), group filter chips plus Favorites, and an inline search box. Front-card Call/Text/Open buttons. Toggle to **List** view (letter-grouped, swipe-to-delete).
- **Search:** full-text, suggestion chips from your own data, and recently-in-touch contacts.
- **Record:** header card (avatar, name, role, group tags, warmth, local time, preferred method); action bar (Call/Text/Email/Map/LinkedIn, with the preferred method highlighted); **Quick intake** button; **Before you call** brief; next step; Don't forget; conversation timeline; family; personal (hobbies, treat, lunch/dinner spots, gift ideas, gift log); key dates; memory photos with captions; connections and referral tree; contact details; Delete at the bottom.
- **Add/Edit:** every field above, including repeatable rows, group chips (with create new), and an optional "first conversation" note. Duplicate check on create.

**Features**
- **Auto-logging:** tapping Call/Text/Email logs immediately. A toast offers Add note / Undo, and returning to the app after a call re-offers the note. Same-type taps within 10 minutes don't double-log.
- **Quick intake:** dictate with the Web Speech API (or the keyboard mic), then "Sort it" → a review screen of proposed changes (each one checkable and editable) → apply. It uses AI through `/api/intake` when the key is set, and otherwise the on-device regex parser. The parser handles next steps with relative dates ("next week", "in 2 weeks", "Friday", "after the holidays"), pain points → Don't forget (+ tag), hobbies, favorite lunch/dinner spot, favorite drink/treat, spouse, kids with ages, pets, birthday, and company. If the call was auto-logged, the intake note fills in that touch instead of making a duplicate.
- **Share card:** choose which fields to include → share a .vcf through the native share sheet (iMessage/text), copy as text, share as a PNG card image, download .vcf, or print a 2¼″×4″ rotary card.
- **Import:** Android contact picker (Contact Picker API); .vcf from iPhone (Contacts → Lists → long-press → Export); CSV/Excel with automatic column mapping, a review step with duplicates unchecked, and group assignment; downloadable CSV template.
- **Export/backup:** full JSON backup (including photos) and restore/merge, CSV export, all-contacts .vcf, print all cards. Backup reminder after 14 days.
- **Settings:** your name, Look (Match device/Light/Dark), groups (name/color/cadence), default cadence, auto-log toggle, Quick intake status (AI on / on-device), 4-digit passcode lock (SHA-256 hashed privacy screen, not encryption; locks after 5 min away), install help, load sample contacts, erase all, Coming-soon roadmap, Watch the intro.
- **Intro tour (~27s):** logo → rolodex flip → search "golf" → record + "Call logged" → Quick intake filing → Today → "You're ready" (Import my contacts / Explore Rolo). Plays once on first open; skip, tap to pause, replay from Settings. Driven by `Intro.renderAt(t)`, so it can be rendered frame by frame to video. A 1080×1920 MP4 was exported (`rolo-intro.mp4`, light theme, no audio).

---

## 7. Important constraints and facts

- **Phone call/text history can't be read** by a website. iOS apps can't read it either. Android apps technically can, but Google Play only allows that permission for default dialer/SMS apps (with few exceptions). Realistic automatic options: auto-log taps inside Rolo (built), Outlook/Gmail + calendar sync (later, needs logins), or a business phone service API (Dialpad/RingCentral/OpenPhone). Less relevant, since producers use personal cells.
- **iPhone Safari** may clear site data after ~7 days unused unless the site is added to the Home Screen. Hence the install nudges and backup reminders, and a strong reason to add accounts/sync.
- **Contact Picker API** works only on Android Chrome. iPhone users import a .vcf.
- **Web Speech API** works in Chrome/Android and iOS Safari (may be limited in installed PWAs). The textarea plus keyboard dictation is the fallback.
- **AI endpoint security:** `/api/intake` only checks the Origin header. Anyone using the site could spend API credits, so add auth before wide release.
- **Compliance:** Rolo stores client personal details outside Salesforce (the company's system of record). Fine for a prototype; check with compliance before producers use it on real clients, especially before enabling AI sorting.
- Sample data is fictional (people, companies, `.example` emails, `555` numbers). Real local business names were deliberately avoided.

---

## 8. Roadmap / backlog

**Planned (Thomas's list)**
1. Business card scanning
2. Voice memos (attach audio to a record)
3. Transcript summarization
4. Connect your AI of choice for summaries
5. **Logins + sync across devices** (the most important structural next step)

**Discussed / natural next steps**
- Outlook (Microsoft Graph) email + calendar sync to auto-update last contact; Gmail as a second option
- Turn on AI Quick intake (needs API key + compliance OK)
- Quick intake for **new** contacts (dictate a whole new person)
- Native app wrapper (Capacitor or React Native) once accounts exist
- Dark and/or 16:9 versions of the intro video; optional music for marketing use

---

## 9. Version history

| Version | Highlights |
|---|---|
| 1.0.0 | Initial prototype: all v1+v2 features, three paper-texture themes, Netlify-ready |
| 1.1.0 | Slate+Indigo light/dark, removed texture, Inter only, auto-logging, lunch/dinner spots, reversed scroll, new share icon, new app icon, Vercel |
| 1.2.0 | Quick intake (+ optional AI function), swipe-to-delete, record delete button, no colored left borders, teal dark accent, fixed nested links in rows |
| 1.3.0 | Intro tour (first run + Settings), MP4 export |
| 1.4.0 | New clean/technical look (Geist + Geist Mono, off-white canvas, ink buttons, green/teal accent, orange signals, ticks/dots/hatch details), new icon, intro re-rendered |

---

## 10. How it was tested

Headless Chromium (Playwright) at an iPhone 13 viewport and 1440×900, in both light and dark: rolodex drag/wheel direction, A–Z jump, tap-to-open, logging, auto-log de-dupe, add contact, kid age roll-forward, share sheet, search, list view, CSV/vCard import with mapping and dedupe, backup/CSV export, passcode lock/unlock, Quick intake parser on sample notes, swipe-to-delete, record delete + Undo, and intro first-run/skip/replay. Pages were checked for console errors and screenshots reviewed. **Not yet tested on a real iPhone or Android device** (microphone, share sheet, install).

To run locally: `python3 -m http.server` in the project folder, then open `http://localhost:8000/?nointro#/today`. The `/api/intake` endpoint 404s locally, and the app falls back to the on-device parser.

---

## 11. Working conventions for the next model

- Ship changes as a full replacement of the repo contents (or clearly list changed/deleted files), and **bump `sw.js` VERSION**.
- Keep it framework-free and build-free unless Thomas agrees otherwise. Keep scripts as classic scripts in `index.html` order, and add new files to `sw.js` SHELL.
- Use the CSS tokens (`--bg`, `--surface`, `--ink`, `--accent`, `--accent-fill`, `--signal`, `--paper`, `--font-mono`, …). Component overrides for the v1.4 look live in the "v1.4 design layer" at the end of `styles.css`. Never hard-code theme colors in components. Every UI change must work in both light and dark.
- No colored left borders, no textures, no gimmicks. Keep it simple, elegant, mobile-first.
- Ask Thomas before major direction changes. He likes to be given options with a recommendation, then have the work done.
- Update `CHANGELOG.md` and this handoff with each release.
