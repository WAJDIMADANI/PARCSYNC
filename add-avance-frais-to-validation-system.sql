/*
  # Adapter le système de validation pour les avances de frais

  1. Modifications de la table demande_validation
    - Rendre demande_id NULLABLE (peut être NULL pour les avances de frais)
    - Ajouter avance_frais_id NULLABLE (référence vers compta_avance_frais)
    - Ajouter contrainte : au moins un des deux doit être rempli

  2. Modifier la vue validations_avec_details pour inclure les avances

  3. Modifier compta_avance_frais
    - Rendre statut NULLABLE (NULL = brouillon)
    - Rendre date_demande NULLABLE
*/

-- 1. Modifier demande_validation pour supporter les avances de frais
ALTER TABLE demande_validation
  ALTER COLUMN demande_id DROP NOT NULL;

ALTER TABLE demande_validation
  ADD COLUMN IF NOT EXISTS avance_frais_id uuid REFERENCES compta_avance_frais(id) ON DELETE CASCADE;

-- Ajouter contrainte : au moins un des deux doit être rempli
ALTER TABLE demande_validation
  DROP CONSTRAINT IF EXISTS check_demande_or_avance;

ALTER TABLE demande_validation
  ADD CONSTRAINT check_demande_or_avance CHECK (
    (demande_id IS NOT NULL AND avance_frais_id IS NULL) OR
    (demande_id IS NULL AND avance_frais_id IS NOT NULL)
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_demande_validation_avance_frais_id ON demande_validation(avance_frais_id);

-- 2. Modifier compta_avance_frais pour supporter le brouillon
ALTER TABLE compta_avance_frais
  ALTER COLUMN statut DROP NOT NULL,
  ALTER COLUMN statut DROP DEFAULT,
  ALTER COLUMN date_demande DROP NOT NULL,
  ALTER COLUMN date_demande DROP DEFAULT;

-- Mettre à jour la contrainte de statut
ALTER TABLE compta_avance_frais
  DROP CONSTRAINT IF EXISTS compta_avance_frais_statut_check;

ALTER TABLE compta_avance_frais
  ADD CONSTRAINT compta_avance_frais_statut_check CHECK (
    statut IS NULL OR statut IN ('en_attente', 'validee', 'refusee')
  );

-- 3. Recréer la vue validations_avec_details pour inclure les avances de frais
DROP VIEW IF EXISTS validations_avec_details CASCADE;

CREATE VIEW validations_avec_details AS
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
    WHEN dv.avance_frais_id IS NOT NULL THEN COALESCE(af.statut, 'en_attente')
    ELSE 'en_attente'
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

-- 4. Mettre à jour la vue v_compta_avance_frais
DROP VIEW IF EXISTS v_compta_avance_frais CASCADE;

CREATE OR REPLACE VIEW v_compta_avance_frais AS
SELECT
  caf.id,
  caf.profil_id,
  p.matricule_tca as matricule,
  p.nom,
  p.prenom,
  caf.motif,
  caf.montant,
  caf.facture,
  caf.facture_file_path,
  caf.date_demande,
  caf.statut,
  caf.commentaire_validation,
  caf.valide_par,
  caf.date_validation,
  caf.created_at,
  caf.updated_at,
  -- Ajouter l'info de la demande de validation en cours
  dv.id as validation_id,
  dv.statut as validation_statut,
  dv.validateur_id,
  validateur.nom as validateur_nom,
  validateur.prenom as validateur_prenom
FROM compta_avance_frais caf
JOIN profil p ON caf.profil_id = p.id
LEFT JOIN demande_validation dv ON dv.avance_frais_id = caf.id AND dv.statut = 'en_attente'
LEFT JOIN app_utilisateur validateur ON dv.validateur_id = validateur.id;

GRANT SELECT ON v_compta_avance_frais TO authenticated;

-- 5. Modifier la fonction valider_avance_frais pour gérer les demandes de validation
CREATE OR REPLACE FUNCTION valider_avance_frais(
  p_avance_id uuid,
  p_validation_statut text,
  p_commentaire text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_validator_id uuid;
  v_demande_validation_id uuid;
BEGIN
  -- Récupérer l'ID du validateur
  SELECT id INTO v_validator_id
  FROM app_utilisateur
  WHERE auth_user_id = auth.uid();

  IF v_validator_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;

  -- Vérifier que le statut est valide
  IF p_validation_statut NOT IN ('validee', 'refusee') THEN
    RAISE EXCEPTION 'Statut de validation invalide: %', p_validation_statut;
  END IF;

  -- Récupérer la demande de validation associée
  SELECT id INTO v_demande_validation_id
  FROM demande_validation
  WHERE avance_frais_id = p_avance_id
    AND statut = 'en_attente'
    AND validateur_id = v_validator_id
  LIMIT 1;

  -- Mettre à jour la demande de validation
  IF v_demande_validation_id IS NOT NULL THEN
    UPDATE demande_validation
    SET
      statut = CASE WHEN p_validation_statut = 'validee' THEN 'approuvee' ELSE 'rejetee' END,
      commentaire_validateur = p_commentaire,
      responded_at = NOW()
    WHERE id = v_demande_validation_id;
  END IF;

  -- Mettre à jour l'avance de frais
  UPDATE compta_avance_frais
  SET
    statut = p_validation_statut::text,
    commentaire_validation = p_commentaire,
    valide_par = v_validator_id,
    date_validation = NOW()
  WHERE id = p_avance_id;

  -- Vérifier qu'une ligne a été mise à jour
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avance de frais non trouvée';
  END IF;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION valider_avance_frais(uuid, text, text) TO authenticated;
