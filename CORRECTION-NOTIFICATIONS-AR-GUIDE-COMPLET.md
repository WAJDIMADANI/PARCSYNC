# Correction et Installation du Système de Notifications A&R

## Diagnostic du Problème

### ❌ Problème Identifié
Les notifications A&R dans l'Inbox affichent "Fin d'absence aujourd'hui" même quand `end_date` n'est pas égal à `CURRENT_DATE`.

### 🔍 Cause Racine
**Il n'existe AUCUNE fonction automatique de génération des notifications A&R.**

Le système de notifications pour les absences n'a jamais été implémenté. Les notifications visibles dans l'Inbox sont probablement des insertions manuelles de test qui ne respectent pas les règles métier.

---

## Solution en 3 Étapes

### Étape 1 : DIAGNOSTIC (obligatoire avant toute action)

Exécuter le script de diagnostic :
```bash
# Fichier: DIAGNOSTIC-NOTIFICATIONS-AR-COMPLETE.sql
```

Ce script va vous montrer :
- ✅ Toutes les notifications A&R existantes
- ✅ Leur validité (référence, type, date)
- ✅ Les absences qui devraient avoir une notification aujourd'hui
- ✅ Les fonctions/triggers existants (aucun normalement)

**Attendez les résultats avant de continuer.**

---

### Étape 2 : NETTOYAGE des notifications invalides

Une fois le diagnostic effectué :

```bash
# Fichier: NETTOYER-NOTIFICATIONS-AR-INVALIDES.sql
```

**Instructions détaillées dans le fichier :**
1. Exécuter le script complet (sections 1-2) pour voir les notifications invalides
2. Vérifier la liste et les compteurs
3. Si OK, décommenter la section `DELETE` (ligne 53-71)
4. Réexécuter pour effectuer le nettoyage
5. Vérifier les notifications restantes (section 4)

**Ce qui sera supprimé :**
- ❌ Notifications avec référence invalide (`compta_ar_events` n'existe plus)
- ❌ Notifications pour des retards (ar_type != 'ABSENCE')
- ❌ Notifications avec mauvaise date (end_date != CURRENT_DATE)

**Ce qui sera conservé :**
- ✅ Notifications valides pour les absences se terminant **aujourd'hui**

---

### Étape 3 : INSTALLATION de la génération automatique

```bash
# Fichier: CREATE-FONCTION-NOTIFICATIONS-AR-AUTO.sql
```

Cette fonction crée automatiquement les notifications A&R selon les règles :

**Critères de génération :**
- ✅ Uniquement `compta_ar_events.ar_type = 'ABSENCE'`
- ✅ Uniquement si `end_date = CURRENT_DATE` (aujourd'hui)
- ✅ Profil doit être `statut = 'actif'`
- ✅ Pas de doublons (vérifie si notification existe déjà)

**Destinataires :**
- Utilisateurs du pôle "Comptabilité/RH"
- OU utilisateurs avec permission `compta/ar`
- OU utilisateurs avec permission `comptabilite`
- Seulement si `actif = true`

**Contenu de la notification :**
- **Titre :** "Fin d'absence aujourd'hui"
- **Description :** "L'absence de [Prénom] [Nom] (matricule [XXX]) se termine aujourd'hui (DD/MM/YYYY)."
- **Contenu JSON :** Détails complets (profil_id, dates, etc.)
- **Reference_id :** ID de l'événement `compta_ar_events`
- **Reference_type :** `compta_ar_event`

**Automatisation (CRON) :**
```sql
-- Exécuter chaque jour à 6h00 AM
SELECT cron.schedule(
  'generate-ar-notifications',
  '0 6 * * *',
  'SELECT generate_ar_fin_absence_notifications();'
);
```

**Test manuel :**
```sql
-- Teste la génération pour AUJOURD'HUI uniquement
SELECT generate_ar_fin_absence_notifications();
```

---

## Vérification Post-Installation

### Test 1 : Créer un événement A&R de test

```sql
-- Créer une absence se terminant AUJOURD'HUI
INSERT INTO compta_ar_events (
  profil_id,
  ar_type,
  start_date,
  end_date,
  justifie,
  note
) VALUES (
  '<un_profil_id_existant>',
  'ABSENCE',
  CURRENT_DATE - INTERVAL '5 days',  -- Début il y a 5 jours
  CURRENT_DATE,                       -- Fin aujourd'hui
  false,
  'Test notification A&R'
);
```

### Test 2 : Générer la notification

```sql
-- Exécuter la fonction manuellement
SELECT generate_ar_fin_absence_notifications();
```

**Résultat attendu :**
```json
{
  "notifications_created": 1,
  "execution_date": "2026-03-30",
  "execution_time": "2026-03-30T14:30:00Z"
}
```

### Test 3 : Vérifier dans l'Inbox

```sql
SELECT
  i.id,
  i.titre,
  i.description,
  i.reference_id,
  ar.end_date,
  ar.end_date = CURRENT_DATE as is_today
FROM inbox i
JOIN compta_ar_events ar ON i.reference_id = ar.id::text
WHERE i.type = 'ar_fin_absence'
ORDER BY i.created_at DESC
LIMIT 5;
```

**Résultat attendu :**
- Titre = "Fin d'absence aujourd'hui"
- Description contient le nom du salarié et la date
- `is_today` = `true`

### Test 4 : Vérifier la navigation dans l'UI

1. Se connecter avec un compte ayant la permission `compta/ar`
2. Aller dans l'Inbox
3. Vérifier la carte "A&R" affiche le bon compteur
4. Cliquer sur le filtre "A&R"
5. Cliquer sur une notification A&R
6. **Résultat attendu :** Redirection vers Comptabilité > A&R avec la ligne surlignée

---

## Architecture Technique

### Schéma de Flux

```
┌─────────────────────────────────────┐
│  CRON (6h00 AM chaque jour)         │
│  SELECT generate_ar_fin_absence_    │
│         notifications();             │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Fonction: generate_ar_fin_absence_ │
│           notifications()            │
│                                      │
│  1. Recherche absences end_date =   │
│     CURRENT_DATE                     │
│  2. Filtre ar_type = 'ABSENCE'      │
│  3. Filtre profil actif             │
│  4. Vérifie pas de doublon          │
│  5. Insère dans inbox               │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Table: inbox                        │
│  - type = 'ar_fin_absence'          │
│  - reference_id = compta_ar_events. │
│                   id                 │
│  - reference_type = 'compta_ar_     │
│                      event'          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  UI: InboxPage                       │
│  1. Affiche carte A&R               │
│  2. Filtre ar_fin_absence           │
│  3. Au clic: navigation vers A&R    │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  UI: ComptabiliteARTab               │
│  1. Reçoit focus_ar_event_id        │
│  2. Calcule la bonne page           │
│  3. Scroll vers la ligne            │
│  4. Surligne 4 secondes             │
└─────────────────────────────────────┘
```

### Tables et Relations

```
compta_ar_events
├── id (uuid)
├── profil_id (→ profil.id)
├── ar_type ('ABSENCE' | 'RETARD')
├── start_date
├── end_date
└── ...

inbox
├── id (uuid)
├── utilisateur_id (→ app_utilisateur.id)
├── type ('ar_fin_absence')
├── reference_id (→ compta_ar_events.id::text)
├── reference_type ('compta_ar_event')
└── ...
```

---

## Maintenance et Monitoring

### Vérifier les notifications créées chaque jour

```sql
-- Notifications créées aujourd'hui
SELECT
  COUNT(*) as total,
  COUNT(DISTINCT reference_id) as evenements_uniques,
  COUNT(DISTINCT utilisateur_id) as destinataires_uniques
FROM inbox
WHERE type = 'ar_fin_absence'
  AND created_at::date = CURRENT_DATE;
```

### Vérifier les absences sans notification

```sql
-- Absences se terminant aujourd'hui sans notification
SELECT
  ar.id,
  p.matricule_tca,
  p.nom,
  p.prenom,
  ar.end_date
FROM compta_ar_events ar
JOIN profil p ON ar.profil_id = p.id
WHERE ar.ar_type = 'ABSENCE'
  AND ar.end_date = CURRENT_DATE
  AND p.statut = 'actif'
  AND NOT EXISTS (
    SELECT 1 FROM inbox
    WHERE type = 'ar_fin_absence'
      AND reference_id = ar.id::text
  );
```

### Vérifier le CRON

```sql
-- Liste des cron jobs actifs
SELECT
  jobname,
  schedule,
  command,
  active,
  last_run,
  next_run
FROM cron.job
WHERE jobname LIKE '%ar%'
   OR command ILIKE '%ar%notification%'
ORDER BY next_run;
```

---

## Dépannage

### Problème : Aucune notification créée

**Causes possibles :**
1. Aucune absence ne se termine aujourd'hui
2. CRON non activé
3. Utilisateurs sans permission `compta/ar`

**Solution :**
```sql
-- Vérifier les absences du jour
SELECT * FROM compta_ar_events
WHERE ar_type = 'ABSENCE'
  AND end_date = CURRENT_DATE;

-- Vérifier le CRON
SELECT * FROM cron.job WHERE jobname = 'generate-ar-notifications';

-- Vérifier les utilisateurs destinataires
SELECT au.id, au.email, au.permissions
FROM app_utilisateur au
WHERE au.actif = true
  AND (
    au.permissions ? 'compta/ar'
    OR au.permissions ? 'comptabilite'
  );
```

### Problème : Notifications en double

**Cause :** Fonction exécutée plusieurs fois.

**Solution :**
```sql
-- Supprimer les doublons (garder le plus récent)
DELETE FROM inbox
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY utilisateur_id, reference_id
             ORDER BY created_at DESC
           ) as rn
    FROM inbox
    WHERE type = 'ar_fin_absence'
  ) t
  WHERE rn > 1
);
```

---

## Résumé des Fichiers

| Fichier | Usage | Obligatoire |
|---------|-------|-------------|
| `DIAGNOSTIC-NOTIFICATIONS-AR-COMPLETE.sql` | Analyser l'état actuel | ✅ OUI (1er) |
| `NETTOYER-NOTIFICATIONS-AR-INVALIDES.sql` | Supprimer les notifications de test | ✅ OUI (2ème) |
| `CREATE-FONCTION-NOTIFICATIONS-AR-AUTO.sql` | Installer la génération auto | ✅ OUI (3ème) |
| `CORRECTION-NOTIFICATIONS-AR-GUIDE-COMPLET.md` | Documentation complète | 📖 Référence |

---

## Checklist de Déploiement

- [ ] Exécuter le diagnostic complet
- [ ] Analyser les résultats (notifications invalides, absences du jour)
- [ ] Nettoyer les notifications invalides
- [ ] Installer la fonction `generate_ar_fin_absence_notifications()`
- [ ] Configurer le CRON job (6h00 AM)
- [ ] Tester manuellement avec un événement de test
- [ ] Vérifier la navigation UI (Inbox → A&R)
- [ ] Documenter les résultats
- [ ] Former les utilisateurs du pôle Comptabilité

---

## Contact et Support

Pour toute question ou problème :
1. Vérifier les logs avec le script de diagnostic
2. Consulter la section "Dépannage" ci-dessus
3. Vérifier les permissions utilisateurs
4. Vérifier que le CRON est actif

**Rappel important :** Les notifications A&R ne sont créées QUE pour les absences se terminant **aujourd'hui** (`end_date = CURRENT_DATE`). C'est une règle métier stricte et non négociable.
