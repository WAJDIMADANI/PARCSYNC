# Guide : Notifications Inbox pour RDV Visites Médicales

## 🎯 Objectif

Envoyer automatiquement des notifications dans **l'Inbox** (et non dans les incidents) pour rappeler les rendez-vous de visite médicale **2 jours avant**.

## 📋 Fonctionnement

### 1. Nouveaux Champs dans Profil Salarié

Deux nouveaux champs sont ajoutés dans la table `profil` :

| Champ | Type | Description |
|-------|------|-------------|
| `visite_medicale_rdv_date` | DATE | Date du RDV (ex: 2024-01-15) |
| `visite_medicale_rdv_heure` | TIME | Heure du RDV (ex: 14:30:00) |

### 2. Système de Notifications

**Deux façons de créer des notifications :**

#### A) Notifications Automatiques (J-2)
- **Quand ?** Tous les jours à 8h00 du matin
- **Pour qui ?** Salariés ayant un RDV dans 2 jours
- **Où ?** Messages créés dans la table `inbox`

#### B) Notifications Immédiates
- **Quand ?** Dès qu'on saisit une date de RDV proche
- **Pour qui ?** RDV dans moins de 2 jours (demain, aujourd'hui, ou passé)
- **Où ?** Messages créés immédiatement dans `inbox`

### 3. Destinataires

Les notifications sont envoyées aux utilisateurs ayant l'une de ces permissions :
- `rh/salaries`
- `rh/demandes`
- `admin/utilisateurs`

## 🚀 Installation

### Étape 1 : Exécuter le Script SQL

Dans Supabase Dashboard → SQL Editor, exécutez :

```bash
create-rdv-visite-medicale-inbox-notifications.sql
```

Ce script va :
- ✅ Ajouter les colonnes date et heure dans `profil`
- ✅ Créer les fonctions de génération de notifications
- ✅ Créer le job CRON quotidien (8h00)
- ✅ Créer le trigger pour notifications immédiates

### Étape 2 : Vérifier l'Installation

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profil'
  AND column_name LIKE '%visite_medicale%';

-- Vérifier le job CRON
SELECT * FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';
```

## 📱 Utilisation

### 1. Saisir un RDV pour un Salarié

Dans l'interface de modification du profil salarié, remplissez :
- **Date du RDV** : `15/01/2024`
- **Heure du RDV** : `14:30`

### 2. Notifications Créées Automatiquement

**Si le RDV est dans moins de 2 jours :**
- ⚡ Notification créée **immédiatement**
- 📬 Visible dans l'Inbox des utilisateurs RH

**Si le RDV est dans plus de 2 jours :**
- ⏰ Notification créée **automatiquement 2 jours avant** (à 8h00)
- 📬 Visible dans l'Inbox des utilisateurs RH

### 3. Voir les Notifications dans l'Inbox

Les utilisateurs RH verront un message comme :

```
📬 Rappel RDV Visite Médicale

Jean Dupont (matricule TC001) a un RDV le 15/01/2024 à 14:30

Type: rdv_visite_medicale
Statut: nouveau
```

### 4. Cliquer pour Voir le Profil

Le message contient :
- ✅ `reference_id` = ID du profil du salarié
- ✅ `reference_type` = "profil"
- ✅ Bouton "Voir le profil" cliquable dans l'Inbox

## 🔧 Structure des Messages Inbox

Chaque notification contient :

```json
{
  "utilisateur_id": "uuid-utilisateur-rh",
  "type": "rdv_visite_medicale",
  "titre": "Rappel RDV Visite Médicale",
  "description": "Jean Dupont (matricule TC001) a un RDV le 15/01/2024 à 14:30",
  "contenu": "Rendez-vous de visite médicale prévu dans 2 jours pour Jean Dupont",
  "reference_id": "uuid-profil-salarie",
  "reference_type": "profil",
  "statut": "nouveau",
  "lu": false
}
```

## 🧪 Tests

### Test 1 : Notification Immédiate (RDV Demain)

```sql
-- Créer un RDV pour demain
UPDATE profil
SET
  visite_medicale_rdv_date = CURRENT_DATE + 1,
  visite_medicale_rdv_heure = '14:30:00'
WHERE matricule_tca = 'TC001';

-- Vérifier les messages créés
SELECT
  titre,
  description,
  created_at
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2 : Notification J-2 (Simulation)

```sql
-- Créer un RDV dans 2 jours
UPDATE profil
SET
  visite_medicale_rdv_date = CURRENT_DATE + 2,
  visite_medicale_rdv_heure = '09:00:00'
WHERE matricule_tca = 'TC002';

-- Exécuter manuellement la fonction (normalement fait par CRON)
SELECT * FROM generate_rdv_visite_medicale_inbox_notifications();

-- Vérifier les messages créés
SELECT
  titre,
  description,
  created_at
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC;
```

### Test 3 : Vérifier le Job CRON

```sql
-- Voir les jobs CRON actifs
SELECT
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%rdv%';
```

## 📊 Requêtes Utiles

### Voir Tous les RDV Programmés

```sql
SELECT
  p.matricule_tca,
  p.prenom,
  p.nom,
  p.visite_medicale_rdv_date,
  p.visite_medicale_rdv_heure,
  p.visite_medicale_rdv_date - CURRENT_DATE AS jours_avant
FROM profil p
WHERE p.visite_medicale_rdv_date IS NOT NULL
  AND p.deleted_at IS NULL
  AND p.statut NOT IN ('sorti', 'inactif')
ORDER BY p.visite_medicale_rdv_date;
```

### Voir Toutes les Notifications RDV dans Inbox

```sql
SELECT
  i.titre,
  i.description,
  i.lu,
  i.created_at,
  au.nom,
  au.prenom
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
ORDER BY i.created_at DESC;
```

### Voir les RDV Nécessitant une Notification Aujourd'hui

```sql
SELECT
  p.matricule_tca,
  p.prenom,
  p.nom,
  p.visite_medicale_rdv_date,
  p.visite_medicale_rdv_heure
FROM profil p
WHERE p.visite_medicale_rdv_date = CURRENT_DATE + INTERVAL '2 days'
  AND p.visite_medicale_rdv_heure IS NOT NULL
  AND p.deleted_at IS NULL
  AND p.statut NOT IN ('sorti', 'inactif');
```

## ⚠️ Points Importants

1. **Table `inbox` (pas `incident`)**
   - Les notifications sont créées dans `inbox`
   - Visible dans la page "Inbox" de l'interface
   - Même système que les notifications de documents téléchargés

2. **Évite les Doublons**
   - Vérifie qu'un message n'existe pas déjà pour le jour
   - Pour les notifications immédiates, supprime les anciens messages

3. **Temps Réel**
   - Les messages apparaissent immédiatement dans l'Inbox
   - Pas besoin de recharger la page (Supabase Realtime)

4. **Lien vers le Profil**
   - Chaque message contient `reference_id` = profil_id
   - Permet de cliquer et voir le profil du salarié

## 🐛 Dépannage

### Problème : Aucune notification créée

**Vérifiez :**
```sql
-- 1. Le job CRON existe et est actif
SELECT * FROM cron.job WHERE jobname = 'generate-rdv-visite-medicale-inbox';

-- 2. Il y a des RDV dans 2 jours
SELECT * FROM profil
WHERE visite_medicale_rdv_date = CURRENT_DATE + 2
  AND visite_medicale_rdv_heure IS NOT NULL;

-- 3. Il y a des utilisateurs RH actifs
SELECT COUNT(*) FROM app_utilisateur au
INNER JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE up.section_id IN ('rh/salaries', 'rh/demandes', 'admin/utilisateurs')
  AND up.actif = true
  AND au.actif = true;
```

### Problème : Notifications en double

**Solution :**
```sql
-- Supprimer les doublons
DELETE FROM inbox a
USING inbox b
WHERE a.id < b.id
  AND a.type = 'rdv_visite_medicale'
  AND a.reference_id = b.reference_id
  AND a.utilisateur_id = b.utilisateur_id
  AND a.created_at::date = b.created_at::date;
```

## ✅ Récapitulatif

| Aspect | Détail |
|--------|--------|
| **Destination** | Table `inbox` (pas `incident`) |
| **Délai** | Notification 2 jours avant (J-2) |
| **Heure CRON** | 8h00 du matin tous les jours |
| **Destinataires** | Utilisateurs RH avec permissions |
| **Type** | `rdv_visite_medicale` |
| **Lien profil** | Via `reference_id` + `reference_type` |

---

**🎯 Le système est maintenant prêt à fonctionner !**
