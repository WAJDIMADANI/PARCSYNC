/*
  # Fix des fonctions de documents manquants

  1. Corrections apportées
    - Mise à jour de get_missing_documents_by_salarie() pour utiliser owner_id + owner_type
    - Création de get_missing_documents_for_profil() pour un profil spécifique
    - Support de tous les types de documents (permis recto/verso, CNI recto/verso, etc.)

  2. Fonctionnalités
    - get_missing_documents_by_salarie(): Retourne TOUS les salariés actifs avec documents manquants
    - get_missing_documents_for_profil(p_profil_id): Retourne les documents manquants pour UN profil

  3. Types de documents vérifiés
    - permis_recto, permis_verso
    - cni_recto, cni_verso
    - carte_vitale
    - certificat_medical
    - rib
*/

-- Fonction pour récupérer TOUS les salariés avec documents manquants
CREATE OR REPLACE FUNCTION get_missing_documents_by_salarie()
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  email text,
  poste text,
  site_id uuid,
  nom_site text,
  documents_manquants text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH salaries_actifs AS (
    SELECT
      p.id,
      p.nom,
      p.prenom,
      p.email,
      p.poste,
      p.site_id,
      s.nom as nom_site
    FROM profil p
    LEFT JOIN site s ON p.site_id = s.id
    WHERE p.statut = 'actif'
  ),
  documents_status AS (
    SELECT
      sa.id,
      sa.nom,
      sa.prenom,
      sa.email,
      sa.poste,
      sa.site_id,
      sa.nom_site,
      ARRAY[
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'permis_recto'
        ) THEN 'permis_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'permis_verso'
        ) THEN 'permis_verso' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'cni_recto'
        ) THEN 'cni_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'cni_verso'
        ) THEN 'cni_verso' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'carte_vitale'
        ) THEN 'carte_vitale' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'certificat_medical'
        ) THEN 'certificat_medical' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = sa.id
          AND d.owner_type = 'profil'
          AND d.type_document = 'rib'
        ) THEN 'rib' ELSE NULL END
      ] AS docs_manquants_raw
    FROM salaries_actifs sa
  )
  SELECT
    ds.id,
    ds.nom,
    ds.prenom,
    ds.email,
    ds.poste,
    ds.site_id,
    ds.nom_site,
    array_remove(ds.docs_manquants_raw, NULL) as documents_manquants
  FROM documents_status ds
  WHERE array_length(array_remove(ds.docs_manquants_raw, NULL), 1) > 0
  ORDER BY ds.nom, ds.prenom;
END;
$$;

-- Fonction pour récupérer les documents manquants d'UN profil spécifique
CREATE OR REPLACE FUNCTION get_missing_documents_for_profil(p_profil_id uuid)
RETURNS TABLE (
  missing_documents text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    array_remove(
      ARRAY[
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'permis_recto'
        ) THEN 'permis_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'permis_verso'
        ) THEN 'permis_verso' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'cni_recto'
        ) THEN 'cni_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'cni_verso'
        ) THEN 'cni_verso' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'carte_vitale'
        ) THEN 'carte_vitale' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'certificat_medical'
        ) THEN 'certificat_medical' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.owner_id = p_profil_id
          AND d.owner_type = 'profil'
          AND d.type_document = 'rib'
        ) THEN 'rib' ELSE NULL END
      ],
      NULL
    ) AS missing_documents;
END;
$$;
