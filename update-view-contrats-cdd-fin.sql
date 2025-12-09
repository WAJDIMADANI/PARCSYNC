/*
  # Mise à jour de la vue des contrats CDD en fin de validité

  Cette migration enrichit la vue v_contrats_cdd_fin avec les informations du salarié
  pour permettre une meilleure identification dans l'interface des notifications.

  ## Modifications
  - Ajout des colonnes: nom, prenom, email du salarié
  - Ajout de la colonne: secteur_nom (nom du secteur du salarié)
  - Jointure avec la table profil pour récupérer les informations du salarié
  - Jointure avec la table secteur pour récupérer le nom du secteur

  ## Impact
  - Permet d'afficher le nom, prénom, email et secteur dans l'onglet "CDD fin proche" des Alertes
  - Aucun impact sur les autres fonctionnalités
  - La vue continue de filtrer les contrats CDD se terminant dans les 30 prochains jours

  ## Instructions
  1. Allez sur https://supabase.com/dashboard/project/YOUR_PROJECT/editor
  2. Copiez et exécutez ce script SQL complet
  3. La vue sera mise à jour immédiatement
  4. Rafraîchissez l'application pour voir les changements
*/

CREATE OR REPLACE VIEW v_contrats_cdd_fin AS
SELECT
  c.id,
  c.profil_id,
  c.type,
  c.date_fin,
  (c.date_fin - CURRENT_DATE) as jours_restants,
  p.nom,
  p.prenom,
  p.email,
  s.nom as secteur_nom
FROM contrat c
LEFT JOIN profil p ON c.profil_id = p.id
LEFT JOIN secteur s ON p.secteur_id = s.id
WHERE c.type = 'cdd'
  AND c.date_fin IS NOT NULL
  AND c.date_fin < CURRENT_DATE + INTERVAL '30 days'
  AND c.date_fin >= CURRENT_DATE;
