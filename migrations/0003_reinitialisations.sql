-- Réinitialisation du mot de passe par courriel (2026-11-19).
-- Demandé par Tony : un mot de passe oublié se règle sans passer par lui.
-- Le lien envoyé par courriel porte un jeton aléatoire ; la base n'en garde
-- que le SHA-256. Valide 30 minutes, une seule fois.

CREATE TABLE reinitialisations (
  jeton TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL           -- millisecondes depuis 1970
);
CREATE INDEX reinitialisations_utilisateur ON reinitialisations(utilisateur_id);
