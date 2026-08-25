# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static marketing website (in French) for La Synthase, a business offering home-based personal chef,
personal training, and massage therapy services in the Québec City area (and Victoriaville). No
framework, no build step, no package manager — plain HTML/CSS/JS served as static files.

## Repository layout

- `public/` — **everything that is published**. All site files live here.
- `wrangler.jsonc` — Cloudflare Workers deployment config (repo root, not published).
- `CLAUDE.md` / `AGENTS.md` — agent guidance (repo root, not published).

Anything placed inside `public/` becomes publicly reachable. Never put notes, credentials,
or drafts there.

## Development

There is no build/lint/test tooling in this repo. To preview the site locally, serve the
`public/` directory with any static file server, e.g.:

```bash
python3 -m http.server 8765 --directory public
```

Then open `http://localhost:8765/index.html`. Since pages use relative links (`index.html`,
`services.html#chef`, etc.) and no absolute routing, opening the files directly (`file://`) also
works for quick checks, but prefer a local server to match production behavior.

## Deployment

Hosted on **Cloudflare Workers** (static assets), deployed automatically from the `main` branch
via the GitHub integration. There is no build command — `public/` is uploaded as-is.

`wrangler.jsonc` sets `html_handling: "auto-trailing-slash"` (so `/services` also resolves to
`services.html`) and `not_found_handling: "404-page"` (so unknown URLs render `public/404.html`).
Internal links use explicit `.html` extensions throughout; keep it that way for consistency.

DNS and the domain `lasynthase.ca` are managed in the same Cloudflare account. The domain is
registered at GoDaddy for now.

## Images

Every photo is served as a **single `.webp` file in `public/images/`**. The originals live
in **`medias-sources/`** at the repo root — outside `public/`, so they are never served.
Never reference a `.jpg` or `.png` from the site markup.

```html
<img src="images/nom.webp" alt="…" width="1600" height="999" loading="lazy" decoding="async" />
```

Always set `width`/`height` to the real pixel dimensions — it prevents the page from
jumping as images load. Use `loading="lazy"` for anything below the fold. The three hero
slides on the home page are above the fold instead: the visible one carries
`fetchpriority="high"`, the other two `fetchpriority="low"` so they load without competing.

To add or replace a photo: drop the original in `medias-sources/`, then run

```bash
python3 outils/convertir-images.py medias-sources/ma-photo.jpg 1400
```

The second argument is the max width (1920 for hero slides, 1600 for large section
images, 900 for carousel portraits). The script prints the `width`/`height` to paste
into the `<img>` tag.

**Why not AVIF.** It was tried and reverted on 2026-08-25. Pillow's AVIF encoder writes
files without the `pixi` box, and Chrome refuses to decode them inside a page — `img.decode()`
never settles and nothing paints, even though the same file renders fine when opened
directly. No conforming AVIF encoder is available in this environment (the ffmpeg build
has no AVIF muxer). If you revisit this, use a real `avifenc`/libavif build, verify the
output has a `pixi` box, and test it **in the page**, not just standalone. AVIF would save
roughly a further 35% over WebP.

## Architecture

- Six hand-authored top-level pages in `public/`, each a full standalone HTML document with
  duplicated header/nav and footer markup: `index.html` (home), `services.html`, `a-propos.html`
  (about), `articles.html` (article listing), `contact.html`, `immersion.html`
  (Immersion Signature). There is no templating — shared markup (header, nav, footer) must be
  edited in all these files when changed, plus `public/404.html` and every page in
  `public/articles/`.
- `public/404.html` — error page, same shell as the other pages but with **root-relative** links
  (`/index.html`, `/css/style.css`), since it can be served from any URL depth. Keep it in sync
  with the header/footer of the other pages.
- `public/articles/` holds one standalone HTML page per article (relative links use `../`).
  `articles/modele.html` is a commented template: to publish, duplicate it, fill it in following
  the numbered comments, then add an `<article class="article-card">` block to the grid in
  `articles.html` (newest first — see the comment block there).
- `medias-sources/` — original full-resolution photos, kept out of `public/` so they are
  never served. `outils/convertir-images.py` turns one into the AVIF/WebP pair.
- `public/css/style.css` — single global stylesheet for all pages. Uses CSS custom properties
  defined in `:root` (`--charcoal`, `--cream`, `--sage`, `--terracotta`, etc.) for the color
  palette, plus `--font-serif` / `--font-sans` for typography. Layout is section-based (`.hero`,
  `.pillars`, `.approach`, `.service-block`, `.contact-layout`, etc.), each styled independently;
  responsive breakpoints at 900px and 720px near the end of the file collapse grids to single
  columns and swap the nav for a hamburger menu.
- `public/js/main.js` — single small script, no build/bundling. Handles: the mobile nav toggle
  (`.open` on `.site-header`), the full-screen hero slideshow on the home page, the photo
  carousel on `a-propos.html`, the **third-party click-to-load** blocks (see below), and the
  **submission confirmation modal** shown when the page loads with `?envoye=1`.
- Services content is anchor-addressable: `services.html` has `id="chef"`, `id="entrainement"`,
  `id="masso"` sections, linked to from other pages via `services.html#chef` etc.

## Contact wiring

- The contact form in `contact.html` posts to FormSubmit.co (`action="https://formsubmit.co/..."`),
  which relays submissions by email — no backend of our own. `_next` redirects back to
  `https://lasynthase.ca/contact.html?envoye=1`, and `js/main.js` shows a success message when it
  detects that query param. The target inbox must click the confirmation email FormSubmit sends on
  first submission before delivery starts working.
- The booking calendar and the map on `contact.html` are Google embeds. They are **not** in the
  HTML as iframes — see "Third-party embeds" below. The map is centered on `ll=46.86,-71.27&z=11`,
  chosen to show the Québec City service area without pinning an exact address (no storefront —
  services are delivered at clients' homes).
- The confirmation after a submission is a **centred modal**, not an inline note. It is built in
  `js/main.js` (`afficherConfirmation`), closes on the X, the button, Escape or a backdrop click,
  locks body scroll while open, and carries `role="dialog"` / `aria-modal`. It never dismisses
  itself — that is deliberate, so the visitor cannot miss it.
- Contact email/phone/service-area text appear identically in the header, footer, and contact page
  of all files — update all occurrences together if they change.

## Third-party embeds — do not undo this

The Google calendar and map on `contact.html` are **loaded only when the visitor clicks**. In the
HTML they are `<div class="tiers-invite" data-tiers="…" data-tiers-titre="…">` placeholders that
explain what will happen; `js/main.js` builds the `<iframe>` on click and swaps it in. The CSS
lives under `.tiers-invite`.

This is why the site sets **no cookies at all** and needs **no consent banner**. Putting the
`<iframe>` elements back into the HTML would send every visitor's IP to Google on page load and
create a Law 25 consent obligation. Keep the pattern.

Any new third-party embed (chat widget, ad pixel, booking tool) must follow the same pattern
**and** be added to `public/confidentialite.html`.

## Adding a page — checklist

The site has no template engine, so a new page needs four things:

1. Copy the shell (head, header/nav, footer) from an existing page — they are duplicated in every
   file, there is no include.
2. Set a unique `<title>`, `<meta name="description">`, and a
   `<link rel="canonical" href="https://lasynthase.ca/…">` pointing at the extensionless URL.
3. Add the URL to `public/sitemap.xml`.
4. Add the page to the footer nav in **every** file if it belongs there.

`public/robots.txt` only carries the `Sitemap:` line — Cloudflare injects its own managed rules
(AI-crawler blocking, `search=yes`) ahead of the file, so a second `User-agent: *` group here
would just duplicate theirs.

## Privacy note (Loi 25, Québec)

Massage therapy and dietary sensitivities are health information. Keep web forms minimal — name,
email, phone, free-text message — and leave detailed intake to the in-person consultation, which
carries its own separate consent. **Never add a health-related field to the web form.**

`public/confidentialite.html` is the published privacy policy, required by Law 25 and linked from
every footer. It names the third parties that actually touch visitor data — FormSubmit, Google
(calendar and map), Cloudflare, Apple — the retention periods, and the right to access, correct or
withdraw. **If you add, remove or replace any third party, update that page in the same commit.**
The short notice under the form satisfies the separate obligation to inform at the moment of
collection; keep it there.
