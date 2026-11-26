/* Serveur de l'espace membre de La Synthase (2026-11-05).
 *
 * PORTE UNIQUE (2026-11-25, demande de Tony) : l'espace est réservé aux athlètes que Tony entraîne et
 * qui le paient. Plus aucune création de compte ni mot de passe sur le site : la personne se connecte
 * par Cloudflare Access (courriel + code), la même connexion que l'app d'entraînement
 * (app.lasynthase.ca). Tony ajoute un athlète à la liste d'Access ; personne d'autre n'entre.
 * Le Worker vérifie le jeton signé d'Access (en-tête Cf-Access-Jwt-Assertion : signature RS256,
 * audience, émetteur, expiration) et en tire le courriel. Fermé par défaut : sans ACCESS_EQUIPE et
 * ACCESS_AUD, ou sans jeton valide, personne n'est reconnu. Le compte (nom, progression) est créé à la
 * première visite d'une personne admise par Access. Les routes d'inscription, de connexion et de mot de
 * passe répondent 410. Le texte d'origine ci-dessous décrit l'ancien fonctionnement.
 *
 * Le site reste statique : Cloudflare sert public/ directement. Ce Worker ne
 * reçoit que les adresses listées dans wrangler.jsonc (run_worker_first) :
 *   /api/*       comptes, connexion, progression dans les modules ;
 *                mot de passe oublié (lien par courriel, envoyé par Resend) ;
 *                candidature au projet pilote (POST /api/candidature, sans compte)
 *   /espace*     page du compte          } réservées aux personnes connectées :
 *   /modules/*   modules d'apprentissage } sinon, renvoi vers la connexion
 *
 * Base de données : D1 (liaison DB), schéma dans migrations/.
 * Mots de passe : PBKDF2-SHA-256, 100 000 itérations (plafond des Workers),
 * sel de 16 octets. Session : jeton aléatoire de 32 octets dans un témoin
 * HttpOnly ; la base n'en garde que le SHA-256.
 * Mot de passe oublié (2026-11-19) : lien par courriel, valide 30 minutes et
 * une seule fois ; la base ne garde que le SHA-256 du jeton. Envoi par Resend
 * (secret RESEND_API_KEY). Sans ce secret, la demande répond 503, sauf en
 * local où le lien s'affiche dans la console de wrangler dev.
 */

const DUREE_SESSION_MS = 30 * 24 * 3600 * 1000;
const TEMOIN = "ls_session";
// Témoin lisible par le script des pages (aucun secret) : il sert seulement à
// afficher « Mon espace » au lieu de « Connexion » dans l'en-tête.
const TEMOIN_INDICE = "ls_connecte";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await api(request, env, url, ctx);
      if (url.pathname.startsWith("/espace") || url.pathname.startsWith("/modules/")) {
        return await pageProtegee(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return json({ erreur: "Erreur du serveur. Réessayez dans un instant." }, 500);
    }
  },
};

/* ---------- Pages réservées ---------- */

async function pageProtegee(request, env, url) {
  const utilisateur = await utilisateurCourant(request, env);
  // En ligne, Cloudflare Access arrête la personne avant le Worker. Arriver ici sans identité veut dire
  // qu'Access ne protège pas cette adresse : on refuse, on n'ouvre jamais par défaut.
  if (!utilisateur) return reserve();
  const brute = await env.ASSETS.fetch(request);
  // Les liens vers l'app d'entraînement (a[data-app]) suivent son adresse (variable URL_APP).
  const urlApp = /^https:\/\/[a-z0-9.-]+$|^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(env.URL_APP || "") ? env.URL_APP : URL_APP_PAR_DEFAUT;
  // Seulement sur les pages HTML : une fiche PDF passe telle quelle (relecture de Gemini, 2026-11-25).
  const estHtml = (brute.headers.get("Content-Type") || "").includes("text/html");
  const reecrite = estHtml
    ? new HTMLRewriter().on("a[data-app]", {
        element(e) { e.setAttribute("href", urlApp + (e.getAttribute("data-app") || "/tableau/parcours")); },
      }).transform(brute)
    : brute;
  const r = new Response(reecrite.body, reecrite);
  r.headers.set("Cache-Control", "private, no-store");
  r.headers.set("X-Robots-Tag", "noindex");
  // Indice sans secret pour l'en-tête du site (« Mon espace » au lieu de « Connexion »).
  r.headers.append("Set-Cookie", `${TEMOIN_INDICE}=1; Path=/; Secure; SameSite=Lax; Max-Age=${Math.floor(DUREE_SESSION_MS / 1000)}`);
  return r;
}

const URL_APP_PAR_DEFAUT = "https://app.lasynthase.ca";

function reserve() {
  const html =
    '<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>Espace réservé — La Synthase</title>' +
    "<style>body{margin:0;font-family:Arial,sans-serif;background:#f7f4ee;color:#2b2b2b}main{max-width:34rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.55}a{color:#5f7a61}</style>" +
    "</head><body><main><h1>Espace réservé</h1><p>Cet espace est réservé aux athlètes qu'Antoine accompagne.</p>" +
    '<p><a href="/connexion.html">Comment y accéder</a> · <a href="/index.html">Retour au site</a></p></main></body></html>';
  return new Response(html, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

/* ---------- API ---------- */

async function api(request, env, url, ctx) {
  const methode = request.method;
  const chemin = url.pathname;

  if (methode !== "GET" && !requeteDeConfiance(request, url)) {
    return json({ erreur: "Requête refusée." }, 403);
  }

  // Porte unique (2026-11-25) : plus de création de compte ni de mot de passe sur le site.
  if (["/api/inscription", "/api/connexion", "/api/mot-de-passe/oubli", "/api/mot-de-passe/nouveau"].includes(chemin)) {
    return json({ erreur: "L'espace est réservé aux athlètes d'Antoine. La connexion se fait par courriel, sans mot de passe." }, 410);
  }
  if (chemin === "/api/deconnexion" && methode === "POST") return deconnexion(request, env);
  if (chemin === "/api/moi" && methode === "GET") return moi(request, env);
  if (chemin === "/api/compte" && methode === "DELETE") return supprimerCompte(request, env);
  if (chemin === "/api/candidature" && methode === "POST") return recevoirCandidature(request, env);

  const m = chemin.match(/^\/api\/progression\/([a-z0-9-]{1,40})$/);
  if (m && methode === "PUT") return enregistrerProgression(request, env, m[1]);

  return json({ erreur: "Introuvable." }, 404);
}

// Protection contre les requêtes venues d'un autre site : JSON obligatoire
// (un formulaire d'un autre site ne peut pas en envoyer sans autorisation)
// et, si le navigateur l'indique, même origine.
function requeteDeConfiance(request, url) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.startsWith("application/json")) return false;
  const origine = request.headers.get("Origin");
  return !origine || origine === url.origin;
}

async function deconnexion(request, env) {
  const jeton = lireTemoin(request, TEMOIN);
  if (jeton) await env.DB.prepare("DELETE FROM sessions WHERE jeton = ?").bind(await sha256(jeton)).run();
  return json({ ok: true, sortie: "/cdn-cgi/access/logout" }, 200, temoinsEffaces());
}

async function moi(request, env) {
  const u = await utilisateurCourant(request, env);
  if (!u) return json({ connecte: false }, 401, temoinsEffaces());
  const lignes = await env.DB.prepare("SELECT module, etat, maj FROM progression WHERE utilisateur_id = ?")
    .bind(u.id).all();
  const progression = {};
  for (const l of lignes.results || []) {
    try { progression[l.module] = Object.assign(JSON.parse(l.etat), { maj: l.maj }); } catch (e) { /* ignoré */ }
  }
  return json({ connecte: true, nom: u.nom, courriel: u.courriel, progression });
}

async function enregistrerProgression(request, env, module) {
  const u = await utilisateurCourant(request, env);
  if (!u) return json({ erreur: "Session expirée. Reconnectez-vous." }, 401);
  const texte = await request.text();
  if (texte.length > 20000) return json({ erreur: "Données trop volumineuses." }, 413);
  let etat;
  try { etat = JSON.parse(texte); } catch (e) { return json({ erreur: "Données invalides." }, 400); }
  if (!etat || typeof etat !== "object" || Array.isArray(etat)) return json({ erreur: "Données invalides." }, 400);
  await env.DB.prepare(
    "INSERT INTO progression (utilisateur_id, module, etat, maj) VALUES (?, ?, ?, datetime('now')) " +
    "ON CONFLICT(utilisateur_id, module) DO UPDATE SET etat = excluded.etat, maj = excluded.maj"
  ).bind(u.id, module, JSON.stringify(etat)).run();
  return json({ ok: true });
}

// Efface le compte du site (nom, progression). Plus de mot de passe : la personne est déjà vérifiée par
// Access ; elle confirme en écrivant « SUPPRIMER ». Son accès (liste d'Access) se retire par Tony.
async function supprimerCompte(request, env) {
  const u = await utilisateurCourant(request, env);
  if (!u) return json({ erreur: "Session expirée. Reconnectez-vous." }, 401);
  const d = await lireJson(request);
  if (String(d.confirmation || "").trim().toUpperCase() !== "SUPPRIMER") {
    return json({ erreur: "Écrivez SUPPRIMER pour confirmer." }, 400);
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM progression WHERE utilisateur_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM sessions WHERE utilisateur_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM reinitialisations WHERE utilisateur_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM utilisateurs WHERE id = ?").bind(u.id),
  ]);
  return json({ ok: true }, 200, temoinsEffaces());
}

/* ---------- Candidature au projet pilote (2026-11-11) ---------- */

const MAX_CANDIDATURES_PAR_IP = 5;          // par heure
const FENETRE_CANDIDATURES_MS = 60 * 60 * 1000;
const TAILLE_MAX_CANDIDATURE = 4000;        // octets de JSON (prénom, courriel, objectif)
const OBJECTIF_MAX = 1000;                   // caractères de la phrase SMART
const OUVERTURE_CANDIDATURES = Date.UTC(2026, 10, 21, 5, 0, 0); // 21 nov. 2026, 0 h, heure de l'Est
const FERMETURE_CANDIDATURES = Date.UTC(2026, 10, 29, 5, 0, 0); // après le 28 nov. 2026, 23 h 59

async function recevoirCandidature(request, env) {
  const texte = await request.text();
  if (texte.length > TAILLE_MAX_CANDIDATURE) return json({ erreur: "Réponses trop longues." }, 413);
  let d;
  try { d = JSON.parse(texte); } catch (e) { return json({ erreur: "Données invalides." }, 400); }
  if (!d || typeof d !== "object") return json({ erreur: "Données invalides." }, 400);

  // Champ piège : rempli seulement par les robots. On répond « reçu » sans rien garder.
  if (d.piege) return json({ ok: true });

  // 2026-11-19 (Tony) : la candidature ne contient que le prénom, le courriel et la phrase
  // de l'objectif SMART. Les autres réponses restent dans le navigateur ; un envoi qui en
  // contient (ancienne version de la page) est refusé, rien n'en est gardé.
  if (d.reponses !== undefined) return json({ erreur: "Rechargez la page : elle a changé." }, 400);
  const prenom = String(d.prenom || "").trim().slice(0, 60);
  const courriel = String(d.courriel || "").trim().toLowerCase();
  const objectif = String(d.objectif || "").trim().slice(0, OBJECTIF_MAX);
  if (!prenom) return json({ erreur: "Indiquez votre prénom." }, 400);
  if (!courrielValide(courriel)) return json({ erreur: "Ce courriel ne semble pas valide." }, 400);
  if (!objectif) return json({ erreur: "Votre objectif est vide." }, 400);
  if (d.majeur !== true || d.consentement !== true || d.comprend !== true || d.criteres !== true) {
    return json({ erreur: "Il faut cocher les quatre cases obligatoires de la dernière étape." }, 400);
  }
  // Candidatures au projet pilote (Tony, 2026-11-19 ; plus de tirage : 3 places choisies) : du 21 novembre 2026, 0 h, au 28 novembre, 23 h 59, heure de l'Est.
  // CANDIDATURE_DATE_ESSAI : variable d'essai local seulement (wrangler dev --var), jamais posée en ligne.
  const t0 = env.CANDIDATURE_DATE_ESSAI ? Date.parse(env.CANDIDATURE_DATE_ESSAI) : Date.now();
  if (t0 < OUVERTURE_CANDIDATURES) return json({ erreur: "Les candidatures au projet pilote ouvrent le 21 novembre 2026, à 0 h." }, 403);
  if (t0 >= FERMETURE_CANDIDATURES) return json({ erreur: "Les candidatures au projet pilote sont fermées depuis le 28 novembre 2026, à 23 h 59." }, 403);
  const listeAttente = d.liste_attente === true;

  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const cle = "candidature:" + ip;
  const t = await env.DB.prepare("SELECT nombre, debut FROM tentatives WHERE cle = ?").bind(cle).first();
  if (t && Date.now() - t.debut < FENETRE_CANDIDATURES_MS && t.nombre >= MAX_CANDIDATURES_PAR_IP) {
    return json({ erreur: "Trop d'envois en peu de temps. Réessayez dans une heure." }, 429);
  }
  const maintenant = Date.now();
  await env.DB.prepare(
    "INSERT INTO tentatives (cle, nombre, debut) VALUES (?1, 1, ?2) ON CONFLICT(cle) DO UPDATE SET " +
    "nombre = CASE WHEN ?2 - debut > ?3 THEN 1 ELSE nombre + 1 END, " +
    "debut = CASE WHEN ?2 - debut > ?3 THEN ?2 ELSE debut END"
  ).bind(cle, maintenant, FENETRE_CANDIDATURES_MS).run();

  const completude = 0;
  const version = 5;
  await env.DB.prepare(
    "INSERT INTO candidatures (courriel, prenom, nom, reponses, completude, version) VALUES (?1, ?2, ?3, ?4, ?5, ?6) " +
    "ON CONFLICT(courriel) DO UPDATE SET prenom = excluded.prenom, nom = excluded.nom, reponses = excluded.reponses, " +
    "completude = excluded.completude, version = excluded.version, envois = envois + 1, maj = datetime('now')"
  ).bind(courriel, prenom, "", JSON.stringify({ objectif, liste_attente: listeAttente }), completude, version).run();
  return json({ ok: true });
}

function estLocal(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

/* ---------- Sessions ---------- */

// La personne connectée : celle du jeton Access vérifié. Son compte du site est créé à sa première visite
// (nom vide, aucun mot de passe : « acces » ne correspond à aucun hachage, la connexion par mot de passe est fermée).
async function utilisateurCourant(request, env) {
  const courriel = await identiteAcces(request, env);
  if (!courriel) return null;
  const existant = await env.DB.prepare("SELECT id, nom, courriel FROM utilisateurs WHERE courriel = ?").bind(courriel).first();
  if (existant) return existant;
  await env.DB.prepare("INSERT OR IGNORE INTO utilisateurs (courriel, nom, mot_de_passe) VALUES (?, '', 'acces')").bind(courriel).run();
  return env.DB.prepare("SELECT id, nom, courriel FROM utilisateurs WHERE courriel = ?").bind(courriel).first();
}

/* ---------- Cloudflare Access (2026-11-25) ----------
 * Même vérification que l'app d'entraînement (olympiatoppen-app/tableau/acces.ts) : seul le jeton signé
 * compte, jamais un en-tête en clair. En local seulement (localhost), ACCES_DEV_COURRIEL tient lieu de
 * personne connectée. */
let cacheCles;
const DUREE_CACHE_CLES_MS = 3600000;

function octetsB64url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function clesPubliques(equipe, forcer) {
  if (!forcer && cacheCles && cacheCles.equipe === equipe && cacheCles.expire > Date.now()) return cacheCles.cles;
  const r = await fetch(`https://${equipe}/cdn-cgi/access/certs`);
  if (!r.ok) return [];
  const { keys } = await r.json();
  cacheCles = { equipe, cles: keys || [], expire: Date.now() + DUREE_CACHE_CLES_MS };
  return cacheCles.cles;
}

function courrielNormalise(c) {
  if (typeof c !== "string") return null;
  const n = c.trim().toLowerCase();
  return courrielValide(n) ? n : null;
}

async function identiteAcces(request, env) {
  const url = new URL(request.url);
  if (env.ACCES_DEV_COURRIEL && estLocal(url)) return courrielNormalise(env.ACCES_DEV_COURRIEL);
  if (!env.ACCESS_EQUIPE || !env.ACCESS_AUD) return null;
  const jeton = request.headers.get("Cf-Access-Jwt-Assertion");
  const morceaux = jeton ? jeton.split(".") : [];
  if (morceaux.length !== 3) return null;
  const [entete64, charge64, sig64] = morceaux;
  try {
    const entete = JSON.parse(new TextDecoder().decode(octetsB64url(entete64)));
    const charge = JSON.parse(new TextDecoder().decode(octetsB64url(charge64)));
    if (entete.alg !== "RS256" || typeof entete.kid !== "string") return null;
    const aud = Array.isArray(charge.aud) ? charge.aud : [charge.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (charge.iss !== `https://${env.ACCESS_EQUIPE}`) return null;
    if (typeof charge.exp !== "number" || charge.exp * 1000 <= Date.now()) return null;
    // Clé inconnue : Cloudflare a peut-être changé ses clés ; on relit la liste une fois avant de refuser.
    const jwk = (await clesPubliques(env.ACCESS_EQUIPE)).find((k) => k.kid === entete.kid)
      || (await clesPubliques(env.ACCESS_EQUIPE, true)).find((k) => k.kid === entete.kid);
    if (!jwk) return null;
    const cle = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signe = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cle, octetsB64url(sig64), new TextEncoder().encode(`${entete64}.${charge64}`));
    return signe ? courrielNormalise(charge.email) : null;
  } catch (e) {
    return null;
  }
}

function temoinsEffaces() {
  const h = new Headers();
  h.append("Set-Cookie", `${TEMOIN}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  h.append("Set-Cookie", `${TEMOIN_INDICE}=; Path=/; Secure; SameSite=Lax; Max-Age=0`);
  return h;
}

function lireTemoin(request, nom) {
  const brut = request.headers.get("Cookie") || "";
  for (const morceau of brut.split(";")) {
    const i = morceau.indexOf("=");
    if (i > 0 && morceau.slice(0, i).trim() === nom) return morceau.slice(i + 1).trim();
  }
  return null;
}

/* ---------- Outils ---------- */

async function sha256(texte) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function courrielValide(c) {
  return c.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}

async function lireJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

function json(donnees, statut = 200, entetes) {
  const h = new Headers(entetes || {});
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(donnees), { status: statut, headers: h });
}
