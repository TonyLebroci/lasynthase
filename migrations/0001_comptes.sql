-- Comptes de l'espace membre (2026-11-05).
-- Données minimales (Loi 25) : nom, courriel, mot de passe haché, progression
-- dans les modules. Aucune donnée de santé.

CREATE TABLE utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courriel TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  mot_de_passe TEXT NOT NULL,          -- « pbkdf2$<itérations>$<sel>$<hachage> »
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Le jeton de session n'est jamais stocké en clair : seulement son SHA-256.
CREATE TABLE sessions (
  jeton TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL           -- millisecondes depuis 1970
);
CREATE INDEX sessions_utilisateur ON sessions(utilisateur_id);

-- Un enregistrement par module et par personne ; « etat » est du JSON.
CREATE TABLE progression (
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  etat TEXT NOT NULL,
  maj TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (utilisateur_id, module)
);

-- Frein contre les essais de mots de passe en rafale.
CREATE TABLE tentatives (
  cle TEXT PRIMARY KEY,
  nombre INTEGER NOT NULL,
  debut INTEGER NOT NULL
);
