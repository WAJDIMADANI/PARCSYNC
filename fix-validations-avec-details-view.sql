/*
  # Correction de la vue validations_avec_details

  Corrige l'erreur de type entre demande_statut (enum) et af.statut (text)
  en mappant correctement les valeurs text vers l'enum demande_statut.
*/

-- Recréer la vue validations_avec_details avec le mapping correct des types
CREATE OR REPLACE VIEW validations_avec_details AS
SELECT
  dv.id,
  dv.demande_id,
  dv.avance_frais_id,
  dv.demandeur_id,
  dv.validateur_id,
  dv.type_action,
  dv.priorite,
  dv.statut,
  dv.message_demande,
  dv.commentaire_validateur,
  dv.created_at,
  dv.responded_at,
  dv.transferee_vers,
  dv.raison_transfert,

  -- Type et description selon le type de demande
  CASE
    WHEN dv.demande_id IS NOT NULL THEN ds.type_demande
    WHEN dv.avance_frais_id IS NOT NULL THEN 'Avance de frais'
    ELSE 'Inconnu'
  END as type_demande,

  CASE
    WHEN dv.demande_id IS NOT NULL THEN ds.description
    WHEN dv.avance_frais_id IS NOT NULL THEN af.motif
    ELSE ''
  END as demande_description,

  CASE
    WHEN dv.demande_id IS NOT NULL THEN ds.statut
    WHEN dv.avance_frais_id IS NOT NULL THEN
      (
        CASE
          WHEN af.statut IS NULL THEN 'en_attente'::demande_statut
          WHEN af.statut IN ('en_attente','en_cours') THEN af.statut::demande_statut
          WHEN af.statut IN ('validee','refusee','traitee') THEN 'traitee'::demande_statut
          ELSE 'en_attente'::demande_statut
        END
      )
    ELSE 'en_attente'::demande_statut
  END as demande_statut,

  -- Informations du salarié
  CASE
    WHEN dv.demande_id IS NOT NULL THEN COALESCE(profil_ds.nom, ds.nom_salarie)
    WHEN dv.avance_frais_id IS NOT NULL THEN profil_af.nom
    ELSE NULL
  END as nom_salarie,

  CASE
    WHEN dv.demande_id IS NOT NULL THEN COALESCE(profil_ds.prenom, ds.prenom_salarie)
    WHEN dv.avance_frais_id IS NOT NULL THEN profil_af.prenom
    ELSE NULL
  END as prenom_salarie,

  CASE
    WHEN dv.demande_id IS NOT NULL THEN COALESCE(profil_ds.matricule_tca, ds.matricule_salarie)
    WHEN dv.avance_frais_id IS NOT NULL THEN profil_af.matricule_tca
    ELSE NULL
  END as matricule_salarie,

  -- Informations supplémentaires pour avances de frais
  af.montant as avance_montant,
  af.facture as avance_facture,
  af.facture_file_path as avance_facture_path,

  -- Informations du demandeur
  demandeur.email as demandeur_email,
  demandeur.nom as demandeur_nom,
  demandeur.prenom as demandeur_prenom,

  -- Informations du validateur
  validateur.email as validateur_email,
  validateur.nom as validateur_nom,
  validateur.prenom as validateur_prenom,

  -- Informations de transfert
  transfere.email as transfere_email,
  transfere.nom as transfere_nom,
  transfere.prenom as transfere_prenom,

  -- Compteur de messages non lus pour le validateur
  COALESCE((
    SELECT COUNT(*)
    FROM message_validation mv
    WHERE mv.demande_validation_id = dv.id
      AND mv.auteur_id != dv.validateur_id
      AND NOT mv.lu_par_validateur
  ), 0) as messages_non_lus_validateur,

  -- Compteur de messages non lus pour le demandeur
  COALESCE((
    SELECT COUNT(*)
    FROM message_validation mv
    WHERE mv.demande_validation_id = dv.id
      AND mv.auteur_id != dv.demandeur_id
      AND NOT mv.lu_par_demandeur
  ), 0) as messages_non_lus_demandeur

FROM demande_validation dv
LEFT JOIN demande_standard ds ON dv.demande_id = ds.id
LEFT JOIN compta_avance_frais af ON dv.avance_frais_id = af.id
LEFT JOIN profil profil_ds ON ds.profil_id = profil_ds.id
LEFT JOIN profil profil_af ON af.profil_id = profil_af.id
LEFT JOIN app_utilisateur demandeur ON dv.demandeur_id = demandeur.id
LEFT JOIN app_utilisateur validateur ON dv.validateur_id = validateur.id
LEFT JOIN app_utilisateur transfere ON dv.transferee_vers = transfere.id;

-- Accorder les permissions sur la vue
GRANT SELECT ON validations_avec_details TO authenticated;

-- Notifier PostgREST de recharger le schéma
SELECT pg_notify('pgrst', 'reload schema');
