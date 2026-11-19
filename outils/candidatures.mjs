#!/usr/bin/env node
/* Classe les candidatures au projet pilote (2026-11-11).
 *
 * Lit la table D1 « candidatures » par wrangler et affiche, dans le terminal
 * seulement, le classement des dossiers. Rien n'est écrit sur le disque : ce
 * sont des renseignements personnels (jamais dans le coffre ni dans git).
 *
 * Usage (depuis la racine du dépôt) :
 *   node outils/candidatures.mjs                 classement (base en ligne)
 *   node outils/candidatures.mjs --local         classement (base de wrangler dev)
 *   node outils/candidatures.mjs --detail <id>   le dossier complet d'une personne
 *   … --nom                                       affiche aussi prénom, nom, région et courriel (pour Tony seulement)
 *
 * Par défaut, la sortie ne contient ni prénom, ni nom, ni région, ni courriel : seulement le numéro du
 * dossier (2026-11-16, dossier juridique d'Olympiatoppen Open, correction 11). Quand Claude classe, ce
 * qu'il lit part chez Anthropic : il ne doit voir que des numéros. Tony ajoute --nom pour savoir qui est qui.
 *
 * Les dossiers hors critères (pas dans intervals.icu, pas de capteur fiable,
 * pas d'entraînement) passent en dernier. Puis note sur 100 = complétude (30)
 * + clarté de l'objectif (20) + réflexion (20) + réalisme (15) + motivation (15). Les poids sont ceux choisis
 * le 2026-11-11 ; ils se changent ici, nulle part ailleurs.
 * Version 3 (2026-11-11) : plus d'importance sur 10 ni de « dernier abandon » ; la motivation se lit
 * dans la confiance, l'engagement (une seule case) et le soutien ; le jalon compte dans la réflexion.
 * Les dossiers de la version 2 se notent encore (anciens champs lus s'ils sont là).
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const local = args.includes("--local");
// Avec --local : un autre stockage que celui de `wrangler dev` (essais avec des données fictives).
const iPersist = args.indexOf("--persist-to");
const persistTo = local && iPersist !== -1 ? args[iPersist + 1] : null;
const iDetail = args.indexOf("--detail");
const idDetail = iDetail !== -1 ? Number(args[iDetail + 1]) : null;
const avecNom = args.includes("--nom");
/** Champs qui disent qui est la personne : jamais affichés sans --nom. */
const CHAMPS_IDENTITE = new Set(["prenom", "nom", "courriel", "region"]);

function requete(sql) {
  const sortie = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "lasynthase-comptes", local ? "--local" : "--remote", ...(persistTo ? ["--persist-to", persistTo] : []), "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const json = JSON.parse(sortie);
  return (Array.isArray(json) ? json[0] : json).results || [];
}

const longueur = (t) => (typeof t === "string" ? t.trim().length : 0);
const rempli = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "" && v !== false);

function semainesAvant(dateIso) {
  const d = new Date(dateIso + "T12:00:00");
  if (isNaN(d)) return null;
  return Math.floor((d - Date.now()) / (7 * 24 * 3600 * 1000));
}

// Un texte réfléchi vaut ses points à partir d'une longueur raisonnable.
function pointsTexte(t, plein) {
  const n = longueur(t);
  if (n >= plein) return 1;
  if (n >= plein / 3) return 0.5;
  return 0;
}

export function noter(r, completude) {
  const notes = {};
  const drapeaux = [];

  // Critères du projet (2026-11-11) : historique dans intervals.icu, capteur fiable.
  const horsCriteres = [];
  if (r.crit_intervals !== "oui") horsCriteres.push("pas dans intervals.icu");
  if (r.crit_capteur !== "oui") horsCriteres.push("pas de ceinture ni de capteur de puissance");
  if (!(Number(r.heures_actuelles) > 0)) horsCriteres.push("ne s'entraîne pas encore");

  // 1. Complétude (30)
  notes.completude = Math.round((Math.min(100, completude || 0) / 100) * 30);

  // 2. Clarté de l'objectif (20)
  let c = 0;
  if (r.date_objectif && semainesAvant(r.date_objectif) !== null) c += 5;
  if (r.type_objectif === "terminer") {
    c += 5;
    if (r.comment_finir || r.barriere) c += 5;
  } else {
    if (/\d/.test((r.niveau_cible || "") + (r.objectif || ""))) c += 5; else drapeaux.push("objectif sans chiffre");
    if (r.niveau_seuil && r.niveau_cible && r.niveau_reve) c += 5;
  }
  c += 5 * pointsTexte(r.jour_j, 150);
  notes.clarte = Math.round(c);

  // 3. Réflexion (20) : les réponses qui demandent de creuser
  const reflexifs = Number(r.importance) >= 0 && r.importance !== undefined
    ? ["pourquoi_1", "ecart", "preuve", "obstacle", "abandon", "importance_pourquoi", "confiance_plus"]  // version 2
    : ["pourquoi_1", "ecart", "preuve", "obstacle", "confiance_plus", "jalon"];
  const somme = reflexifs.reduce((s, k) => s + pointsTexte(r[k], 120), 0);
  notes.reflexion = Math.round((somme / reflexifs.length) * 20);
  if (!(r.si_1 && r.alors_1)) drapeaux.push("plan si-alors manquant");
  if (r.importance === undefined && !r.jalon) drapeaux.push("pas de jalon");

  // 4. Réalisme (15)
  let re = 0;
  const s = r.date_objectif ? semainesAvant(r.date_objectif) : null;
  if (s !== null && s >= 8 && s <= 52) re += 5;
  else if (s !== null) drapeaux.push(s < 0 ? "date passée" : s < 8 ? `objectif dans ${s} sem. seulement` : `objectif dans ${s} sem.`);
  const a = Number(r.heures_actuelles), d = Number(r.heures_dispo);
  if (a > 0 && d > 0) {
    if (d >= a * 0.7 && d <= a * 1.6 + 2) re += 5;
    else drapeaux.push(`volume ${a} h → ${d} h`);
  }
  if (r.crit_intervals === "oui") re += 3;
  if (r.crit_capteur === "oui") re += 2;
  notes.realisme = re;

  // 5. Motivation et engagement (15)
  let m = 0;
  const conf = Number(r.confiance);
  if (conf >= 6) m += 5; else if (conf >= 4) m += 2;
  const engs = r.engagements || [];
  const eng = engs.includes("tous") ? 4 : engs.length;
  m += Math.round((eng / 4) * 5);
  if (eng < 4) drapeaux.push(engs.includes("tous") || r.importance === undefined ? "engagement non coché" : `${eng}/4 engagements`);
  if (r.importance !== undefined) {  // version 2
    const imp = Number(r.importance);
    if (imp >= 8) m += 5; else if (imp >= 6) m += 2;
  } else if (longueur(r.soutien) > 0) m += 5;
  else drapeaux.push("personne ne sait");
  notes.motivation = Math.min(15, m);

  const total = notes.completude + notes.clarte + notes.reflexion + notes.realisme + notes.motivation;
  return { total, notes, drapeaux, horsCriteres };
}

// Version 4 (2026-11-19, Tony) : la candidature ne contient que prénom, courriel et objectif SMART.
function afficherObjectifs(lignes) {
  if (!lignes.length) return;
  console.log(`\n${lignes.length} candidature(s) : l'objectif seulement\n`);
  lignes.forEach((l, i) => {
    const r = JSON.parse(l.reponses);
    console.log(`${String(i + 1).padStart(2)}. [id ${l.id}]${avecNom ? ` ${l.prenom} · ${l.courriel}` : ""} · reçu ${l.maj}`);
    console.log(`    ${r.objectif || "objectif ?"}`);
  });
  console.log(avecNom ? "" : "\n(identité masquée ; --nom pour Tony)\n");
}

function afficherClassement(toutes) {
  afficherObjectifs(toutes.filter((l) => l.version >= 4));
  const lignes = toutes.filter((l) => l.version < 4);
  if (!toutes.length) { console.log("Aucune candidature."); return; }
  if (!lignes.length) return;
  const dossiers = lignes.map((l) => {
    const r = JSON.parse(l.reponses);
    return { l, r, ...noter(r, l.completude) };
  // Ceux qui répondent aux critères d'abord, puis par note.
  }).sort((x, y) => (x.horsCriteres.length > 0) - (y.horsCriteres.length > 0) || y.total - x.total);

  console.log(`\n${dossiers.length} candidature(s), de la mieux notée à la moins bien notée\n`);
  dossiers.forEach((x, i) => {
    const s = x.r.date_objectif ? semainesAvant(x.r.date_objectif) : null;
    console.log(`${String(i + 1).padStart(2)}. [id ${x.l.id}]${avecNom ? ` ${x.l.prenom} ${x.l.nom}` : ""} — ${x.total}/100` +
      `  (complet ${x.notes.completude}/30 · clarté ${x.notes.clarte}/20 · réflexion ${x.notes.reflexion}/20 · réalisme ${x.notes.realisme}/15 · motivation ${x.notes.motivation}/15)`);
    console.log(`    ${x.r.sport || "?"} · ${x.r.objectif || "objectif ?"}${s !== null ? ` · dans ${s} sem.` : ""}${avecNom && x.r.region ? ` · ${x.r.region}` : ""}`);
    console.log(`    ${x.r.importance !== undefined ? `importance ${x.r.importance}/10, ` : ""}confiance ${x.r.confiance ?? "?"}/10 · ${x.r.heures_actuelles ?? "?"} h → ${x.r.heures_dispo ?? "?"} h/sem · reçu ${x.l.maj}${x.l.envois > 1 ? ` (${x.l.envois} envois)` : ""}`);
    if (x.horsCriteres.length) console.log(`    HORS CRITÈRES : ${x.horsCriteres.join(" ; ")}`);
    if (x.drapeaux.length) console.log(`    À regarder : ${x.drapeaux.join(" ; ")}`);
  });
  console.log(`\nDossier complet : node outils/candidatures.mjs --detail <id>${avecNom ? "" : "   (identité masquée ; --nom pour Tony)"}\n`);
}

function afficherDetail(l) {
  const r = JSON.parse(l.reponses);
  const n = noter(r, l.completude);
  console.log(avecNom
    ? `\n# ${l.prenom} ${l.nom} (id ${l.id}) — ${n.total}/100\n${l.courriel} · reçu ${l.maj}\n`
    : `\n# Dossier ${l.id} — ${n.total}/100\nreçu ${l.maj} (identité masquée : ajouter --nom)\n`);
  for (const [k, v] of Object.entries(r)) {
    if (k === "courriel" || (!avecNom && CHAMPS_IDENTITE.has(k))) continue;
    console.log(`- ${k} : ${Array.isArray(v) ? v.join(", ") : v}`);
  }
  if (n.drapeaux.length) console.log(`\nÀ regarder : ${n.drapeaux.join(" ; ")}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  if (idDetail) {
    const l = requete(`SELECT * FROM candidatures WHERE id = ${Math.trunc(idDetail)}`)[0];
    if (!l) console.log("Introuvable."); else afficherDetail(l);
  } else {
    afficherClassement(requete("SELECT * FROM candidatures"));
  }
}
