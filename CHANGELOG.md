# Changelog

## 1.4.0 — new look
- Clean, technical style inspired by Ironclad Labs, Chokepoint Watch and Gaia: warm off-white canvas (#F6F7F4), hairline borders, small radii, no shadows
- Type: Geist for UI, Geist Mono for labels, numbers and data (uppercase, letter-spaced)
- Ink-black primary actions; one accent (deep green in light, soft teal in dark); orange reserved for signals (overdue, going cold, delete)
- Neutral avatars and outlined group tags with a small color square; neutral rolodex divider tabs
- Details: corner tick marks on key panels, dot-matrix fields (Today header, rolodex floor), hatched divider
- New app icon; intro tour and MP4 re-rendered in the new style

## 1.3.0
- New ~27-second intro tour: Rolodex, search, records with auto-logging, Quick intake and the Today view, ending with "Import my contacts" / "Explore Rolo"
- Plays once on first open (skippable, tap to pause); replay any time from Settings → Watch the intro
- Follows light/dark mode; reduced-motion users jump straight to the end card

## 1.2.0
- Quick intake on every record: speak or type a note, Rolo sorts it into next step (with due date), hobbies, lunch/dinner spots, family, pets, birthday and "Don't forget", then you review before saving. Optional AI sorting through a Vercel function when ANTHROPIC_API_KEY is set
- Swipe a contact left in List view to delete it (with Undo)
- Delete button at the bottom of every record (with Undo)
- Removed all colored left borders/stripes from cards and boxes
- Dark mode accent is now teal; light mode stays indigo
- Contact rows no longer nest links inside links (fixes Call/Text buttons in lists)

## 1.1.0
- New look: Slate + Indigo, with Light, Dark and Match-device modes (Settings → Look)
- Removed the paper texture; cards are clean and flat. Typeface is now Inter throughout
- Calls, texts and emails started from Rolo are logged automatically, with "Add note" and "Undo" (can be turned off in Settings)
- Personal: favorite lunch spot and favorite dinner spot (also in the pre-call brief, search, import/export)
- Rolodex scroll direction reversed (scroll or pull down to flip forward)
- New share icon (box with an up arrow)
- New app icon to match the palette
- Removed: netlify.toml, Fraunces font files
