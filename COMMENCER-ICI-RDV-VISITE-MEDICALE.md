# 🎯 COMMENCER ICI : RDV Visite Médicale → Inbox

## ✨ Ce Que Vous Allez Avoir

Un système qui envoie **automatiquement** des notifications dans l'Inbox pour rappeler les rendez-vous de visite médicale **2 jours avant**.

**Exactement comme pour les documents téléchargés** → Aucune erreur possible ! ✅

---

## 🚀 Installation Ultra-Rapide

### 1️⃣ Ouvrez Supabase
- Dashboard → SQL Editor

### 2️⃣ Copiez-Collez
```
create-rdv-visite-medicale-inbox-notifications.sql
```

### 3️⃣ Cliquez sur Run
- Attendez 10 secondes
- Message : ✅ INSTALLATION TERMINÉE

### 4️⃣ Terminé !
Votre système fonctionne maintenant.

---

## 📖 Documentation par Profil

### 👨‍💼 Vous êtes Chef de Projet ?
**Lisez :** `RESUME-RDV-VISITE-MEDICALE-INBOX.md` (5 min)
- Vue d'ensemble visuelle
- Bénéfices business
- Workflow illustré

### 👨‍💻 Vous êtes Développeur ?
**Lisez :** `DEMARRAGE-RAPIDE-RDV-INBOX.md` (2 min)
- Installation immédiate
- Test rapide
- Dépannage

Puis : `GUIDE-RDV-VISITE-MEDICALE-INBOX.md` (10 min)
- Documentation technique complète
- Requêtes SQL
- Architecture détaillée

### 🆘 Vous êtes Support ?
**Lisez :** `INSTALLER-RDV-VISITE-MEDICALE-INBOX-MAINTENANT.md` (3 min)
- Installation pas à pas
- Vérifications
- Dépannage courant

---

## 📁 Tous Les Fichiers

### 🚀 Démarrage Rapide
1. **COMMENCER-ICI-RDV-VISITE-MEDICALE.md** ← Vous êtes ici
2. **DEMARRAGE-RAPIDE-RDV-INBOX.md** - Installation en 2 minutes

### 📖 Guides
3. **INSTALLER-RDV-VISITE-MEDICALE-INBOX-MAINTENANT.md** - Installation détaillée
4. **GUIDE-RDV-VISITE-MEDICALE-INBOX.md** - Guide technique complet

### 📊 Compréhension
5. **RESUME-RDV-VISITE-MEDICALE-INBOX.md** - Résumé visuel
6. **COMPARAISON-INCIDENTS-VS-INBOX.md** - Pourquoi l'Inbox ?

### 🧪 Tests
7. **TEST-RDV-VISITE-MEDICALE-INBOX.sql** - Tests automatisés

### 🔧 Installation
8. **create-rdv-visite-medicale-inbox-notifications.sql** - Script SQL

### 📚 Navigation
9. **INDEX-RDV-VISITE-MEDICALE-INBOX.md** - Index complet

---

## ⚡ Parcours Recommandés

### Pour Démarrer Vite
```
1. DEMARRAGE-RAPIDE-RDV-INBOX.md
   ↓
2. create-rdv-visite-medicale-inbox-notifications.sql (exécuter)
   ↓
3. Tester dans l'interface
```

### Pour Comprendre
```
1. RESUME-RDV-VISITE-MEDICALE-INBOX.md
   ↓
2. COMPARAISON-INCIDENTS-VS-INBOX.md
   ↓
3. GUIDE-RDV-VISITE-MEDICALE-INBOX.md
```

### Pour Installer Proprement
```
1. INSTALLER-RDV-VISITE-MEDICALE-INBOX-MAINTENANT.md
   ↓
2. create-rdv-visite-medicale-inbox-notifications.sql (exécuter)
   ↓
3. TEST-RDV-VISITE-MEDICALE-INBOX.sql (vérifier)
```

---

## 🎯 Ce Que Fait Le Système

### Automatiquement

```
Vous saisissez une date de RDV
            ↓
Le système détecte automatiquement
            ↓
    ┌───────┴───────┐
    ↓               ↓
RDV < 2 jours   RDV > 2 jours
    ↓               ↓
Notif immédiate  Notif J-2 (8h00)
    ↓               ↓
    └───────┬───────┘
            ↓
Message créé dans Inbox
pour tous les RH
            ↓
Visible immédiatement
Badge "non lu"
            ↓
Clic → Profil du salarié
```

---

## 📬 Exemple Concret

### Vous saisissez :
```
Salarié : Jean Dupont (TC001)
Date RDV : 15/01/2024
Heure RDV : 14:30
```

### Le 13/01/2024 à 8h00 :
Les utilisateurs RH reçoivent dans leur Inbox :

```
┌─────────────────────────────────┐
│ 🔴 NOUVEAU                      │
│ 📅 Rappel RDV Visite Médicale   │
│                                 │
│ Jean Dupont (matricule TC001)  │
│ a un RDV le 15/01/2024 à 14:30 │
│                                 │
│ [👤 Voir le profil complet]     │
└─────────────────────────────────┘
```

---

## ✅ Avantages

| Avantage | Détail |
|----------|--------|
| **Aucune erreur** | Utilise le système Inbox déjà testé |
| **Automatique** | Job CRON quotidien à 8h00 |
| **Immédiat** | Si RDV < 2 jours, notif instantanée |
| **Temps réel** | Apparaît sans recharger |
| **Lien profil** | Un clic → profil du salarié |
| **Badge non lu** | Notification visible |
| **Cohérent** | Même interface que documents |

---

## 🧪 Test Rapide (30 secondes)

### Dans l'interface :
1. Ouvrez un profil salarié
2. Date RDV : **Demain**
3. Heure RDV : **14:30**
4. Sauvegardez
5. Allez dans **Inbox**
6. Le message est là ! ✅

### Ou en SQL :
```sql
-- Créer un RDV
UPDATE profil
SET
  visite_medicale_rdv_date = CURRENT_DATE + 1,
  visite_medicale_rdv_heure = '14:30'
WHERE matricule_tca = 'TC001';

-- Vérifier
SELECT * FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🆘 Aide Rapide

### Aucune notification créée ?
```sql
-- Vérifier le job CRON
SELECT * FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';
```

### Messages en double ?
```sql
-- Supprimer doublons
DELETE FROM inbox a
USING inbox b
WHERE a.id < b.id
  AND a.type = 'rdv_visite_medicale'
  AND a.reference_id = b.reference_id
  AND a.utilisateur_id = b.utilisateur_id;
```

### Plus d'aide ?
→ Voir `GUIDE-RDV-VISITE-MEDICALE-INBOX.md` section Dépannage

---

## 📊 Statistiques

Après installation, voir les stats :

```sql
SELECT
  COUNT(*) AS total_rdv_programmes,
  COUNT(*) FILTER (WHERE visite_medicale_rdv_date - CURRENT_DATE <= 2) AS rdv_proches
FROM profil
WHERE visite_medicale_rdv_date IS NOT NULL
  AND deleted_at IS NULL;
```

---

## 💡 Points Importants

1. **Table destination : `inbox`** (pas `incident`)
2. **Type de message : `rdv_visite_medicale`**
3. **Destinataires : Utilisateurs RH actifs**
4. **Délai : 2 jours avant (J-2)**
5. **Heure CRON : 8h00 tous les matins**
6. **Lien profil : Via `reference_id`**

---

## 🎉 Vous Êtes Prêt !

Le système est simple, robuste et sans erreur.

**Prochaine étape :** Commencez à saisir des dates de RDV ! 📅

---

## 📞 Besoin d'Aide ?

| Question | Fichier |
|----------|---------|
| Comment installer ? | `DEMARRAGE-RAPIDE-RDV-INBOX.md` |
| Comment ça marche ? | `RESUME-RDV-VISITE-MEDICALE-INBOX.md` |
| Documentation technique ? | `GUIDE-RDV-VISITE-MEDICALE-INBOX.md` |
| Pourquoi l'Inbox ? | `COMPARAISON-INCIDENTS-VS-INBOX.md` |
| Problème ? | Section Dépannage de tous les guides |
| Index complet ? | `INDEX-RDV-VISITE-MEDICALE-INBOX.md` |

---

**👉 Suivant : `DEMARRAGE-RAPIDE-RDV-INBOX.md` pour installer en 2 minutes !** 🚀
