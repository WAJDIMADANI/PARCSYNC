/*
  # Fonction pour récupérer les salariés avec documents manquants

  1. Nouvelle fonction RPC
    - `get_missing_documents_by_salarie()` retourne la liste des salariés actifs avec documents manquants

  2. Fonctionnalité
    - Parcourt tous les salariés avec statut = 'actif'
    - Vérifie l'existence de 5 documents obligatoires :
      - permis_recto (Permis de conduire)
      - certificat_medical (Certificat médical)
      - cni_recto (Carte d'identité)
      - carte_vitale (Carte vitale)
      - rib (RIB)
    - Joint avec la table site pour obtenir le nom du site
    - Retourne uniquement les salariés avec au moins 1 document manquant

  3. Format de retour
    - JSON avec : id, nom, prenom, email, poste, site_id, nom_site, documents_manquants (array)

  4. Sécurité
    - Fonction SECURITY DEFINER pour accès contrôlé
    - Ne retourne que les données nécessaires
*/

CREATE OR REPLACE FUNCTION get_missing_documents_by_salarie()
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  email text,
  poste text,
  site_id uuid,
  nom_site text,
  documents_manquants jsonb
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
      jsonb_build_array(
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.profil_id = sa.id
          AND d.type = 'permis_recto'
          AND d.statut != 'refuse'
        ) THEN 'permis_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.profil_id = sa.id
          AND d.type = 'certificat_medical'
          AND d.statut != 'refuse'
        ) THEN 'certificat_medical' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.profil_id = sa.id
          AND d.type = 'cni_recto'
          AND d.statut != 'refuse'
        ) THEN 'cni_recto' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.profil_id = sa.id
          AND d.type = 'carte_vitale'
          AND d.statut != 'refuse'
        ) THEN 'carte_vitale' ELSE NULL END,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM document d
          WHERE d.profil_id = sa.id
          AND d.type = 'rib'
          AND d.statut != 'refuse'
        ) THEN 'rib' ELSE NULL END
      ) - NULL AS docs_manquants
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
    ds.docs_manquants as documents_manquants
  FROM documents_status ds
  WHERE jsonb_array_length(ds.docs_manquants) > 0
  ORDER BY ds.nom, ds.prenom;
END;
$$;
