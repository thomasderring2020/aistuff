# Rolo — prototype

A modern, mobile-first rolodex. Plain HTML/CSS/JS — no build step, no server, no accounts.
Everything (contacts, notes, photos) is stored in the browser on the user's device (IndexedDB).

## Deploy

**Netlify (easiest, ~1 minute)**
1. Go to https://app.netlify.com/drop and sign in.
2. Drag the whole `rolo` folder onto the page.
3. You get a live `https://….netlify.app` link. Rename it under *Site configuration → Change site name*.
To update later: *Deploys → drag the folder again*.

**Vercel**
1. `npm i -g vercel` then run `vercel` inside the `rolo` folder (Framework: *Other*, no build command, output dir `.`).
   Or push the folder to GitHub and import the repo at https://vercel.com/new.

Both hosts serve HTTPS, which Rolo needs for install-to-home-screen, the offline cache and the passcode.

## Project layout
```
index.html            app shell
styles.css            all styles + 3 themes (ledger, desk, forest)
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
fonts/                Inter + Fraunces (SIL OFL)
vendor/xlsx.full.min.js  SheetJS, loaded only when importing Excel (Apache-2.0)
```

## Notes
- Kids' ages: the age is saved with the date it was entered and rolls forward each year.
- iPhone Safari may clear data for sites not opened in ~7 days unless Rolo is added to the Home Screen; the app nudges users to install and to back up.
- The passcode is a privacy screen, not encryption.
- Roadmap: business card scanning, voice memos, transcript summaries, bring-your-own-AI, accounts & sync.
