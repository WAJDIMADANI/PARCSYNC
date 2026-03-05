# ⚡ DÉMARRAGE RAPIDE : RDV Visite Médicale → Inbox

## 🎯 En 2 Minutes

### Étape 1 : Installation (1 minute)

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Copiez le contenu de : `create-rdv-visite-medicale-inbox-notifications.sql`
3. Cliquez sur **Run**
4. Attendez le message : `✅ INSTALLATION TERMINÉE AVEC SUCCÈS`

**C'est tout !** ✅

---

### Étape 2 : Test (1 minute)

Dans l'interface, modifiez un profil salarié :

```
Date RDV : [Demain]
Heure RDV : 14:30
```

Sauvegardez → Allez dans **Inbox** → Le message apparaît ! 📬

---

## 📝 Ce Qui Est Créé

- ✅ 2 colonnes dans profil (date + heure)
- ✅ 3 fonctions SQL automatiques
- ✅ 1 job CRON quotidien (8h00)
- ✅ Messages dans l'Inbox

---

## 💡 Comment Ça Marche

```
Vous saisissez un RDV
         ↓
RDV < 2 jours ?
    ↓ Oui          ↓ Non
Notif immédiate   Notif J-2 (8h00)
    ↓                ↓
    └────────┬───────┘
             ↓
    Message dans Inbox
    pour tous les RH
```

---

## 📬 Dans l'Inbox

Les utilisateurs RH verront :

```
🔴 NOUVEAU
📅 Rappel RDV Visite Médicale

Jean Dupont (TC001) a un RDV
le 15/01/2024 à 14:30

[👤 Voir le profil]
```

---

## 🧪 Test Rapide

Dans SQL Editor :

```sql
-- Créer un RDV pour demain
UPDATE profil
SET
  visite_medicale_rdv_date = CURRENT_DATE + 1,
  visite_medicale_rdv_heure = '14:30:00'
WHERE matricule_tca = 'TC001';

-- Vérifier le message
SELECT titre, description
FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu :**
```
Rappel RDV Visite Médicale DEMAIN
Jean Dupont (matricule TC001) - RDV le 15/01/2024 à 14:30
```

---

## ✅ Système Installé

- ✅ Notifications automatiques J-2
- ✅ Notifications immédiates si urgence
- ✅ Affichage dans l'Inbox
- ✅ Lien direct vers le profil
- ✅ Badge "non lu"
- ✅ Temps réel

---

## 📚 Pour Aller Plus Loin

### Documentation Complète
- **Installation détaillée :** `INSTALLER-RDV-VISITE-MEDICALE-INBOX-MAINTENANT.md`
- **Guide complet :** `GUIDE-RDV-VISITE-MEDICALE-INBOX.md`
- **Tests avancés :** `TEST-RDV-VISITE-MEDICALE-INBOX.sql`
- **Comparaison systèmes :** `COMPARAISON-INCIDENTS-VS-INBOX.md`
- **Index complet :** `INDEX-RDV-VISITE-MEDICALE-INBOX.md`

### Dépannage

**Aucune notification ?**
```sql
-- Vérifier le job CRON
SELECT * FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';
```

**Messages en double ?**
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

## 🎯 Récapitulatif

| Question | Réponse |
|----------|---------|
| **Où sont les notifications ?** | Page Inbox |
| **Quand sont-elles créées ?** | J-2 à 8h00 (ou immédiat si < 2 jours) |
| **Pour qui ?** | Utilisateurs RH actifs |
| **Peut-on voir le profil ?** | Oui, bouton "Voir le profil" |
| **Temps réel ?** | Oui |
| **Risque d'erreur ?** | Aucun |

---

## 🚀 Prêt !

Le système est maintenant opérationnel.

**Action suivante :** Saisissez des dates de RDV dans les profils salariés ! 📅
