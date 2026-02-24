# Fix Urgent - Incidents contrats expirés obsolètes

## Problème

Des profils avec un **CDI signé/actif** apparaissent encore dans **Incidents > Contrats expirés** à cause de leurs anciens CDD/avenants expirés.

**Exemple concret :** Didier RENARD a un CDI signé, mais des incidents `contrat_expire` existent encore sur ses anciens avenants.

## Règle métier appliquée

Un profil ne doit **PAS** apparaître dans "Contrats expirés" si :

1. Il existe un **CDI signé/actif** (`statut IN ('signe','actif')`)
2. Ce CDI a `date_fin IS NULL` (CDI ouvert)
3. Ce CDI commence **le jour même ou après** la fin du CDD/avenant expiré (couverture temporelle)

**Formule :**
```
CDD/avenant expiré + CDI signé/actif ensuite = PAS d'incident affiché
```

## Solution en 1 étape

### Exécuter le script SQL

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu du fichier : `FIX-INCIDENTS-CONTRAT-OBSOLETES.sql`
3. Cliquez sur **Run**

Le script s'occupe de tout automatiquement !

## Ce que fait le script

### 1. Corrige `get_cdd_expires()`
- Vérifie si un CDI **couvre** la période après l'expiration du CDD
- N'affiche le CDD expiré que s'il n'y a **PAS** de CDI couvrant
- Critères CDI couvrant : `statut IN ('actif','signe','signed')` + `date_fin IS NULL` + `date_debut >= date_expiration_cdd`

### 2. Corrige `get_avenants_expires()`
- Même logique pour les avenants expirés
- Vérifie la couverture par un CDI signé/actif
- Exclut les avenants couverts par un CDI

### 3. Crée `resoudre_incidents_contrats_obsoletes()`
- Fonction pour résoudre automatiquement les incidents obsolètes
- Identifie tous les incidents `contrat_expire` couverts par un CDI
- Les passe en statut `resolu` avec commentaire explicite

### 4. Ajoute un trigger automatique
- `trigger_resoudre_incidents_obsoletes_sur_cdi()`
- S'active quand un CDI devient signé/actif
- Résout automatiquement tous les incidents couverts par ce nouveau CDI
- **Prévention** : Plus besoin d'intervention manuelle !

### 5. BACKFILL immédiat
- Résout tous les incidents existants obsolètes (ex: Didier RENARD)
- Affiche la liste des incidents résolus
- Met à jour les compteurs automatiquement

### 6. Vérifications
- Compte les incidents résolus
- Liste les profils avec CDI sans incidents actifs
- Test spécifique pour Didier RENARD

## Résultats attendus

### Avant
```
❌ Didier RENARD avec CDI signé apparaît dans "Contrats expirés"
❌ Incidents contrat_expire actifs malgré CDI en place
❌ Compteurs d'incidents gonflés artificiellement
❌ Confusion pour les RH
```

### Après
```
✅ Didier RENARD avec CDI n'apparaît plus dans "Contrats expirés"
✅ Incidents obsolètes marqués comme "resolu"
✅ Compteurs corrects (uniquement vrais cas sans CDI)
✅ Clarté pour les RH
```

## Exemple de vérification après exécution

### Dans la console SQL (résultat attendu)
```sql
-- Résolution des incidents obsolètes existants
incident_id | profil_nom | profil_prenom | date_expiration | cdi_date_debut | action
xxxx-xxxx   | RENARD     | Didier        | 2024-12-31      | 2025-01-01     | Résolu automatiquement

-- Incidents résolus
info              | nombre
Incidents résolus | 15

-- Profils avec CDI sans incidents actifs
info                                    | nombre
Profils avec CDI sans incidents actifs  | 8

-- Test Didier RENARD
nom    | prenom | contrat_type | contrat_statut | cdi_date_debut | cdi_date_fin | incidents_actifs
RENARD | Didier | CDI          | signe          | 2025-01-01     | null         | 0
```

### Dans l'interface
1. Allez dans **Incidents** → **Contrats expirés**
2. Cherchez "Didier RENARD"
3. ✅ Il n'apparaît plus dans la liste
4. Le compteur a diminué

## Architecture de la solution

### Flux de décision
```
CDD/Avenant expiré détecté
    ↓
Existe-t-il un CDI signé/actif ?
    ↓ OUI
    CDI.date_fin IS NULL ?
        ↓ OUI
        CDI.date_debut >= date_expiration ?
            ↓ OUI
            ✅ EXCLURE (pas d'incident)
            ↓ NON
            ❌ AFFICHER (trou de couverture)
    ↓ NON
    ❌ AFFICHER (vrai CDD expiré)
```

### Trigger automatique
```
Nouveau CDI créé/signé
    ↓
Chercher incidents contrat_expire du profil
    ↓
Où date_expiration_originale <= CDI.date_debut
    ↓
Marquer comme "resolu" automatiquement
    ↓
✅ Prévention active !
```

## Cas d'usage couverts

### ✅ Cas 1 : CDI après CDD
- CDD du 01/01/2024 au 31/12/2024
- CDI du 01/01/2025 (date_fin NULL)
- **Résultat** : Pas d'incident le 31/12/2024

### ✅ Cas 2 : CDI le même jour
- CDD jusqu'au 31/12/2024
- CDI du 31/12/2024 (date_fin NULL)
- **Résultat** : Pas d'incident

### ✅ Cas 3 : Avenant puis CDI
- Avenant 1 jusqu'au 30/06/2024
- Avenant 2 jusqu'au 31/12/2024
- CDI du 01/01/2025
- **Résultat** : Pas d'incident

### ❌ Cas 4 : Trou de couverture (AFFICHÉ)
- CDD jusqu'au 31/12/2024
- CDI du 15/01/2025 (date_fin NULL)
- **Résultat** : Incident affiché (trou du 01/01 au 14/01)

### ❌ Cas 5 : Pas de CDI (AFFICHÉ)
- CDD jusqu'au 31/12/2024
- Pas de CDI
- **Résultat** : Incident affiché (vrai CDD non renouvelé)

## Maintenance continue

### Le trigger s'occupe de tout
- Création d'un CDI → Auto-résolution des incidents couverts
- Signature d'un CDI en attente → Auto-résolution
- Activation d'un CDI → Auto-résolution

**Plus besoin d'intervention manuelle !**

## Diagnostic si besoin

Pour vérifier un profil spécifique :

```sql
-- Vérifier les contrats d'un profil
SELECT
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  CASE
    WHEN LOWER(c.type) = 'cdi' AND c.date_fin IS NULL THEN '✓ CDI ouvert'
    ELSE 'CDD/Avenant'
  END as categorie
FROM profil p
INNER JOIN contrat c ON c.profil_id = p.id
WHERE p.nom ILIKE '%NOM%'
  AND p.prenom ILIKE '%PRENOM%'
ORDER BY c.date_debut DESC;

-- Vérifier les incidents du profil
SELECT
  i.type,
  i.statut,
  i.date_expiration_originale,
  i.commentaire_resolution
FROM profil p
INNER JOIN incident i ON i.profil_id = p.id
WHERE p.nom ILIKE '%NOM%'
  AND p.prenom ILIKE '%PRENOM%'
  AND i.type = 'contrat_expire'
ORDER BY i.date_expiration_originale DESC;
```

## Critères d'acceptation

✅ **Critère 1** : Profil avec CDI signé/actif (date_fin NULL) n'apparaît plus dans "Contrats expirés"

✅ **Critère 2** : Vrais cas sans CDI (CDD réellement non renouvelé) restent visibles

✅ **Critère 3** : Compteurs de l'onglet incidents diminuent et deviennent cohérents

✅ **Critère 4** : Auto-résolution lors de la création/signature d'un CDI

✅ **Critère 5** : Backfill des incidents existants (ex: Didier RENARD)

## Fichiers liés

- `FIX-INCIDENTS-CONTRAT-OBSOLETES.sql` - Script SQL complet ⭐
- `DIAGNOSTIC_INCIDENTS_OBSOLETES.sql` - Diagnostic détaillé (à créer si besoin)
