# 🎯 DERNIÈRE ÉTAPE : Exécuter le SQL dans Supabase

## ✅ Ce qui est déjà fait :
- ✓ Composant `MissingDocuments.tsx` créé
- ✓ Route ajoutée dans Dashboard
- ✓ Type ajouté dans Sidebar
- ✓ Carte d'alerte ajoutée dans RHDashboard
- ✓ Compteur de documents manquants ajouté
- ✓ Projet compilé avec succès

## ⚠️ Action requise de votre part :

### 1. Ouvrir Supabase SQL Editor

Allez sur : https://supabase.com/dashboard/project/jnlvinwekqvkrywxrjgr/sql/new

### 2. Copier-coller ce SQL :

```sql
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
```

### 3. Cliquer sur "Run" (ou Ctrl+Enter)

### 4. Vérifier que la fonction fonctionne :

```sql
SELECT * FROM get_missing_documents_by_salarie();
```

## 🎉 Après avoir exécuté le SQL :

1. Actualisez votre application
2. Allez sur le **Dashboard RH**
3. Vous verrez apparaître une **carte rouge** si des salariés ont des documents manquants
4. Cliquez sur la carte pour voir le détail

## 📋 Documents obligatoires vérifiés :
- ✓ Permis de conduire
- ✓ Certificat médical
- ✓ Carte d'identité
- ✓ Carte vitale
- ✓ RIB

## 🔄 Mise à jour automatique :
Le système se met à jour automatiquement quand vous ajoutez/supprimez des documents !
