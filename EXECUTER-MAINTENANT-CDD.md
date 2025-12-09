# GUIDE RAPIDE - Correction Notifications CDD

## SCRIPT SQL À EXÉCUTER

Voici le script SQL complet à copier-coller dans Supabase :

---

```sql
/*
  CORRECTION: Notifications CDD à 30 jours
  Copiez et exécutez ce script COMPLET dans l'éditeur SQL de Supabase
*/

-- ========================================
-- ÉTAPE 1: Mettre à jour la fonction
-- ========================================

CREATE OR REPLACE FUNCTION generate_expiration_notifications()
RETURNS void AS $$
DECLARE
  v_profil RECORD;
  v_contrat RECORD;
  v_date_notif date;
BEGIN
  -- 1. Notifications for titre de sejour (30 days before expiration)
  FOR v_profil IN
    SELECT id, titre_sejour_fin_validite
    FROM profil
    WHERE titre_sejour_fin_validite IS NOT NULL
      AND titre_sejour_fin_validite > CURRENT_DATE
      AND titre_sejour_fin_validite <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.titre_sejour_fin_validite - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'titre_sejour', v_profil.id, v_profil.titre_sejour_fin_validite, v_date_notif,
           jsonb_build_object('document', 'Titre de séjour')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'titre_sejour'
        AND date_echeance = v_profil.titre_sejour_fin_validite
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 2. Notifications for medical visit (30 days before expiration)
  FOR v_profil IN
    SELECT id, date_fin_visite_medicale
    FROM profil
    WHERE date_fin_visite_medicale IS NOT NULL
      AND date_fin_visite_medicale > CURRENT_DATE
      AND date_fin_visite_medicale <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.date_fin_visite_medicale - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'visite_medicale', v_profil.id, v_profil.date_fin_visite_medicale, v_date_notif,
           jsonb_build_object('document', 'Visite médicale')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'visite_medicale'
        AND date_echeance = v_profil.date_fin_visite_medicale
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 3. Notifications for driving license (30 days before expiration)
  FOR v_profil IN
    SELECT id, permis_conduire_expiration
    FROM profil
    WHERE permis_conduire_expiration IS NOT NULL
      AND permis_conduire_expiration > CURRENT_DATE
      AND permis_conduire_expiration <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_profil.permis_conduire_expiration - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'permis_conduire', v_profil.id, v_profil.permis_conduire_expiration, v_date_notif,
           jsonb_build_object('document', 'Permis de conduire')
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_profil.id
        AND type = 'permis_conduire'
        AND date_echeance = v_profil.permis_conduire_expiration
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

  -- 4. Notifications for CDD contracts ending (30 days before end)
  -- *** MODIFIÉ: 30 JOURS AU LIEU DE 15 JOURS ***
  FOR v_contrat IN
    SELECT id, profil_id, date_fin
    FROM contrat
    WHERE type = 'CDD'
      AND date_fin IS NOT NULL
      AND date_fin > CURRENT_DATE
      AND date_fin <= CURRENT_DATE + INTERVAL '30 days'
      AND statut = 'actif'
  LOOP
    v_date_notif := v_contrat.date_fin - INTERVAL '30 days';

    INSERT INTO notification (type, profil_id, date_echeance, date_notification, metadata)
    SELECT 'contrat_cdd', v_contrat.profil_id, v_contrat.date_fin, v_date_notif,
           jsonb_build_object('document', 'Contrat CDD', 'contrat_id', v_contrat.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM notification
      WHERE profil_id = v_contrat.profil_id
        AND type = 'contrat_cdd'
        AND date_echeance = v_contrat.date_fin
        AND statut IN ('active', 'email_envoye')
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ÉTAPE 2: Exécuter la fonction
-- ========================================

SELECT generate_expiration_notifications();

-- ========================================
-- ÉTAPE 3: Vérification
-- ========================================

SELECT
  'Notifications CDD créées avec succès' as message,
  COUNT(*) as nombre_notifications
FROM notification
WHERE type = 'contrat_cdd'
  AND statut IN ('active', 'email_envoye');
```

---

## INSTRUCTIONS EN 3 ÉTAPES

1. **Ouvrir Supabase**
   - Connectez-vous à votre projet Supabase
   - Allez dans **SQL Editor**

2. **Copier-coller le script**
   - Copiez le script SQL ci-dessus (TOUT le contenu)
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **Run**

3. **Vérifier dans l'application**
   - Retournez dans votre application
   - Allez dans **Notifications** → **Contrats CDD**
   - Les notifications CDD devraient maintenant apparaître

---

## RÉSULTAT ATTENDU

Après l'exécution, vous verrez :
- "Function created successfully"
- Le nombre de notifications CDD créées
- Liste des notifications avec dates d'échéance

Si le nombre de notifications = 0, cela signifie qu'il n'y a actuellement aucun contrat CDD se terminant dans les 30 prochains jours.

---

## POUR EXÉCUTER AUTOMATIQUEMENT CHAQUE JOUR

Si vous voulez que les notifications se génèrent automatiquement, ajoutez ce cron job (nécessite pg_cron) :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-notifications-daily',
  '0 6 * * *',
  $$ SELECT generate_expiration_notifications(); $$
);
```
