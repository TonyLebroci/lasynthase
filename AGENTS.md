# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
- `public/css/style.css` — single global stylesheet for all pages. Uses CSS custom properties
  defined in `:root` (`--charcoal`, `--cream`, `--sage`, `--terracotta`, etc.) for the color
  palette, plus `--font-serif` / `--font-sans` for typography. Layout is section-based (`.hero`,
  `.pillars`, `.approach`, `.service-block`, `.contact-layout`, etc.), each styled independently;
  responsive breakpoints at 900px and 720px near the end of the file collapse grids to single
  columns and swap the nav for a hamburger menu.
- `public/js/main.js` — single small script, no build/bundling. Handles two behaviors: toggling
  the `.open` class on `.site-header` for the mobile nav (`.nav-toggle` button), and showing a
  success message on `contact.html` when the page loads with `?envoye=1` in the URL (see below).
- Services content is anchor-addressable: `services.html` has `id="chef"`, `id="entrainement"`,
  `id="masso"` sections, linked to from other pages via `services.html#chef` etc.

## Contact wiring

- The contact form in `contact.html` posts to FormSubmit.co (`action="https://formsubmit.co/..."`),
  which relays submissions by email — no backend of our own. `_next` redirects back to
  `https://lasynthase.ca/contact.html?envoye=1`, and `js/main.js` shows a success message when it
  detects that query param. The target inbox must click the confirmation email FormSubmit sends on
  first submission before delivery starts working.
- The map in `contact.html` (`.map-block`) is a Google Maps `output=embed` iframe centered on
  `ll=46.86,-71.27&z=11`, chosen to show the Québec City–to–Lac-Beauport service area without
  pinning an exact address (no fixed storefront — services are delivered at clients' homes).
- Contact email/phone/service-area text appear identically in the header, footer, and contact page
  of all files — update all occurrences together if they change.

## Privacy note (Loi 25, Québec)

Massage therapy and dietary sensitivities are health information. Keep web forms minimal — name,
email, phone, free-text message — and leave detailed intake to an external booking tool that
carries the compliance burden. Do not add health-related fields to the FormSubmit form.
