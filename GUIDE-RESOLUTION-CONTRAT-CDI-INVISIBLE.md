# Guide de résolution : Contrat CDI signé mais invisible

## Problème
Le contrat CDI de Jean Marie MOBA-BIKOMBO est visible et signé dans YouSign mais n'apparaît pas dans le bloc "Contrats signés" de l'application.

## Causes possibles

1. **Le webhook YouSign n'a pas mis à jour le statut**
   - Le webhook attend l'événement `signature_request.done`
   - Il met à jour le statut du contrat en "signe"
   - Si le webhook n'a pas reçu l'événement ou a échoué, le contrat reste avec un autre statut

2. **L'external_id ne correspond pas**
   - Le webhook utilise l'external_id pour trouver le contrat
   - Si l'ID ne correspond pas, le contrat ne sera pas mis à jour

3. **Problème de permissions RLS**
   - Les policies RLS peuvent empêcher l'affichage du contrat

## Étapes de diagnostic

### Étape 1 : Exécuter le diagnostic
Exécutez le fichier `DIAGNOSTIC-CONTRAT-CDI-MOBA.sql` dans l'éditeur SQL de Supabase.

Ce script va :
- Lister tous les contrats du salarié
- Vérifier les statuts et dates
- Vérifier les informations YouSign
- Vérifier les logs webhook

### Étape 2 : Analyser les résultats

**Vérifier le statut du contrat CDI :**
- Si le statut est `en_attente_signature` ou `envoye`, le webhook n'a pas mis à jour le contrat
- Si le statut est `signe`, le problème vient des permissions RLS ou de l'affichage

**Vérifier l'external_id :**
- Le `yousign_signature_request_id` doit correspondre à l'ID du contrat
- Si c'est différent, le webhook ne pourra pas mettre à jour le bon contrat

**Vérifier les logs webhook :**
- Cherchez des événements récents de type `signature_request.done`
- Vérifiez s'il y a des erreurs dans les logs

### Étape 3 : Corriger le problème

#### Solution 1 : Mettre à jour manuellement le statut
Si le webhook n'a pas fonctionné, exécutez `CORRIGER-CONTRAT-CDI-MOBA.sql`

Ce script va :
- Mettre le statut du contrat CDI en "signe"
- Ajouter la date de signature
- Rendre le contrat visible

#### Solution 2 : Vérifier les permissions RLS
Si le statut est déjà "signe", vérifiez les policies RLS :

```sql
-- Vérifier les policies sur la table contrat
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'contrat';

-- Tester l'accès au contrat
SELECT *
FROM contrat
WHERE id = 'ID_DU_CONTRAT';
```

#### Solution 3 : Forcer le téléchargement du document signé
Si le contrat est signé mais le PDF n'est pas téléchargé :

```sql
-- Vérifier si le document signé est présent
SELECT
  id,
  type,
  statut,
  yousign_signature_request_id,
  storage_path
FROM contrat
WHERE type = 'cdi'
  AND profil_id = (
    SELECT id FROM profil
    WHERE nom ILIKE '%MOBA%'
  );
```

Si `storage_path` est NULL, le document n'a pas été téléchargé depuis YouSign.

## Vérification finale

Après correction, rafraîchissez la page de l'application et vérifiez que :
1. Le contrat CDI apparaît dans le bloc "Contrats signés"
2. Le statut est "Signé"
3. La date de signature est correcte
4. Le document PDF est téléchargeable

## Prévention future

Pour éviter ce problème à l'avenir :

1. **Vérifier les logs du webhook YouSign**
   - Consultez régulièrement les logs de la fonction edge `yousign-webhook`
   - Vérifiez que les événements `signature_request.done` sont bien reçus

2. **Monitorer les contrats en attente**
   - Créez une vue ou un rapport des contrats avec statut `en_attente_signature` depuis plus de X jours
   - Vérifiez manuellement si ces contrats sont signés dans YouSign

3. **Améliorer le webhook**
   - Ajouter une retry logic si la mise à jour échoue
   - Envoyer des notifications en cas d'échec
   - Logger tous les événements dans une table dédiée

## Fichiers concernés

- `DIAGNOSTIC-CONTRAT-CDI-MOBA.sql` : Script de diagnostic
- `CORRIGER-CONTRAT-CDI-MOBA.sql` : Script de correction
- `supabase/functions/yousign-webhook/index.ts` : Code du webhook
