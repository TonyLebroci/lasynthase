# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static marketing website (in French) for La Synthase, a business offering home-based personal chef,
personal training, and massage therapy services in the Québec City area (and Victoriaville). No
framework, no build step, no package manager — plain HTML/CSS/JS served as static files.
Since 2026-11-05 a small Cloudflare Worker (`src/worker.js`) + D1 database adds a **member area**
(accounts and learning modules) — see « Espace membre » below.

## Repository layout

- `public/` — **everything that is published**. All site files live here.
- `wrangler.jsonc` — Cloudflare Workers deployment config (repo root, not published).
- `src/worker.js` — the member-area Worker (repo root, not published).
- `migrations/` — D1 schema for the member area.
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

## Espace membre (2026-11-05)

Demande de Tony : un bouton qui mène à une page de connexion / création de compte, un espace
avec des modules d'apprentissage, et un premier module interactif sur la zone 2.

- **Serveur** : `src/worker.js`. `wrangler.jsonc` → `run_worker_first: ["/api/*", "/espace*", "/modules/*"]` :
  seules ces adresses passent par le Worker, tout le reste est servi en statique comme avant.
  `/espace*` et `/modules/*` exigent une session ; sinon 302 vers `/connexion.html?retour=…`.
- **Base** : D1 `lasynthase-comptes` (liaison `DB`), schéma dans `migrations/0001_comptes.sql`
  (utilisateurs, sessions, progression, tentatives). Mots de passe en PBKDF2-SHA-256
  100 000 itérations (plafond des Workers) ; la base ne garde que le SHA-256 du jeton de session.
- **Témoins** : `ls_session` (HttpOnly, la vraie session, 30 jours) et `ls_connecte=1` (lisible
  par `main.js`, sans secret : il change « Connexion » en « Mon espace » dans l'en-tête). Ils ne
  sont posés qu'à la connexion : le site reste sans témoin pour les visiteurs, donc toujours sans
  bannière. Décrits dans `confidentialite.html#compte` ; à garder à jour si ça change.
- **Protection** : toute requête qui modifie (POST/PUT/DELETE) doit être en JSON et, si `Origin`
  est présent, de même origine. 8 mauvais mots de passe en 15 min par courriel + IP → 429.
  Pas de réinitialisation de mot de passe par courriel (aucun service d'envoi) : la page renvoie
  à contact@lasynthase.ca.
- **Pages** : `connexion.html`, `espace.html`, `modules/<id>.html` ; feuille `css/espace.css` ;
  scripts `js/compte.js` (connexion, espace), `js/module.js` (moteur générique des modules :
  étapes `<section class="etape" data-titre>`, questions `.question[data-bonne]` ou
  `[data-type="nombre"][data-min][data-max]`, sauvegarde `PUT /api/progression/<id>`),
  `js/<id>.js` pour les outils propres à un module. Ces pages ont `noindex` et ne vont **pas**
  dans le sitemap.
- **Ajouter un module** : copier `modules/zone-2.html`, changer `data-module`, écrire les étapes
  et les questions (contenu tiré du coffre, sources citées, rien d'inventé), ajouter sa carte
  dans `espace.html` avec `data-module` et `data-total` = nombre d'étapes + nombre de questions.
- **Le bouton de l'en-tête** (`a.btn-compte[data-compte]`, juste avant `.nav-toggle`) est dans
  **toutes** les pages : toute nouvelle page doit le reprendre (chemin `../` dans `articles/`
  et `modules/`, `/` dans `404.html`).
- **Essai local** (le serveur Python ne suffit plus pour l'espace membre) :
  ```bash
  npx wrangler d1 migrations apply lasynthase-comptes --local   # une fois
  npx wrangler dev --port 8787                                   # http://127.0.0.1:8787
  ```
- **Mise en ligne** : la base D1 distante existe depuis le 2026-11-05 (identifiant dans
  `wrangler.jsonc`, tables créées). Toute nouvelle migration : l'appliquer avec
  `npx wrangler d1 migrations apply lasynthase-comptes --remote` **avant** de pousser `main`.

## Candidature au projet pilote en endurance (2026-11-11)

Demande de Tony : une vidéo Facebook renvoie vers un questionnaire ; 5 athlètes retenus pour un
pilote de 4 à 6 mois (Olympiatoppen Open, `04 Projets/olympiatoppen-open/Plan directeur.md`). Le
questionnaire bâtit l'objectif comme un coach (GROW, seuil/cible/rêve, objectifs de processus,
WOOP et plans si-alors, échelles d'importance et de confiance) et affiche à la fin un bilan, la
structure de l'objectif, que la personne soit retenue ou non.

- **Page** `public/candidature.html` (`/candidature`, `noindex`, hors sitemap), `css/candidature.css`,
  `js/candidature.js`. Une étape à la fois ; réponses gardées dans le navigateur (localStorage)
  jusqu'à l'envoi ; un champ vide est signalé, pas bloquant (la complétude sert à la sélection).
  Le bilan est construit dans le navigateur, **toujours par `textContent`** (texte de la personne).
- **Aucun champ de santé** (règle de la section « Privacy note ») ; la page le dit.
- **Serveur** : `POST /api/candidature` (sans compte), table D1 `candidatures`
  (`migrations/0002_candidatures.sql`), une ligne par courriel (un nouvel envoi remplace),
  champ piège `site_web`, 5 envois par heure et par IP, 40 Ko au plus.
- **Lire les candidatures** : `node outils/candidatures.mjs` (classement sur 100 : complétude 30,
  clarté 20, réflexion 20, réalisme 15, motivation 15), `--detail <id>`, `--local`. Sortie dans le
  terminal seulement : ne jamais écrire ces réponses dans le coffre ni dans git.
- **Effacement** : candidature non retenue effacée au plus tard 6 mois après l'envoi
  (`confidentialite.html#candidature`).

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

`images/soin.webp` (Le Soin, accueil et services) est une photo **libre de droits d'Unsplash**
(photo 7yeqemd-p90, licence Unsplash), recadrée sur les mains ; original dans
`medias-sources/soin-original-unsplash.jpg`. À remplacer par une photo de Tony en séance dès
qu'il en a une.

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

## Publier un article (règle de Tony, 2026-10-09)

Le site vit sur **`tony.lasynthase.ca`** depuis la bascule (`lasynthase.ca` redirige en 301 vers
lui). La canonique d'un nouvel article pointe vers `https://tony.lasynthase.ca/articles/<nom>`.

Incident du 2026-10-09 : l'article fourni en HTML contenait un commentaire d'intégration qui citait
« `<article class="ls-article">` et `</article>` ». Une extraction par expression régulière a pris
cette occurrence-là, et la note, un second `<style>` et un second `<body>` ont été publiés en haut de
la page. Pour que ça n'arrive plus :

1. **Extraire le contenu d'un fichier fourni après avoir retiré tous ses commentaires** (`<!-- … -->`),
   seulement depuis son `<body>`, et **exiger exactement un** bloc `<article>`. Ne jamais prendre
   « tout ce qui est entre deux balises » sur le fichier brut.
2. **Ne rien changer au texte** : comparer le texte visible de la page produite à celui de l'original
   (doit être identique).
3. **`python3 outils/verifier-pages.py`** doit répondre « aucun problème ». Il est lancé
   automatiquement avant chaque commit par `outils/hooks/pre-commit` ; après un nouveau clone,
   l'activer avec `git config core.hooksPath outils/hooks`.
4. **Regarder la page entière**, en commençant par **le haut** (date, titre, premier paragraphe),
   en local puis en ligne après le déploiement, sur ordinateur et à 390 px de large.
5. Carte en tête de `articles.html`, URL dans `sitemap.xml`.

Les styles propres à un article (figures, encadrés) vont dans un `<style>` du `<head>` de la page,
limités à une classe (`.ls-article`), aux couleurs de `:root`. Le site n'a pas de mode sombre : ne
pas en importer.

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

This is why the site sets **no cookies for visitors** and needs **no consent banner** (the only
cookies are the member-area session cookies, set only when someone logs in — see « Espace membre »). Putting the
`<iframe>` elements back into the HTML would send every visitor's IP to Google on page load and
create a Law 25 consent obligation. Keep the pattern.

Any new third-party embed (chat widget, ad pixel, booking tool) must follow the same pattern
**and** be added to `public/confidentialite.html`.

## Adding a page — checklist

The site has no template engine, so a new page needs four things:

1. Copy the shell (head, header/nav, footer) from an existing page — they are duplicated in every
   file, there is no include.
2. Set a unique `<title>`, `<meta name="description">`, and a
   `<link rel="canonical" href="https://tony.lasynthase.ca/…">` pointing at the extensionless URL.
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

## Animations (2026-11-05)

Couche d'agrément à la fin de `css/style.css` (« Animations et effets ») et de `js/main.js` :
apparitions au défilement (`.a-reveler`, posées par le script), titres mot par mot, héros de
l'accueil (zoom lent, lettres, parallaxe), bandeau défilant sobre sous le héros. Règles :
rien n'est caché sans JavaScript (`html.anim`), tout s'arrête avec `prefers-reduced-motion`,
et **aucune transformation sur `#triptyquePin` ni ses parents** (casserait l'épinglage GSAP).
Un élément entièrement masqué par `clip-path` n'est jamais vu par IntersectionObserver : le
masque du « rideau » est sur l'`img`, pas sur son cadre.
