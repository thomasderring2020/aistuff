# Rolo — prototype

A modern, mobile-first rolodex. Plain HTML/CSS/JS — no build step, no server, no accounts.
Everything (contacts, notes, photos) is stored in the browser on the user's device (IndexedDB).

## Deploy (Vercel)
The site is connected to Vercel through GitHub. To ship a change:
1. Replace the files in the repo with the new ones (keep `index.html` at the repo root).
2. Bump `VERSION` in `sw.js` so installed copies pick up the update.
3. Commit and push. Vercel redeploys automatically.

Vercel settings: Framework *Other*, no build command, output directory `.`.

## Project layout
```
index.html            app shell
styles.css            all styles + light/dark themes (Slate + Indigo)
sw.js                 offline cache — bump VERSION on each deploy
manifest.webmanifest  install-as-app settings
js/util.js            helpers, sheets, toasts, image compression
js/db.js              IndexedDB storage
js/model.js           data model, ages, warmth, dates, search, duplicates
js/sample.js          25 fictional sample contacts (first run only)
js/rolodex.js         the 3D flipping wheel
js/views.js           Today, Rolo (wheel + list), Search
js/record.js          contact record page + its sheets
js/editor.js          add / edit form
js/share.js           share card (vCard / text / image), print cards
js/importer.js        phone picker, .vcf / CSV / Excel import, export, backup
js/settings.js        settings, groups, themes, passcode, install help
js/app.js             router + boot
fonts/                Inter (SIL OFL)
vendor/xlsx.full.min.js  SheetJS, loaded only when importing Excel (Apache-2.0)
```

## Notes
- Tapping Call/Text/Email in Rolo logs the touch automatically (toggle in Settings). Browsers can't read the phone's call or text history.
- Kids' ages: the age is saved with the date it was entered and rolls forward each year.
- iPhone Safari may clear data for sites not opened in ~7 days unless Rolo is added to the Home Screen; the app nudges users to install and to back up.
- The passcode is a privacy screen, not encryption.
- Roadmap: business card scanning, voice memos, transcript summaries, bring-your-own-AI, accounts & sync.
