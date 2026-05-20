# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Template for one-page digital event invitations (XV años / casamientos). Each new event is created by cloning this template (GitHub "Use this template"), customizing per-event content, and deployed as a subfolder of `momentuminvitaciones.com` on Hostinger (SSH/FTP). Final URL pattern: `https://momentuminvitaciones.com/<NombreEvento_DDMMAA>/`.

`PROCESO.md` is the authoritative end-to-end playbook for creating an event from this template. `BRIEF.md` is the per-project design brief that gets handed to an LLM together with `theme.css` to generate the visual theme.

## Commands

```bash
npm install                # first time only
npm test                   # Playwright tests (auto-starts http-server on :5500)
npm run preview            # regenerate preview.png + preview-std.png (1200×630 OG images)
npm run deploy             # rsync dry-run to Hostinger (reads .env)
npm run deploy -- --go     # actually upload
```

Playwright auto-starts a static server at `http://localhost:5500` via the `webServer` block in `playwright.config.js` (reuses an existing Live Server on that port if open). Single worker so form state doesn't overlap between tests.

Run a single test: `npx playwright test tests/form.spec.js -g "<name fragment>"`.

No build step, no linter, no bundler — vanilla HTML/CSS/JS served statically.

## Architecture

Strict file ownership rules — **respect them**:

| File | Role | Edit per-event? |
|------|------|-----------------|
| `app.js` | All behavior + a `CONFIG` block at the top with every per-event value (names, date, venue, webhook URL, alias/CBU, `tipo`, `gallery`) | Yes — edit `CONFIG`, rarely the logic |
| `index.html` | **Casamiento-only** full invitation: structural content (itinerary, gallery tiles, dress code, RSVP form, OG meta tags). For XV events use `teen.html` and `adulto.html` instead. | Yes (casamiento) |
| `adulto.html` | XV adulto full invitation (slug `/adulto`). Same structure as `index.html` with a hardcoded `#heroKickerAdulto` marker that drives the kicker copy and the RSVP payload's `teen_adulto = 'adulto'`. | Yes (XV) |
| `teen.html` | XV teen full invitation (slug `/teen`). Mirror of `adulto.html` with marker `#heroKickerTeen` → `teen_adulto = 'teen'` in the RSVP payload. | Yes (XV) |
| `save-the-date.html` | Trimmed-down sibling page — only gate + music + hero. Shares all assets with the full invitation HTMLs | Yes (per event) |
| `despues-12.html` | XV dance-only sibling page (slug `/despues-12`) — for guests invited only to the post-midnight dance segment, not to the dinner. Like the full XV invitations but without Itinerario, Galería, and the `restricciones alimentarias` RSVP field (no dinner means no menu choice). Marker `#heroKickerD12` → `teen_adulto = 'despues-12'`. Context: Argentine XV parties run ~9 pm–5 am; 9 pm–midnight is dinner, midnight–5 am is dance. | Yes (per event) |
| `panel.html` | XV-only private panel (slug `/panel`) — four buttons that copy a short WhatsApp-ready message + URL for each variant (`adulto`, `teen`, `save-the-date`, `despues-12`) to the clipboard. Standalone page; does not load `app.js`. URLs are derived from `location.origin + pathname` at runtime, so the file needs no per-event edits beyond optional copy tweaks. `noindex,nofollow`, public but unlisted. | Rarely (only to tweak copy) |
| `theme.css` | Palette, fonts, decorative styles. Imports Google Fonts, defines CSS custom properties (`--accent`, `--font-display`, etc.) consumed by `styles.css` | Yes — fully replaced per event |
| `styles.css` | Structural layout (grid, spacing, components). **Do not modify per-event.** It reads variables from `theme.css` | **No** |
| `.htaccess` | Per-project rewrites so `/save-the-date`, `/despues-12`, `/teen`, `/adulto` and `/panel` serve their respective `.html` files (clean URLs). Coexists with the WordPress install at the root of `momentuminvitaciones.com` because mod_rewrite per-directory doesn't inherit parent rules by default. | **No** |

For an **XV event** the per-event folder typically ships `adulto.html` + `teen.html` + `panel.html` (+ `save-the-date.html`, optionally `despues-12.html`) and **drops `index.html`** before deploy (the root serves nothing → 404). For a **casamiento** the folder ships `index.html` (+ `save-the-date.html`) and drops `adulto.html`, `teen.html`, `despues-12.html`, `panel.html`.

The DOM is wired by `id` from `app.js`: a `set(id, val)` helper injects `CONFIG` values into elements like `gateTitle`, `heroName`, `lugarSalon`, `regalosCbu`, etc. Adding a new dynamic field means adding the `id` in HTML, the value in `CONFIG`, and a `set()` call.

The gallery is the only list-shaped per-event field: `CONFIG.gallery` is an array of `{ src, alt }`. `initGallery()` renders the tiles into `#galleryGrid`, and hides `#gallerySection` entirely if the array is empty. The save-the-date page has no `#galleryGrid`, so `initGallery()` early-returns.

`CONFIG.tipo` (`'xv' | 'casamiento'`) drives small conditional bits — most notably the hero kicker text on `index.html` (casamiento) and whether `teen_adulto` is included in the RSVP payload. The teen/adulto split is handled by **two sibling HTML files in the same folder** (`teen.html` and `adulto.html`), each carrying a marker (`#heroKickerTeen` / `#heroKickerAdulto`) that `app.js` reads to set the payload value. One folder per event, two URL endpoints. No more folder duplication.

### RSVP flow
`initForm()` in `app.js` does manual validation (form has `novalidate`), POSTs JSON to `CONFIG.webhookUrl` (a custom n8n webhook that appends each submission to a Google Sheet), and toggles the `#formSuccess` block on success. Multi-value `restricciones` checkboxes are collapsed into a single comma-joined string. `event_id`, `event_name`, and (for XV) `teen_adulto` are appended server-side-style from `CONFIG`. `teen_adulto` drives the dinner menu assignment downstream and is inferred from the DOM marker present in the loaded HTML: `#heroKickerD12` → `'despues-12'`, `#heroKickerTeen` → `'teen'`, `#heroKickerAdulto` → `'adulto'`. Casamiento (`index.html`) has no marker and omits the field. The n8n workflow + Sheet setup is documented externally — see the link in `PROCESO.md` Paso 4.

### Entry gate + music
The page opens with a full-screen `#entryGate` overlay. Clicking it (`initGate`) is what kicks off `audio.play()` — required because browsers block autoplay without a user gesture. `#musicToggle` toggles pause/resume after that.

## Theme workflow

Themes are produced by an external LLM, not by hand-editing here:

1. Fill in `BRIEF.md` for the event.
2. Send BRIEF + `theme.css` to an LLM with the instruction "modify `theme.css` only".
3. Replace `theme.css` with the result.

If asked to design a theme directly in this repo, keep changes inside `theme.css` (palette vars, `--font-*`, decorative additions) — do not touch `styles.css` or the HTML structure.

## Per-event assets (not in template, added per project)

`music.mp3` (compress with `ffmpeg -i input.mp3 -ac 1 -map_metadata -1 -vn music.mp3`), gallery photos referenced from the invitation HTML, and the OG preview images (see below). Favicons (`favicon-32.png`, `favicon-180.png`) are the Momentum logo and stay as-is.

## OG preview generation

`npm run preview` runs `scripts/generate-preview.js`: spins up an inline static server on port 5510, opens each page in Playwright at 1200×630, removes the entry gate, kills animations/transitions, waits for fonts, and writes:
- `preview.png` — casamiento full-invitation hero (from `index.html`).
- `preview-adulto.png` — XV adulto hero (from `adulto.html`).
- `preview-teen.png` — XV teen hero (from `teen.html`).
- `preview-std.png` — save-the-date hero with the date + countdown hidden via `visibility: hidden` (so the layout stays put but the invitee only learns the date inside the invitation).
- `preview-d12.png` — despues-12 hero (XV dance-only invitation, post-midnight).

Per event you only need the previews for the HTMLs you actually deploy (XV → `preview-adulto.png` + `preview-teen.png` + optionally `preview-std.png` / `preview-d12.png`; casamiento → `preview.png` + optionally `preview-std.png`).

After generating, uncomment the `<meta property="og:image">` tag in each HTML file to point at the corresponding PNG. Regenerate whenever the theme or hero copy changes.

## Save the date

When the user says "create the save the date" (or "crear el save the date" in Spanish), they mean: **edit the existing `save-the-date.html` for this event**. It's already a stripped-down sibling of `index.html` containing only the entry gate, music toggle, and hero section (kicker + name + date + countdown). It shares all assets with the full invitation (`app.js`, `styles.css`, `theme.css`, `music.mp3`, favicons) — do not duplicate them.

Per-event edits in `save-the-date.html`: the meta tags (`og:title`, `og:description`, `og:image` — may differ from the full invitation), and the hardcoded kicker text inside `<span id="heroKickerStd">` (defaults to "Save the date"). The name, date, and countdown auto-populate from `CONFIG` in `app.js` because the relevant `id`s (`heroName`, `heroDate`, `days`/`hours`/`minutes`/`seconds`) are identical to the full invitation.

The kicker `id` is intentionally `heroKickerStd` (not `heroKicker`) so that `app.js`'s automatic kicker override (which sets "Mis Quince Años" / "Los invitan a celebrar" based on `CONFIG.tipo`) does NOT overwrite the save-the-date kicker.

URL convention: `https://momentuminvitaciones.com/<event-folder>/save-the-date` (no `.html` extension, handled by the per-project `.htaccess` rewrite).

## Deploy & cache-busting

Static files served from a Hostinger subfolder under WordPress at the root. The hosting has LiteSpeed cache with aggressive expirations (CSS/JS 1 month, images 1 year). Cache-busting convention: `<link>`/`<script>` references in HTML and `CONFIG.musicUrl` carry a `?v=N` query string. **Bump that number on every redeploy that changes the referenced asset** or invitees may see stale versions for weeks. All HTML files shipped with the event (`index.html` / `adulto.html` / `teen.html` / `save-the-date.html` / `despues-12.html` / `panel.html`) must be bumped in sync since they share assets.
