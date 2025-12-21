# Correction de la fonction get_avenants_expires

## Qu'est-ce qui a été corrigé ?

La fonction `get_avenants_expires()` a été mise à jour pour :

1. **Utilisation correcte des colonnes de la table profil**
   - Les dates d'avenant sont dans `profil` : `p.avenant_1_date_fin` et `p.avenant_2_date_fin`
   - LEFT JOIN avec `contrat` pour récupérer les informations de contrat

2. **Exclure complètement les salariés en CDI**
   - Exclusion si `type='cdi'` OU `date_fin IS NULL`
   - Utilisation de `NOT EXISTS` pour vérifier tous les contrats du profil

3. **Calcul unifié de la date d'expiration**
   - Une seule date : `GREATEST(p.avenant_2_date_fin, p.avenant_1_date_fin)`
   - Avenant 2 prioritaire sur Avenant 1
   - Retourne uniquement si `date_expiration_reelle < CURRENT_DATE`

4. **Simplification de la logique**
   - Suppression des CTEs complexes
   - Une seule requête directe
   - Ajout de `matricule_tca` au retour

## Fichier SQL à exécuter

Le fichier mis à jour est : `create-get-avenants-expires-function.sql`

## Comment exécuter la correction

### Option 1 : Via l'éditeur SQL Supabase

1. Ouvrir le Dashboard Supabase
2. Aller dans "SQL Editor"
3. Copier tout le contenu du fichier `create-get-avenants-expires-function.sql`
4. Cliquer sur "Run"

### Option 2 : Via psql (ligne de commande)

```bash
psql "votre-connection-string" -f create-get-avenants-expires-function.sql
```

## Vérification après exécution

```sql
-- Tester la fonction
SELECT * FROM get_avenants_expires();

-- Vérifier qu'aucun CDI n'apparaît
SELECT
  ae.*,
  c.type,
  c.date_fin
FROM get_avenants_expires() ae
LEFT JOIN contrat c ON c.profil_id = ae.profil_id
WHERE LOWER(c.type) = 'cdi' OR c.date_fin IS NULL;
-- Doit retourner 0 lignes

-- Compter les avenants expirés
SELECT COUNT(*) as total_avenants_expires
FROM get_avenants_expires();
```

## Impact sur l'UI

L'interface `IncidentsList.tsx` a été mise à jour pour :

- Afficher un seul onglet "Avenant" (pas de distinction avenant 1 / avenant 2)
- Utiliser le type `avenant_expirer` pour tous les avenants expirés
- Afficher le compteur total dans le badge

Après l'exécution du SQL, rechargez simplement la page des incidents pour voir les changements.

## Résultat attendu

- Badge "Avenant" affiche le total des avenants expirés (ex: 61)
- Aucun salarié en CDI n'apparaît dans cet onglet
- Aucun contrat avec `date_fin IS NULL` n'apparaît
- Une seule date d'expiration par salarié (la plus récente entre avenant 1 et 2)
