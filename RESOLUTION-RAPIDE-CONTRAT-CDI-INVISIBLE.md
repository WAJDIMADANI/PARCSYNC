# Résolution rapide : Contrat CDI invisible

## Situation
Vous avez créé et envoyé un CDI pour Jean Marie MOBA-BIKOMBO hier via YouSign. Le contrat est visible et signé dans YouSign, mais il n'apparaît pas dans le bloc "Contrats signés" de votre application.

## Solution rapide en 3 étapes

### Étape 1 : Diagnostic (2 minutes)

Exécutez ce script dans l'éditeur SQL de Supabase :

```sql
-- Trouver le contrat de Jean Marie MOBA-BIKOMBO
SELECT
  c.id,
  c.type,
  c.statut,
  c.date_debut,
  c.date_fin,
  c.date_signature,
  c.yousign_signature_request_id,
  c.created_at,
  c.updated_at,
  p.nom,
  p.prenom,
  p.email
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND p.prenom ILIKE '%Jean%'
  AND c.type = 'cdi'
ORDER BY c.created_at DESC
LIMIT 1;
```

**Analysez le résultat :**

1. **Si le contrat n'existe pas** → Le contrat n'a pas été créé correctement. Recréez-le.

2. **Si le statut est `en_attente_signature` ou `envoye`** → Le webhook YouSign n'a pas mis à jour le statut. Passez à l'Étape 2.

3. **Si le statut est `signe`** → Le contrat existe avec le bon statut. Le problème vient de l'affichage ou des permissions RLS. Passez à l'Étape 3.

### Étape 2 : Correction du statut (1 minute)

Si le statut n'est pas "signe", exécutez ce script :

```sql
-- Mettre à jour le statut du contrat CDI
UPDATE contrat
SET
  statut = 'signe',
  date_signature = COALESCE(date_signature, CURRENT_DATE),
  updated_at = NOW()
WHERE id IN (
  SELECT c.id
  FROM contrat c
  INNER JOIN profil p ON p.id = c.profil_id
  WHERE p.nom ILIKE '%MOBA%'
    AND p.prenom ILIKE '%Jean%'
    AND c.type = 'cdi'
  ORDER BY c.created_at DESC
  LIMIT 1
)
RETURNING id, type, statut, date_signature;
```

Rafraîchissez la page de l'application et vérifiez si le contrat apparaît maintenant.

### Étape 3 : Vérification des permissions RLS (si le statut était déjà "signe")

Si le statut était déjà "signe" mais le contrat n'apparaît pas, vérifiez les permissions :

```sql
-- Tester l'accès au contrat
SET request.jwt.claims TO '{"sub": "ID_DE_VOTRE_UTILISATEUR"}';

SELECT
  c.id,
  c.type,
  c.statut,
  c.date_signature,
  p.nom,
  p.prenom
FROM contrat c
INNER JOIN profil p ON p.id = c.profil_id
WHERE p.nom ILIKE '%MOBA%'
  AND c.type = 'cdi';
```

Si cette requête ne retourne rien, il y a un problème de permissions RLS.

## Vérification finale

Après avoir appliqué la correction :

1. Rafraîchissez la page de l'application
2. Allez dans "Gestion de Contrats" > "Liste des contrats"
3. Filtrez par statut "Signé"
4. Recherchez "MOBA"

Le contrat CDI devrait maintenant apparaître.

## Pourquoi ce problème arrive ?

Le webhook YouSign n'a peut-être pas reçu l'événement `signature_request.done` ou a échoué lors de la mise à jour du contrat. Cela peut arriver si :

- Le webhook n'est pas correctement configuré dans YouSign
- Il y a eu une erreur réseau temporaire
- L'ID du contrat (external_id) ne correspond pas

## Prévention future

Pour éviter ce problème, vérifiez régulièrement :

1. Les logs du webhook YouSign dans le dashboard Supabase
2. Les contrats en attente de signature depuis plus de 24h
3. Que les événements webhook sont bien reçus

## Fichiers utiles

- `DIAGNOSTIC-CONTRAT-CDI-MOBA.sql` : Diagnostic complet
- `CORRIGER-CONTRAT-CDI-MOBA.sql` : Correction automatique
- `VERIFIER-LOGS-WEBHOOK-MOBA.sql` : Vérification des logs webhook
- `GUIDE-RESOLUTION-CONTRAT-CDI-INVISIBLE.md` : Guide détaillé complet
