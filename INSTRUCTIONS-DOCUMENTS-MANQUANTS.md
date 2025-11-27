# Instructions : Système de suivi des documents manquants

## Vue d'ensemble

Ce système permet de suivre les salariés actifs auxquels il manque un ou plusieurs documents obligatoires.

## Fonctionnalités implémentées

### 1. Fonction RPC SQL : `get_missing_documents_by_salarie()`

**À exécuter dans Supabase SQL Editor :**

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

**Documents obligatoires vérifiés :**
- Permis de conduire (`permis_recto`)
- Certificat médical (`certificat_medical`)
- Carte d'identité (`cni_recto`)
- Carte vitale (`carte_vitale`)
- RIB (`rib`)

### 2. Nouveau composant React : MissingDocuments.tsx

**Fonctionnalités :**
- Affiche la liste des salariés avec documents manquants
- Barre de recherche par nom, prénom ou email
- Tableau avec : nom, poste, site, documents manquants, actions
- Badges rouges pour chaque document manquant
- Bouton "Voir le profil" pour naviguer vers le détail du salarié
- Rafraîchissement automatique en temps réel
- Message de félicitations si tous les documents sont présents

### 3. Carte d'alerte sur le Dashboard RH

**Localisation :** RHDashboard.tsx (après la section "Notifications urgentes")

**Caractéristiques :**
- Fond dégradé rouge avec bordure rouge à gauche
- Affiche le nombre de salariés concernés
- Cliquable pour naviguer vers le détail
- N'apparaît que si au moins 1 salarié a des documents manquants
- Compteur mis à jour en temps réel

### 4. Nouvelle route dans l'application

**Route ajoutée :** `rh/documents-manquants`

**Type ajouté dans Sidebar.tsx :**
```typescript
| 'rh/documents-manquants'
```

## Navigation

### Depuis le Dashboard RH
1. La carte rouge "Documents manquants par salarié" s'affiche si des documents manquent
2. Cliquer sur la carte → redirige vers `rh/documents-manquants`

### Depuis la page Documents manquants
1. Tableau avec tous les salariés concernés
2. Bouton "Voir le profil" → redirige vers le détail du salarié (`rh/salaries`)

## Mise à jour en temps réel

Le système écoute les changements sur la table `document` et met à jour automatiquement :
- Le compteur sur le dashboard
- La liste des salariés avec documents manquants

## Fichiers modifiés

### Nouveaux fichiers
- `src/components/MissingDocuments.tsx` - Composant principal
- `create-missing-documents-function.sql` - Script SQL pour la fonction RPC

### Fichiers modifiés
- `src/components/Dashboard.tsx` - Ajout de l'import et de la route
- `src/components/Sidebar.tsx` - Ajout du type View
- `src/components/RHDashboard.tsx` - Ajout de la carte d'alerte et du compteur

## Installation

1. **Exécuter le script SQL dans Supabase :**
   - Ouvrir Supabase SQL Editor
   - Copier-coller le contenu du fichier `create-missing-documents-function.sql`
   - Exécuter le script

2. **Vérifier la fonction :**
   ```sql
   SELECT * FROM get_missing_documents_by_salarie();
   ```

3. **L'application est déjà compilée et prête à l'emploi !**

## Notes importantes

- Aucun fichier existant n'a été supprimé ou modifié de manière destructive
- La fonction SQL utilise `SECURITY DEFINER` pour un accès contrôlé
- Les documents avec statut 'refuse' ne sont pas comptés comme manquants
- Seuls les salariés avec statut 'actif' sont pris en compte
