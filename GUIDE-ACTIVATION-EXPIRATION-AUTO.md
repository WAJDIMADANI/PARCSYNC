# Guide d'activation du système d'expiration automatique des contrats

## Vue d'ensemble

Ce système détecte automatiquement les incidents de contrat CDD et avenants dont la date d'expiration est passée et les marque comme "expire" automatiquement à chaque chargement de la page incidents.

## Caractéristiques

✅ **Détection automatique** à chaque chargement de la page
✅ **Nouveau statut "expire"** avec onglet dédié en rouge
✅ **Incidents modifiables** même après expiration
✅ **Application rétroactive** sur tous les contrats existants
✅ **Historique conservé** de tous les changements

## Étape 1 : Exécuter le SQL dans Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez-collez le script suivant :

```sql
-- 1. Ajouter le statut "expire" au type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'incident_statut' AND e.enumlabel = 'expire'
  ) THEN
    ALTER TYPE incident_statut ADD VALUE 'expire';
  END IF;
END $$;

-- 2. Créer la fonction de détection et mise à jour automatique
CREATE OR REPLACE FUNCTION detect_and_expire_incidents()
RETURNS TABLE(
  incident_id uuid,
  profil_id uuid,
  ancien_statut incident_statut,
  nouveau_statut incident_statut,
  date_expiration date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incident_record RECORD;
  user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur système pour l'historique
  SELECT id INTO user_id
  FROM app_utilisateur
  WHERE email = 'system@rh-app.com'
  LIMIT 1;

  -- Si pas d'utilisateur système, utiliser NULL
  IF user_id IS NULL THEN
    user_id := NULL;
  END IF;

  -- Parcourir tous les incidents actifs avec une date d'expiration passée
  FOR incident_record IN
    SELECT
      i.id,
      i.profil_id,
      i.statut,
      i.date_expiration_originale,
      i.type_incident
    FROM incidents i
    WHERE i.statut = 'actif'
      AND i.date_expiration_originale IS NOT NULL
      AND i.date_expiration_originale < CURRENT_DATE
      AND i.type_incident IN ('contrat_cdd', 'avenant_1', 'avenant_2')
  LOOP
    -- Mettre à jour le statut vers "expire"
    UPDATE incidents
    SET
      statut = 'expire',
      updated_at = NOW()
    WHERE id = incident_record.id;

    -- Créer un historique de la modification
    INSERT INTO incident_historique (
      incident_id,
      ancien_statut,
      nouveau_statut,
      commentaire,
      modifie_par
    ) VALUES (
      incident_record.id,
      incident_record.statut,
      'expire',
      'Statut changé automatiquement : date d''expiration passée',
      user_id
    );

    -- Retourner les informations de l'incident modifié
    incident_id := incident_record.id;
    profil_id := incident_record.profil_id;
    ancien_statut := incident_record.statut;
    nouveau_statut := 'expire';
    date_expiration := incident_record.date_expiration_originale;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- 3. Appliquer la détection aux incidents existants (backfill)
SELECT * FROM detect_and_expire_incidents();
```

4. Cliquez sur **Run** pour exécuter le script

## Étape 2 : Vérifier les résultats

Après l'exécution, vous devriez voir dans les résultats SQL tous les incidents qui ont été marqués comme "expire".

Pour vérifier que tout fonctionne :

```sql
-- Voir tous les incidents expirés
SELECT
  i.id,
  p.prenom,
  p.nom,
  i.type_incident,
  i.date_expiration_originale,
  i.statut
FROM incidents i
JOIN profil p ON p.id = i.profil_id
WHERE i.statut = 'expire'
ORDER BY i.date_expiration_originale;
```

## Étape 3 : Tester dans l'application

1. Rechargez l'application (CTRL + F5)
2. Allez dans **Gestion des incidents**
3. Vous devriez voir un nouvel onglet **"Expirés"** en rouge
4. Cliquez dessus pour voir tous les contrats expirés

### Fonctionnalités de l'onglet Expirés

- **Badge rouge "EXPIRÉ"** sur chaque incident
- **Bordure rouge vif** autour de chaque carte
- **Actions disponibles** :
  - 📧 **Rappel** : Envoyer un email au salarié
  - ▶️ **En cours** : Marquer comme en cours de traitement
  - ✅ **Résoudre** : Marquer comme résolu avec nouvelle date
  - ❌ **Ignorer** : Ignorer l'incident

## Comment ça fonctionne

1. **À chaque chargement** de la page incidents, la fonction `detect_and_expire_incidents()` est appelée automatiquement
2. Elle **parcourt** tous les incidents avec statut "actif" et vérifie leur date d'expiration
3. Si la date est passée, elle **change le statut** vers "expire" automatiquement
4. Un **historique** est créé pour tracer chaque changement
5. Les incidents expirés **restent modifiables** manuellement

## Types d'incidents concernés

- ✅ **Contrat CDD** (contrat_cdd)
- ✅ **Avenant 1** (avenant_1)
- ✅ **Avenant 2** (avenant_2)

Les autres types d'incidents (titre_sejour, visite_medicale, permis_conduire) ne sont pas affectés par ce système.

## Dépannage

### L'onglet Expirés n'apparaît pas

1. Vérifiez que le SQL a été exécuté sans erreur
2. Videz le cache du navigateur (CTRL + F5)
3. Vérifiez les logs de la console du navigateur (F12)

### Les incidents ne passent pas en "expire"

Vérifiez que :
- La date d'expiration est bien dans le passé
- Le statut actuel est bien "actif"
- Le type d'incident est contrat_cdd, avenant_1 ou avenant_2

### Tester manuellement la fonction

```sql
-- Appeler manuellement la fonction
SELECT * FROM detect_and_expire_incidents();
```

## Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs SQL dans Supabase
2. Les logs de la console navigateur
3. Les permissions RLS sur la table incidents
