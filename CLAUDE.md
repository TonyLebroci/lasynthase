# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static marketing website (in French) for La Synthase, a business offering home-based personal chef,
personal training, and massage therapy services in the Québec City area (and Victoriaville). No
framework, no build step, no package manager — plain HTML/CSS/JS served as static files.

## Development

There is no build/lint/test tooling in this repo. To preview the site locally, serve the directory
with any static file server, e.g.:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`. Since pages use relative links (`index.html`,
`services.html#chef`, etc.) and no absolute routing, opening the files directly (`file://`) also
works for quick checks, but prefer a local server to match production behavior.

## Architecture

- Three hand-authored pages, each a full standalone HTML document with duplicated header/nav and
  footer markup: `index.html` (home), `services.html`, `contact.html`. There is no templating —
  shared markup (header, nav, footer) must be edited in all three files when changed.
- `css/style.css` — single global stylesheet for all pages. Uses CSS custom properties defined in
  `:root` (`--charcoal`, `--cream`, `--sage`, `--terracotta`, etc.) for the color palette, plus
  `--font-serif` / `--font-sans` for typography. Layout is section-based (`.hero`, `.pillars`,
  `.approach`, `.service-block`, `.contact-layout`, etc.), each styled independently; responsive
  breakpoints at 900px and 720px near the end of the file collapse grids to single columns and
  swap the nav for a hamburger menu.
- `js/main.js` — single small script, no build/bundling. Handles two behaviors: toggling the
  `.open` class on `.site-header` for the mobile nav (`.nav-toggle` button), and showing a success
  message on `contact.html` when the page loads with `?envoye=1` in the URL (see below).
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
  of all three files — update all occurrences together if they change.
