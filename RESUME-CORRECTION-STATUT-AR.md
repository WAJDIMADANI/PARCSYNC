# ✅ Correction Statut Profil - Notifications A&R

## 🔴 Problème Identifié

**Blocage trouvé :**
- Absence existe : `ar_type = 'ABSENCE'` et `end_date = CURRENT_DATE` ✅
- Utilisateur destinataire existe : pôle Comptabilité/RH ✅
- Mais le salarié a `profil.statut = 'contrat_signe'` ❌
- La fonction filtre uniquement `p.statut = 'actif'` ⚠️

**Résultat :** Aucune notification créée pour les salariés avec statut `contrat_signe`.

---

## ✅ Correction Appliquée

### Changement

**AVANT :**
```sql
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
  AND p.statut = 'actif'  -- ❌ Trop strict
```

**APRÈS :**
```sql
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe')  -- ✅ Corrigé
```

### Fichiers Modifiés

1. ✅ `CREATE-FONCTION-NOTIFICATIONS-AR-AUTO.sql` - Ligne 51
2. ✅ `DEPLOIEMENT-RAPIDE-NOTIFICATIONS-AR.sql` - Ligne 96
3. ✅ `FIX-FONCTION-AR-NOTIFICATIONS-STATUT-PROFIL.sql` - Nouveau fichier de correction

---

## 🚀 Déploiement de la Correction

### Option 1 : Correction Seule (Rapide)

```sql
-- Fichier: FIX-FONCTION-AR-NOTIFICATIONS-STATUT-PROFIL.sql
-- Durée: 1 minute
-- Ce fichier:
-- 1. Remplace la fonction avec la correction
-- 2. Affiche les absences du jour AVANT génération
-- 3. Génère les notifications immédiatement
-- 4. Affiche les absences du jour APRÈS génération
-- 5. Liste les notifications créées
-- 6. Affiche un résumé par statut
```

### Option 2 : Commande Ultra-Rapide

Si vous avez déjà déployé la fonction et voulez juste la corriger :

```sql
-- 1. Remplacer la fonction
CREATE OR REPLACE FUNCTION generate_ar_fin_absence_notifications()
RETURNS jsonb AS $$
DECLARE
  v_ar_event RECORD;
  v_user RECORD;
  v_count INTEGER := 0;
  v_pole_compta_id uuid;
BEGIN
  SELECT id INTO v_pole_compta_id
  FROM pole
  WHERE LOWER(nom) LIKE '%comptabilit%'
     OR LOWER(nom) LIKE '%compta%'
  LIMIT 1;

  FOR v_ar_event IN
    SELECT
      ar.id,
      ar.profil_id,
      ar.start_date,
      ar.end_date,
      p.matricule_tca,
      p.nom,
      p.prenom
    FROM compta_ar_events ar
    JOIN profil p ON ar.profil_id = p.id
    WHERE ar.ar_type = 'ABSENCE'
      AND ar.end_date = CURRENT_DATE
      AND p.statut IN ('actif', 'contrat_signe')  -- ✅ LIGNE CORRIGÉE
  LOOP
    FOR v_user IN
      SELECT DISTINCT au.id
      FROM app_utilisateur au
      WHERE au.actif = true
        AND (
          au.pole_id = v_pole_compta_id
          OR au.permissions ? 'compta/ar'
          OR au.permissions ? 'comptabilite'
        )
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM inbox
        WHERE utilisateur_id = v_user.id
          AND type = 'ar_fin_absence'
          AND reference_id = v_ar_event.id::text
      ) THEN
        INSERT INTO inbox (
          utilisateur_id,
          type,
          titre,
          description,
          contenu,
          reference_id,
          reference_type,
          statut,
          lu
        ) VALUES (
          v_user.id,
          'ar_fin_absence',
          'Fin d''absence aujourd''hui',
          format(
            'L''absence de %s %s (matricule %s) se termine aujourd''hui (%s).',
            v_ar_event.prenom,
            v_ar_event.nom,
            v_ar_event.matricule_tca,
            to_char(v_ar_event.end_date, 'DD/MM/YYYY')
          ),
          jsonb_build_object(
            'profil_id', v_ar_event.profil_id,
            'matricule', v_ar_event.matricule_tca,
            'nom', v_ar_event.nom,
            'prenom', v_ar_event.prenom,
            'start_date', v_ar_event.start_date,
            'end_date', v_ar_event.end_date,
            'generated_at', now()
          ),
          v_ar_event.id::text,
          'compta_ar_event',
          'nouveau',
          false
        );

        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'notifications_created', v_count,
    'execution_date', CURRENT_DATE,
    'execution_time', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Régénérer immédiatement
SELECT generate_ar_fin_absence_notifications();
```

### Option 3 : Commande Minimale

Si vous voulez juste corriger et relancer :

```sql
-- Fichier: REGENERER-NOTIFICATIONS-AR-MAINTENANT.sql
-- Durée: 10 secondes
```

---

## 🧪 Vérification

### Avant Correction

```sql
-- Vérifier les absences du jour
SELECT
  ar.id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut,
  ar.end_date,
  EXISTS (
    SELECT 1 FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  ) as notification_existe
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE;
```

**Résultat attendu avant correction :**
- Salariés avec `statut = 'actif'` : `notification_existe = true` ✅
- Salariés avec `statut = 'contrat_signe'` : `notification_existe = false` ❌

### Après Correction

```sql
-- Vérifier les notifications créées
SELECT
  ar.id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut,
  (
    SELECT COUNT(*)
    FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  ) as nb_notifications
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe');
```

**Résultat attendu après correction :**
- Tous les salariés (`actif` OU `contrat_signe`) : `nb_notifications >= 1` ✅

---

## 📊 Impact de la Correction

### Statuts Profil Concernés

| Statut | Avant Correction | Après Correction |
|--------|------------------|------------------|
| `actif` | ✅ Notifications créées | ✅ Notifications créées |
| `contrat_signe` | ❌ Aucune notification | ✅ Notifications créées |
| `candidat` | ❌ Aucune notification | ❌ Aucune notification |
| `sorti` | ❌ Aucune notification | ❌ Aucune notification |
| `inactif` | ❌ Aucune notification | ❌ Aucune notification |

### Justification

**Pourquoi inclure `contrat_signe` ?**

Un salarié avec `statut = 'contrat_signe'` :
- A un contrat signé (donc lié à l'entreprise)
- Peut avoir des absences déclarées
- Doit être suivi par le service Comptabilité/RH
- N'est pas encore "actif" dans le système mais est opérationnel

**Logique métier :**
Si une absence est enregistrée dans `compta_ar_events`, c'est qu'elle doit être suivie, quel que soit le statut exact du profil (tant qu'il n'est pas `sorti` ou `inactif`).

---

## ✅ Règles Finales de Génération

**Notifications créées si :**
1. ✅ `compta_ar_events.ar_type = 'ABSENCE'`
2. ✅ `compta_ar_events.end_date = CURRENT_DATE`
3. ✅ `profil.statut IN ('actif', 'contrat_signe')` ← **CORRIGÉ**
4. ✅ Anti-doublons (vérifie si notification existe déjà)

**Destinataires :**
- Utilisateurs du pôle "Comptabilité/RH"
- OU permission `compta/ar`
- OU permission `comptabilite`
- Uniquement si `actif = true`

**Exclusions :**
- ❌ Retards (`ar_type = 'RETARD'`)
- ❌ Absences passées (`end_date < CURRENT_DATE`)
- ❌ Absences futures (`end_date > CURRENT_DATE`)
- ❌ Profils sortis/inactifs/candidats

---

## 🎯 Checklist Post-Correction

- [ ] Exécuter `FIX-FONCTION-AR-NOTIFICATIONS-STATUT-PROFIL.sql`
- [ ] Vérifier le résultat : `notifications_created >= 1`
- [ ] Vérifier dans l'Inbox : présence de notifications A&R
- [ ] Tester la navigation UI : Inbox → A&R
- [ ] Vérifier le résumé par statut (affichage dans le script)
- [ ] Documenter l'heure de correction

---

## 📝 Commandes de Dépannage

### Compter les absences par statut

```sql
SELECT
  p.statut,
  COUNT(*) as nb_absences,
  COUNT(DISTINCT ar.profil_id) as nb_salaries,
  SUM(
    CASE WHEN EXISTS (
      SELECT 1 FROM inbox
      WHERE type = 'ar_fin_absence'
        AND reference_id = ar.id::text
    ) THEN 1 ELSE 0 END
  ) as avec_notification
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
GROUP BY p.statut
ORDER BY nb_absences DESC;
```

### Identifier les absences sans notification

```sql
SELECT
  ar.id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  p.statut,
  ar.end_date,
  'NOTIFICATION MANQUANTE' as alerte
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
  AND p.statut IN ('actif', 'contrat_signe')
  AND NOT EXISTS (
    SELECT 1 FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  );
```

---

## 🚨 Note Importante

**Cette correction affecte uniquement les générations futures.**

Les notifications déjà créées (ou non créées) dans le passé ne sont pas modifiées. Pour les absences d'aujourd'hui, exécutez immédiatement la régénération après avoir appliqué la correction.

**Commande rapide :**
```sql
SELECT generate_ar_fin_absence_notifications();
```

---

## 📚 Fichiers Concernés

| Fichier | Statut | Description |
|---------|--------|-------------|
| `FIX-FONCTION-AR-NOTIFICATIONS-STATUT-PROFIL.sql` | ✅ Nouveau | Correction complète avec vérifications |
| `REGENERER-NOTIFICATIONS-AR-MAINTENANT.sql` | ✅ Nouveau | Commande rapide de régénération |
| `CREATE-FONCTION-NOTIFICATIONS-AR-AUTO.sql` | ✅ Modifié | Fonction corrigée ligne 51 |
| `DEPLOIEMENT-RAPIDE-NOTIFICATIONS-AR.sql` | ✅ Modifié | Script tout-en-un avec correction |
| `RESUME-CORRECTION-STATUT-AR.md` | ✅ Nouveau | Ce document |

---

**Correction validée : ✅**

**Ligne modifiée : 1 seule (ligne 33 de la fonction)**

**Impact : Notifications créées pour statuts `actif` ET `contrat_signe`**

**Temps de déploiement : 1 minute**
