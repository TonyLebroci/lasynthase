-- Candidatures au projet pilote en endurance (2026-11-11).
-- Aucune donnée de santé : le questionnaire n'en demande pas (voir confidentialite.html#candidature).
-- Une ligne par courriel : un nouvel envoi remplace le précédent.
-- Effacées au plus tard 6 mois après l'envoi si la personne n'est pas retenue.

CREATE TABLE candidatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courriel TEXT NOT NULL UNIQUE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL DEFAULT '',
  reponses TEXT NOT NULL,              -- JSON des réponses
  completude INTEGER NOT NULL DEFAULT 0, -- % rempli, calculé par la page
  version INTEGER NOT NULL DEFAULT 1,  -- version du questionnaire
  envois INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  maj TEXT NOT NULL DEFAULT (datetime('now'))
);
