# Instructions pour vérifier pourquoi il n'y a que 3 notifications

## Problème
Tu ne vois que 3 notifications au lieu de toutes les notifications attendues.

## Diagnostic: Vérifier les données dans la base

### 1. Vérifier combien de profils ont des dates d'expiration dans les 30 prochains jours

Exécute ces requêtes dans Supabase SQL Editor:

```sql
-- Titres de séjour qui expirent dans les 30 prochains jours
SELECT
  id,
  prenom,
  nom,
  titre_sejour_fin_validite,
  statut,
  (titre_sejour_fin_validite - CURRENT_DATE) as jours_restants
FROM profil
WHERE titre_sejour_fin_validite IS NOT NULL
  AND titre_sejour_fin_validite > CURRENT_DATE
  AND titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
  AND statut = 'actif'
ORDER BY titre_sejour_fin_validite;
```

```sql
-- Visites médicales qui expirent dans les 30 prochains jours
SELECT
  id,
  prenom,
  nom,
  date_fin_visite_medicale,
  statut,
  (date_fin_visite_medicale - CURRENT_DATE) as jours_restants
FROM profil
WHERE date_fin_visite_medicale IS NOT NULL
  AND date_fin_visite_medicale > CURRENT_DATE
  AND date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days'
  AND statut = 'actif'
ORDER BY date_fin_visite_medicale;
```

```sql
-- Permis de conduire qui expirent dans les 30 prochains jours
SELECT
  id,
  prenom,
  nom,
  permis_conduire_expiration,
  statut,
  (permis_conduire_expiration - CURRENT_DATE) as jours_restants
FROM profil
WHERE permis_conduire_expiration IS NOT NULL
  AND permis_conduire_expiration > CURRENT_DATE
  AND permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days'
  AND statut = 'actif'
ORDER BY permis_conduire_expiration;
```

```sql
-- Contrats CDD qui se terminent dans les 15 prochains jours
SELECT
  c.id,
  p.prenom,
  p.nom,
  c.date_fin,
  c.statut,
  (c.date_fin - CURRENT_DATE) as jours_restants
FROM contrat c
JOIN profil p ON c.profil_id = p.id
WHERE c.type = 'CDD'
  AND c.date_fin IS NOT NULL
  AND c.date_fin > CURRENT_DATE
  AND c.date_fin <= CURRENT_DATE + INTERVAL '15 days'
  AND c.statut = 'actif'
ORDER BY c.date_fin;
```

### 2. Vérifier les notifications existantes

```sql
-- Voir toutes les notifications dans la table
SELECT
  n.id,
  n.type,
  p.prenom,
  p.nom,
  n.date_echeance,
  n.statut,
  (n.date_echeance - CURRENT_DATE) as jours_restants,
  n.created_at
FROM notification n
JOIN profil p ON n.profil_id = p.id
ORDER BY n.date_echeance;
```

### 3. Regénérer les notifications

Si tu constates qu'il devrait y avoir plus de notifications, relance la fonction:

```sql
-- Supprimer les anciennes notifications pour retester (ATTENTION: ne faire que pour les tests!)
-- DELETE FROM notification;

-- Générer les notifications
SELECT generate_expiration_notifications();

-- Vérifier le résultat
SELECT COUNT(*), type
FROM notification
GROUP BY type;
```

## Raisons possibles pour seulement 3 notifications

1. **Pas assez de données de test**: Il n'y a vraiment que 3 documents qui expirent dans les délais
   - Solution: Ajouter des dates d'expiration de test dans la table profil

2. **Le champ permis_conduire_expiration n'existe pas encore**: Si tu n'as pas exécuté la migration `add-permis-conduire-field.sql`
   - Solution: Exécuter cette migration

3. **Les profils ont statut différent de 'actif'**: La fonction ne regarde que les profils actifs
   - Solution: Vérifier le statut des profils avec `SELECT DISTINCT statut FROM profil;`

4. **Les dates sont trop loin dans le futur**: Les notifications ne se déclenchent que 30 jours avant
   - Solution: Vérifier les dates avec les requêtes ci-dessus

## Ajouter des données de test

Si tu veux tester avec plus de notifications, ajoute des dates de test:

```sql
-- Exemple: ajouter des dates d'expiration pour tester
UPDATE profil
SET titre_sejour_fin_validite = CURRENT_DATE + INTERVAL '25 days'
WHERE id = 'REMPLACER_PAR_UN_ID_REEL'
  AND statut = 'actif';

UPDATE profil
SET date_fin_visite_medicale = CURRENT_DATE + INTERVAL '20 days'
WHERE id = 'REMPLACER_PAR_UN_ID_REEL'
  AND statut = 'actif';

UPDATE profil
SET permis_conduire_expiration = CURRENT_DATE + INTERVAL '15 days'
WHERE id = 'REMPLACER_PAR_UN_ID_REEL'
  AND statut = 'actif';
```

## Vérification finale

Après avoir ajouté des données de test, relance:

```sql
SELECT generate_expiration_notifications();
```

Et vérifie le nombre de notifications:

```sql
SELECT type, COUNT(*) as nombre
FROM notification
WHERE statut IN ('active', 'email_envoye')
GROUP BY type;
```
