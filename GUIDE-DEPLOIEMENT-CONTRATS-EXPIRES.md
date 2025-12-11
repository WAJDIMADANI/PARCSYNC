# Guide de déploiement - Système de gestion des contrats expirés

## Vue d'ensemble

Ce système permet de gérer automatiquement les incidents pour tous les contrats expirés (CDD + avenants) dans l'onglet **Incidents** de ParcSync.

### Ce qui a été implémenté

1. **Modification de la table `incident`**
   - Ajout d'une colonne `contrat_id` pour lier les incidents aux contrats
   - Ajout du type `contrat_expire` pour les contrats expirés
   - Ajout du statut `expire` pour les incidents de contrats

2. **Création automatique des incidents**
   - Fonction `generate_expired_contract_incidents()` qui génère tous les incidents manquants
   - Protection anti-doublons
   - Gestion des CDD et avenants

3. **Système automatique quotidien**
   - Détection et création automatique des nouveaux contrats expirés
   - Mise à jour des statuts existants

4. **Interface utilisateur**
   - Affichage des contrats expirés dans l'onglet "Incidents"
   - Badge "EXPIRÉ" avec texte "Contrat expiré - Nécessite une action"
   - Distinction entre "Contrat CDD" et "Avenant au contrat"
   - Boutons d'action: Rappel / En cours / Résoudre / Ignorer

## Étape 1: Déployer la migration SQL

### Dans l'éditeur SQL de Supabase:

1. Ouvrir le fichier `create-expired-contracts-incidents-system.sql`
2. Copier tout le contenu
3. Aller dans Supabase > SQL Editor
4. Coller le contenu
5. Cliquer sur "Run"

### Ce que fait la migration:

- ✅ Ajoute la colonne `contrat_id` à la table `incident`
- ✅ Modifie les contraintes CHECK pour ajouter le type `contrat_expire` et le statut `expire`
- ✅ Crée la fonction `generate_expired_contract_incidents()` pour générer les incidents
- ✅ Crée la fonction `update_expired_contract_statuses()` pour mettre à jour les statuts
- ✅ **Génère immédiatement les 53 incidents** (22 CDD + 31 avenants)
- ✅ Crée une vue `v_incidents_contrats_expires` pour faciliter les requêtes
- ✅ Affiche un résumé des incidents créés

## Étape 2: Vérifier les résultats

### Vérifier le nombre d'incidents créés

Exécuter cette requête SQL:

```sql
SELECT
  COUNT(*) AS total_incidents_contrats_expires,
  COUNT(CASE WHEN lower(c.type) = 'cdd' THEN 1 END) AS incidents_cdd,
  COUNT(CASE WHEN lower(c.type) = 'avenant' THEN 1 END) AS incidents_avenants
FROM incident i
INNER JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire';
```

**Résultat attendu:**
- `total_incidents_contrats_expires`: 53
- `incidents_cdd`: 22
- `incidents_avenants`: 31

### Vérifier la répartition par statut

```sql
SELECT
  lower(c.type) AS type_contrat,
  COUNT(*) AS nb_incidents,
  COUNT(CASE WHEN i.statut = 'expire' THEN 1 END) AS nb_expires,
  COUNT(CASE WHEN i.statut = 'actif' THEN 1 END) AS nb_actifs
FROM incident i
INNER JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
GROUP BY lower(c.type)
ORDER BY nb_incidents DESC;
```

## Étape 3: Vérifier dans l'interface

### Dans l'application ParcSync:

1. Aller dans **Incidents** (menu de gauche)
2. Cliquer sur l'onglet **"Expirés"**
3. Vous devriez voir **53 incidents**:
   - 22 avec le label "Contrat CDD"
   - 31 avec le label "Avenant au contrat"

### Vérifications à faire:

- ✅ Le badge rouge "EXPIRÉ" est affiché
- ✅ Le texte "Contrat expiré - Nécessite une action" est présent
- ✅ Les boutons "Rappel", "En cours", "Résoudre", "Ignorer" fonctionnent
- ✅ Le filtre par type inclut "Contrats expirés (CDD + Avenants)"
- ✅ La recherche par nom/email fonctionne
- ✅ Cliquer sur "Voir le profil" ouvre la fiche du salarié

## Étape 4: Système automatique

### Option A: Avec pg_cron (si activé dans Supabase)

Si `pg_cron` est disponible, la migration a déjà créé le job automatique qui s'exécute tous les jours à 1h du matin.

Pour vérifier:

```sql
SELECT * FROM cron.job WHERE jobname = 'generate-expired-contract-incidents';
```

### Option B: Avec une Edge Function (recommandé)

Si `pg_cron` n'est pas disponible, créer une edge function qui s'exécute quotidiennement.

**Fichier: `supabase/functions/check-expired-contracts/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: result, error } = await supabase.rpc(
      "generate_expired_contract_incidents"
    );

    if (error) throw error;

    await supabase.rpc("update_expired_contract_statuses");

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: "Incidents de contrats expirés générés avec succès",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

Puis configurer un scheduler externe (comme GitHub Actions ou un service cron) pour appeler cette fonction quotidiennement.

## Étape 5: Tests manuels

### Test 1: Créer un incident manuellement

```sql
-- Exécuter la fonction manuellement pour tester
SELECT * FROM generate_expired_contract_incidents();
```

**Résultat attendu:**
```
contrats_expires | incidents_crees | incidents_existants
-----------------+-----------------+--------------------
              53 |               0 |                  53
```

(0 incidents créés car ils existent déjà)

### Test 2: Simuler un nouveau contrat expiré

```sql
-- Créer un contrat de test expiré
INSERT INTO contrat (profil_id, type, date_debut, date_fin, statut)
SELECT
  id,
  'cdd',
  '2024-01-01'::date,
  '2024-06-30'::date,
  'signe'
FROM profil
LIMIT 1
RETURNING id;

-- Générer l'incident
SELECT * FROM generate_expired_contract_incidents();

-- Vérifier que l'incident a été créé
SELECT * FROM incident WHERE type = 'contrat_expire' ORDER BY created_at DESC LIMIT 1;

-- Nettoyer le test
DELETE FROM contrat WHERE date_debut = '2024-01-01' AND date_fin = '2024-06-30';
```

### Test 3: Changer le statut d'un incident

Dans l'interface:
1. Aller dans Incidents > Expirés
2. Cliquer sur "En cours" pour un incident
3. Vérifier que l'incident apparaît maintenant dans l'onglet "En cours"
4. Cliquer sur "Résoudre"
5. Entrer une nouvelle date de validité
6. Vérifier que l'incident apparaît dans "Résolus"

## Étape 6: Monitoring

### Requêtes utiles pour le monitoring

**Compter les incidents par statut:**

```sql
SELECT
  statut,
  COUNT(*) AS nombre
FROM incident
WHERE type = 'contrat_expire'
GROUP BY statut
ORDER BY nombre DESC;
```

**Incidents les plus anciens:**

```sql
SELECT
  p.prenom,
  p.nom,
  c.type AS contrat_type,
  i.date_expiration_originale,
  CURRENT_DATE - i.date_expiration_originale AS jours_depuis_expiration,
  i.statut
FROM incident i
INNER JOIN profil p ON i.profil_id = p.id
INNER JOIN contrat c ON i.contrat_id = c.id
WHERE i.type = 'contrat_expire'
  AND i.statut IN ('actif', 'expire')
ORDER BY i.date_expiration_originale ASC
LIMIT 10;
```

**Statistiques globales:**

```sql
SELECT * FROM v_incidents_contrats_expires;
```

## Dépannage

### Problème: Les incidents n'apparaissent pas dans l'interface

**Solution:**
1. Vérifier que le frontend est à jour (build)
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier les permissions RLS dans Supabase

### Problème: Le nombre d'incidents ne correspond pas

**Solution:**
```sql
-- Vérifier combien de contrats sont expirés
SELECT COUNT(*) FROM contrat
WHERE lower(type) IN ('cdd', 'avenant')
  AND date_fin IS NOT NULL
  AND date_fin < CURRENT_DATE;

-- Vérifier combien d'incidents existent
SELECT COUNT(*) FROM incident WHERE type = 'contrat_expire';

-- Régénérer si nécessaire
SELECT * FROM generate_expired_contract_incidents();
```

### Problème: Erreur de contrainte CHECK

Si vous voyez une erreur sur le type ou le statut:

```sql
-- Vérifier les contraintes actuelles
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE 'incident_%_check';

-- Si nécessaire, relancer la partie modification des contraintes du script
```

## Résumé des fichiers modifiés

### SQL:
- ✅ `create-expired-contracts-incidents-system.sql` (nouveau)

### TypeScript:
- ✅ `src/components/IncidentsList.tsx` (modifié)

### Edge Functions (optionnel):
- ⚠️ `supabase/functions/check-expired-contracts/index.ts` (à créer si nécessaire)

## Support

En cas de problème, vérifier:
1. Les logs dans Supabase > Database > Logs
2. La console du navigateur pour les erreurs frontend
3. Les requêtes SQL ci-dessus pour diagnostiquer les données
