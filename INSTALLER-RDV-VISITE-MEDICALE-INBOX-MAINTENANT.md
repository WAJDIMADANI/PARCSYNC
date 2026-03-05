# 🚀 INSTALLATION : RDV Visite Médicale → Inbox

## ✅ Solution Sans Erreur

Ce système envoie des notifications dans l'**Inbox** (comme les documents téléchargés) pour les RDV visites médicales.

**Pourquoi l'Inbox ?**
- ✅ Pas de problème avec les enums `incident_type`
- ✅ Même interface que les documents
- ✅ Déjà testé et fonctionnel
- ✅ Lien direct vers le profil du salarié

---

## 📦 Ce qui sera installé

### 1. Colonnes dans `profil`
- `visite_medicale_rdv_date` (DATE)
- `visite_medicale_rdv_heure` (TIME)

### 2. Fonctions SQL
- `generate_rdv_visite_medicale_inbox_notifications()` - Génération J-2
- `create_immediate_rdv_inbox_notification()` - Notification immédiate
- `trigger_rdv_inbox_notification()` - Trigger automatique

### 3. Job CRON
- Exécution quotidienne à 8h00
- Vérifie les RDV dans 2 jours (J+2)
- Crée les messages dans l'Inbox

---

## 🔧 Installation (1 étape)

### Dans Supabase Dashboard

1. Ouvrez **SQL Editor**
2. Copiez-collez le contenu de :
   ```
   create-rdv-visite-medicale-inbox-notifications.sql
   ```
3. Cliquez sur **Run**
4. Attendez le message de succès

**C'est tout !** ✅

---

## 🧪 Vérification (Optionnel)

Pour tester que tout fonctionne :

```sql
-- Dans SQL Editor, exécuter :
-- (fichier: TEST-RDV-VISITE-MEDICALE-INBOX.sql)
```

Ce script va :
- ✅ Vérifier l'installation
- ✅ Créer des RDV de test
- ✅ Générer des notifications
- ✅ Vérifier l'absence de doublons
- ✅ Afficher les statistiques

---

## 📖 Utilisation

### Saisir un RDV pour un Salarié

Dans l'interface de modification du profil :

1. **Date du RDV** : `15/01/2024`
2. **Heure du RDV** : `14:30`
3. **Sauvegarder**

### Notifications Automatiques

**Si RDV < 2 jours :**
- ⚡ Notification **immédiate**
- Visible dans l'Inbox RH

**Si RDV > 2 jours :**
- ⏰ Notification **2 jours avant** (à 8h00)
- Visible dans l'Inbox RH

### Voir les Notifications

1. Connexion avec un compte RH
2. Aller dans **Inbox** (menu latéral)
3. Messages de type "Rappel RDV Visite Médicale"
4. Cliquer pour voir les détails
5. Bouton **"Voir le profil"** disponible

---

## 📬 Format des Messages

Chaque message dans l'Inbox contient :

| Champ | Valeur |
|-------|--------|
| **Type** | `rdv_visite_medicale` |
| **Titre** | "Rappel RDV Visite Médicale" |
| **Description** | "Jean Dupont (TC001) a un RDV le 15/01/2024 à 14:30" |
| **Reference ID** | UUID du profil du salarié |
| **Reference Type** | `"profil"` |
| **Statut** | `"nouveau"` |
| **Lu** | `false` → `true` |

---

## 🎯 Destinataires

Les notifications sont envoyées aux utilisateurs ayant ces permissions :
- `rh/salaries`
- `rh/demandes`
- `admin/utilisateurs`

---

## 📊 Requêtes Utiles

### Voir tous les RDV programmés

```sql
SELECT
  matricule_tca,
  prenom || ' ' || nom AS salarie,
  visite_medicale_rdv_date AS date_rdv,
  visite_medicale_rdv_heure AS heure_rdv,
  visite_medicale_rdv_date - CURRENT_DATE AS jours_avant
FROM profil
WHERE visite_medicale_rdv_date IS NOT NULL
  AND deleted_at IS NULL
ORDER BY visite_medicale_rdv_date;
```

### Voir les notifications RDV dans Inbox

```sql
SELECT
  i.titre,
  i.description,
  i.lu,
  au.prenom || ' ' || au.nom AS destinataire,
  i.created_at
FROM inbox i
INNER JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
ORDER BY i.created_at DESC;
```

### Tester manuellement la fonction

```sql
-- Exécuter la génération (simulation du CRON)
SELECT * FROM generate_rdv_visite_medicale_inbox_notifications();
```

---

## 🔍 Dépannage

### Problème : Aucune notification créée

**Vérifier :**

```sql
-- 1. Le job CRON existe
SELECT * FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';

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

### Problème : Messages en double

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

---

## 📚 Documentation

### Fichiers disponibles

1. **create-rdv-visite-medicale-inbox-notifications.sql**
   - Script SQL complet d'installation

2. **GUIDE-RDV-VISITE-MEDICALE-INBOX.md**
   - Guide détaillé d'utilisation
   - Tests SQL
   - Requêtes utiles

3. **RESUME-RDV-VISITE-MEDICALE-INBOX.md**
   - Résumé visuel
   - Workflow complet
   - Comparaison avec l'ancien système

4. **TEST-RDV-VISITE-MEDICALE-INBOX.sql**
   - Tests automatisés complets
   - Vérification de l'installation

5. **Ce fichier (INSTALLER-RDV-VISITE-MEDICALE-INBOX-MAINTENANT.md)**
   - Instructions d'installation rapide

---

## ✅ Checklist d'Installation

- [ ] Exécuter `create-rdv-visite-medicale-inbox-notifications.sql`
- [ ] Vérifier le message de succès
- [ ] (Optionnel) Exécuter les tests
- [ ] Créer un RDV de test
- [ ] Vérifier la notification dans l'Inbox
- [ ] Tester le lien "Voir le profil"

---

## 🎉 Terminé !

Le système est maintenant installé et fonctionnel.

**Prochaines actions :**
1. Les équipes RH peuvent saisir les dates de RDV dans les profils
2. Les notifications apparaîtront automatiquement dans l'Inbox
3. Un clic sur la notification permet d'accéder au profil du salarié

**Aucune erreur possible** car on utilise exactement le même système que les documents téléchargés ! ✅
