/* Serveur de l'espace membre de La Synthase (2026-11-05).
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
const ITERATIONS = 100000;
const MAX_TENTATIVES = 8;
const FENETRE_TENTATIVES_MS = 15 * 60 * 1000;
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
  if (!utilisateur) {
    const retour = encodeURIComponent(url.pathname + url.search);
    return new Response(null, {
      status: 302,
      headers: { Location: "/connexion.html?retour=" + retour, "Cache-Control": "no-store" },
    });
  }
  const reponse = await env.ASSETS.fetch(request);
  const r = new Response(reponse.body, reponse);
  r.headers.set("Cache-Control", "private, no-store");
  r.headers.set("X-Robots-Tag", "noindex");
  return r;
}

/* ---------- API ---------- */

async function api(request, env, url, ctx) {
  const methode = request.method;
  const chemin = url.pathname;

  if (methode !== "GET" && !requeteDeConfiance(request, url)) {
    return json({ erreur: "Requête refusée." }, 403);
  }

  if (chemin === "/api/inscription" && methode === "POST") return inscription(request, env);
  if (chemin === "/api/connexion" && methode === "POST") return connexion(request, env);
  if (chemin === "/api/deconnexion" && methode === "POST") return deconnexion(request, env);
  if (chemin === "/api/moi" && methode === "GET") return moi(request, env);
  if (chemin === "/api/compte" && methode === "DELETE") return supprimerCompte(request, env);
  if (chemin === "/api/candidature" && methode === "POST") return recevoirCandidature(request, env);
  if (chemin === "/api/mot-de-passe/oubli" && methode === "POST") return demanderReinitialisation(request, env, url, ctx);
  if (chemin === "/api/mot-de-passe/nouveau" && methode === "POST") return reinitialiserMotDePasse(request, env);

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

async function inscription(request, env) {
  const d = await lireJson(request);
  const nom = String(d.nom || "").trim().slice(0, 80);
  const courriel = String(d.courriel || "").trim().toLowerCase();
  const mdp = String(d.motDePasse || "");

  if (!nom) return json({ erreur: "Indiquez votre nom." }, 400);
  if (!courrielValide(courriel)) return json({ erreur: "Ce courriel ne semble pas valide." }, 400);
  if (mdp.length < 10) return json({ erreur: "Le mot de passe doit compter au moins 10 caractères." }, 400);
  if (mdp.length > 200) return json({ erreur: "Ce mot de passe est trop long." }, 400);
  if (d.consentement !== true) {
    return json({ erreur: "Il faut accepter la politique de confidentialité pour créer un compte." }, 400);
  }

  const existe = await env.DB.prepare("SELECT id FROM utilisateurs WHERE courriel = ?").bind(courriel).first();
  if (existe) return json({ erreur: "Un compte existe déjà avec ce courriel. Connectez-vous plutôt." }, 409);

  const hache = await hacherMotDePasse(mdp);
  const res = await env.DB.prepare("INSERT INTO utilisateurs (courriel, nom, mot_de_passe) VALUES (?, ?, ?)")
    .bind(courriel, nom, hache).run();
  const id = res.meta.last_row_id;
  return ouvrirSession(env, id, { nom, courriel });
}

async function connexion(request, env) {
  const d = await lireJson(request);
  const courriel = String(d.courriel || "").trim().toLowerCase();
  const mdp = String(d.motDePasse || "");
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const cle = "connexion:" + courriel + ":" + ip;

  if (await tropDeTentatives(env, cle)) {
    return json({ erreur: "Trop d'essais. Attendez 15 minutes avant de réessayer." }, 429);
  }

  const u = await env.DB.prepare("SELECT id, nom, courriel, mot_de_passe FROM utilisateurs WHERE courriel = ?")
    .bind(courriel).first();
  // On vérifie un hachage même si le compte n'existe pas : le temps de réponse
  // ne révèle pas quels courriels ont un compte.
  const ok = await verifierMotDePasse(mdp, u ? u.mot_de_passe : HACHAGE_LEURRE);
  if (!u || !ok) {
    await noterTentative(env, cle);
    return json({ erreur: "Courriel ou mot de passe incorrect." }, 401);
  }
  await env.DB.prepare("DELETE FROM tentatives WHERE cle = ?").bind(cle).run();
  return ouvrirSession(env, u.id, { nom: u.nom, courriel: u.courriel });
}

async function deconnexion(request, env) {
  const jeton = lireTemoin(request, TEMOIN);
  if (jeton) await env.DB.prepare("DELETE FROM sessions WHERE jeton = ?").bind(await sha256(jeton)).run();
  return json({ ok: true }, 200, temoinsEffaces());
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

async function supprimerCompte(request, env) {
  const u = await utilisateurCourant(request, env);
  if (!u) return json({ erreur: "Session expirée. Reconnectez-vous." }, 401);
  const d = await lireJson(request);
  const ligne = await env.DB.prepare("SELECT mot_de_passe FROM utilisateurs WHERE id = ?").bind(u.id).first();
  if (!ligne || !(await verifierMotDePasse(String(d.motDePasse || ""), ligne.mot_de_passe))) {
    return json({ erreur: "Mot de passe incorrect." }, 401);
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
const OUVERTURE_TIRAGE = Date.UTC(2026, 10, 21, 5, 0, 0); // 21 nov. 2026, 0 h, heure de l'Est
const FERMETURE_TIRAGE = Date.UTC(2026, 10, 29, 5, 0, 0); // après le 28 nov. 2026, 23 h 59

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
  // Tirage au sort (Tony, 2026-11-19) : du 21 novembre 2026, 0 h, au 28 novembre, 23 h 59, heure de l'Est.
  // TIRAGE_DATE_ESSAI : variable d'essai local seulement (wrangler dev --var), jamais posée en ligne.
  const t0 = env.TIRAGE_DATE_ESSAI ? Date.parse(env.TIRAGE_DATE_ESSAI) : Date.now();
  if (t0 < OUVERTURE_TIRAGE) return json({ erreur: "Les candidatures au tirage ouvrent le 21 novembre 2026, à 0 h." }, 403);
  if (t0 >= FERMETURE_TIRAGE) return json({ erreur: "Les candidatures au tirage sont fermées depuis le 28 novembre 2026, à 23 h 59." }, 403);
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

/* ---------- Mot de passe oublié (2026-11-19) ---------- */

const DUREE_LIEN_MS = 30 * 60 * 1000;
const HEURE_MS = 60 * 60 * 1000;
const MAX_DEMANDES_PAR_COURRIEL = 3;        // par heure
const MAX_DEMANDES_PAR_IP = 10;             // par heure
const MAX_NOUVEAUX_PAR_IP = 20;             // par heure
const EXPEDITEUR_PAR_DEFAUT = "La Synthase <noreply@lasynthase.ca>";
const SITE_PAR_DEFAUT = "https://tony.lasynthase.ca";
// Même réponse que le compte existe ou non : la page ne révèle pas qui est inscrit.
const MESSAGE_OUBLI =
  "Si un compte existe avec ce courriel, un lien pour choisir un nouveau mot de passe vient d'y être envoyé. " +
  "Il est valide 30 minutes. Pensez à regarder dans les courriels indésirables.";

async function demanderReinitialisation(request, env, url, ctx) {
  const d = await lireJson(request);
  const courriel = String(d.courriel || "").trim().toLowerCase();
  if (!courrielValide(courriel)) return json({ erreur: "Ce courriel ne semble pas valide." }, 400);

  const local = estLocal(url);
  if (!env.RESEND_API_KEY && !local) {
    console.error("Mot de passe oublié : secret RESEND_API_KEY absent, aucun courriel ne peut partir.");
    return json({ erreur: "Ce service est indisponible pour l'instant. Écrivez à contact@lasynthase.ca." }, 503);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const tropIp = await compterEtLimiter(env, "oubli-ip:" + ip, MAX_DEMANDES_PAR_IP, HEURE_MS);
  const tropCourriel = await compterEtLimiter(env, "oubli:" + courriel, MAX_DEMANDES_PAR_COURRIEL, HEURE_MS);
  if (tropIp || tropCourriel) return json({ erreur: "Trop de demandes. Réessayez dans une heure." }, 429);

  const u = await env.DB.prepare("SELECT id, nom FROM utilisateurs WHERE courriel = ?").bind(courriel).first();
  if (u) {
    const jeton = base64url(crypto.getRandomValues(new Uint8Array(32)));
    // Un seul lien valide à la fois : le nouveau remplace les anciens.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM reinitialisations WHERE utilisateur_id = ? OR expire_le < ?").bind(u.id, Date.now()),
      env.DB.prepare("INSERT INTO reinitialisations (jeton, utilisateur_id, expire_le) VALUES (?, ?, ?)")
        .bind(await sha256(jeton), u.id, Date.now() + DUREE_LIEN_MS),
    ]);
    // Le jeton va dans le fragment (#) : il n'est jamais envoyé au serveur ni à un autre site.
    const lien = origineSite(url) + "/reinitialisation#jeton=" + jeton;
    const envoi = env.RESEND_API_KEY
      ? envoyerCourrielReinitialisation(env, courriel, u.nom, lien)
      : Promise.resolve(console.log("[local] Lien de réinitialisation pour " + courriel + " : " + lien));
    // L'envoi se fait après la réponse : le temps de réponse ne révèle pas qui a un compte.
    const suite = envoi.catch((e) => console.error("Mot de passe oublié : envoi impossible", e));
    if (ctx && ctx.waitUntil) ctx.waitUntil(suite); else await suite;
  }
  return json({ ok: true, message: MESSAGE_OUBLI });
}

async function reinitialiserMotDePasse(request, env) {
  const d = await lireJson(request);
  const jeton = String(d.jeton || "");
  const mdp = String(d.motDePasse || "");
  const invalide = "Ce lien n'est plus valide : il dure 30 minutes et ne sert qu'une fois. Demandez-en un nouveau.";

  const ip = request.headers.get("CF-Connecting-IP") || "local";
  if (await compterEtLimiter(env, "nouveau-ip:" + ip, MAX_NOUVEAUX_PAR_IP, HEURE_MS)) {
    return json({ erreur: "Trop d'essais. Réessayez dans une heure." }, 429);
  }
  if (!jeton || jeton.length > 100) return json({ erreur: invalide }, 400);
  if (mdp.length < 10) return json({ erreur: "Le mot de passe doit compter au moins 10 caractères." }, 400);
  if (mdp.length > 200) return json({ erreur: "Ce mot de passe est trop long." }, 400);

  // Le lien est retiré au moment même où on le lit : deux envois en même temps ne peuvent pas s'en servir tous les deux.
  const ligne = await env.DB.prepare("DELETE FROM reinitialisations WHERE jeton = ? RETURNING utilisateur_id, expire_le")
    .bind(await sha256(jeton)).first();
  if (!ligne || ligne.expire_le < Date.now()) return json({ erreur: invalide }, 400);

  const u = await env.DB.prepare("SELECT id, nom, courriel FROM utilisateurs WHERE id = ?").bind(ligne.utilisateur_id).first();
  if (!u) return json({ erreur: invalide }, 400);

  const prefixe = "connexion:" + u.courriel + ":";
  // Nouveau mot de passe ; toutes les connexions ouvertes sont fermées (un appareil perdu ou partagé perd l'accès).
  await env.DB.batch([
    env.DB.prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?").bind(await hacherMotDePasse(mdp), u.id),
    env.DB.prepare("DELETE FROM sessions WHERE utilisateur_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM reinitialisations WHERE utilisateur_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM tentatives WHERE substr(cle, 1, length(?1)) = ?1").bind(prefixe),
  ]);
  return ouvrirSession(env, u.id, { nom: u.nom, courriel: u.courriel });
}

async function envoyerCourrielReinitialisation(env, courriel, nom, lien) {
  const prenom = String(nom || "").trim().split(/\s+/)[0] || "";
  const salut = prenom ? "Bonjour " + prenom + "," : "Bonjour,";
  const texte = [
    salut,
    "",
    "Vous avez demandé à choisir un nouveau mot de passe pour votre compte La Synthase.",
    "Ouvrez ce lien (valide 30 minutes, une seule fois) :",
    lien,
    "",
    "Si vous n'avez rien demandé, ignorez ce courriel : votre mot de passe ne change pas.",
    "",
    "La Synthase – Antoine Corbeil",
  ].join("\n");
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#2b2b2b;max-width:520px">' +
    "<p>" + echapperHtml(salut) + "</p>" +
    "<p>Vous avez demandé à choisir un nouveau mot de passe pour votre compte La Synthase.</p>" +
    '<p><a href="' + echapperHtml(lien) + '" style="display:inline-block;background:#5f7a61;color:#fff;' +
    'padding:12px 22px;border-radius:6px;text-decoration:none">Choisir un nouveau mot de passe</a></p>' +
    "<p style=\"font-size:14px;color:#666\">Le lien est valide 30 minutes et ne sert qu'une fois. " +
    "Si vous n'avez rien demandé, ignorez ce courriel : votre mot de passe ne change pas.</p>" +
    "<p>La Synthase – Antoine Corbeil</p></div>";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.COURRIEL_EXPEDITEUR || EXPEDITEUR_PAR_DEFAUT,
      to: [courriel],
      reply_to: "contact@lasynthase.ca",
      subject: "Choisir un nouveau mot de passe — La Synthase",
      text: texte,
      html,
    }),
  });
  if (!r.ok) throw new Error("Resend a répondu " + r.status + " : " + (await r.text()).slice(0, 300));
}

// Adresse du site pour le lien : celle de la demande si c'est un domaine de La Synthase
// (ou l'essai local), sinon l'adresse principale. Un en-tête trafiqué ne choisit jamais le lien.
function origineSite(url) {
  const h = url.hostname;
  if (h === "lasynthase.ca" || h.endsWith(".lasynthase.ca") || estLocal(url)) return url.origin;
  return SITE_PAR_DEFAUT;
}

function estLocal(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function echapperHtml(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- Sessions ---------- */

async function ouvrirSession(env, utilisateurId, profil) {
  const octets = crypto.getRandomValues(new Uint8Array(32));
  const jeton = base64url(octets);
  const expire = Date.now() + DUREE_SESSION_MS;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expire_le < ?").bind(Date.now()),
    env.DB.prepare("INSERT INTO sessions (jeton, utilisateur_id, expire_le) VALUES (?, ?, ?)")
      .bind(await sha256(jeton), utilisateurId, expire),
  ]);
  const age = Math.floor(DUREE_SESSION_MS / 1000);
  const entetes = new Headers();
  entetes.append("Set-Cookie", `${TEMOIN}=${jeton}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);
  entetes.append("Set-Cookie", `${TEMOIN_INDICE}=1; Path=/; Secure; SameSite=Lax; Max-Age=${age}`);
  return json({ ok: true, nom: profil.nom, courriel: profil.courriel }, 200, entetes);
}

async function utilisateurCourant(request, env) {
  const jeton = lireTemoin(request, TEMOIN);
  if (!jeton || jeton.length > 100) return null;
  return env.DB.prepare(
    "SELECT u.id, u.nom, u.courriel FROM sessions s JOIN utilisateurs u ON u.id = s.utilisateur_id " +
    "WHERE s.jeton = ? AND s.expire_le > ?"
  ).bind(await sha256(jeton), Date.now()).first();
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

/* ---------- Essais en rafale ---------- */

async function tropDeTentatives(env, cle) {
  const t = await env.DB.prepare("SELECT nombre, debut FROM tentatives WHERE cle = ?").bind(cle).first();
  return !!t && Date.now() - t.debut < FENETRE_TENTATIVES_MS && t.nombre >= MAX_TENTATIVES;
}

async function noterTentative(env, cle) {
  const maintenant = Date.now();
  await env.DB.prepare(
    "INSERT INTO tentatives (cle, nombre, debut) VALUES (?1, 1, ?2) ON CONFLICT(cle) DO UPDATE SET " +
    "nombre = CASE WHEN ?2 - debut > ?3 THEN 1 ELSE nombre + 1 END, " +
    "debut = CASE WHEN ?2 - debut > ?3 THEN ?2 ELSE debut END"
  ).bind(cle, maintenant, FENETRE_TENTATIVES_MS).run();
}

// Compte une demande et dit si la limite est dépassée (fenêtre glissante simple).
async function compterEtLimiter(env, cle, max, fenetre) {
  const maintenant = Date.now();
  const t = await env.DB.prepare(
    "INSERT INTO tentatives (cle, nombre, debut) VALUES (?1, 1, ?2) ON CONFLICT(cle) DO UPDATE SET " +
    "nombre = CASE WHEN ?2 - debut > ?3 THEN 1 ELSE nombre + 1 END, " +
    "debut = CASE WHEN ?2 - debut > ?3 THEN ?2 ELSE debut END RETURNING nombre"
  ).bind(cle, maintenant, fenetre).first();
  return !!t && t.nombre > max;
}

/* ---------- Mots de passe ---------- */

const HACHAGE_LEURRE = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function hacherMotDePasse(mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(mdp, sel, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${base64url(sel)}$${base64url(h)}`;
}

async function verifierMotDePasse(mdp, stocke) {
  const [algo, iter, sel64, hache64] = String(stocke).split("$");
  if (algo !== "pbkdf2") return false;
  const attendu = deBase64url(hache64);
  const calcule = await pbkdf2(mdp, deBase64url(sel64), Number(iter));
  if (attendu.length !== calcule.length) return false;
  let diff = 0;
  for (let i = 0; i < attendu.length; i++) diff |= attendu[i] ^ calcule[i];
  return diff === 0;
}

async function pbkdf2(mdp, sel, iterations) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations }, cle, 256);
  return new Uint8Array(bits);
}

/* ---------- Outils ---------- */

async function sha256(texte) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(octets) {
  let s = "";
  for (const b of octets) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(texte) {
  const s = atob(String(texte || "").replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(texte || "").length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
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
