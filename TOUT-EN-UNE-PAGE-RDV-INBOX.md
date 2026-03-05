# 📄 TOUT EN 1 PAGE : RDV Visite Médicale → Inbox

## 🎯 Objectif
Notifications automatiques dans l'Inbox pour rappeler les RDV visites médicales 2 jours avant.

---

## ⚡ Installation (1 minute)

### SQL à Exécuter
```sql
-- Fichier : create-rdv-visite-medicale-inbox-notifications.sql
-- Copiez-collez dans Supabase SQL Editor et exécutez
```

### Ce Qui Est Créé
- ✅ Colonnes : `visite_medicale_rdv_date` + `visite_medicale_rdv_heure` dans `profil`
- ✅ Fonctions SQL automatiques (J-2 + immédiate + trigger)
- ✅ Job CRON quotidien à 8h00
- ✅ Messages dans table `inbox`

---

## 🔄 Workflow

```
Saisie RDV
    ↓
< 2 jours ?
    ↓ Oui         ↓ Non
Immédiat       J-2 (8h00)
    ↓             ↓
    └──────┬──────┘
           ↓
    Message Inbox
    (Users RH)
```

---

## 📬 Message Créé

```json
{
  "utilisateur_id": "uuid-rh",
  "type": "rdv_visite_medicale",
  "titre": "Rappel RDV Visite Médicale",
  "description": "Jean Dupont (TC001) a un RDV le 15/01/2024 à 14:30",
  "reference_id": "uuid-profil-salarie",
  "reference_type": "profil",
  "statut": "nouveau",
  "lu": false
}
```

---

## 🧪 Test Rapide

```sql
-- Créer RDV demain
UPDATE profil
SET visite_medicale_rdv_date = CURRENT_DATE + 1,
    visite_medicale_rdv_heure = '14:30'
WHERE matricule_tca = 'TC001';

-- Vérifier message
SELECT * FROM inbox
WHERE type = 'rdv_visite_medicale'
ORDER BY created_at DESC LIMIT 1;
```

---

## ✅ Avantages

- ✅ Aucune erreur (pas d'enum)
- ✅ Même système que documents
- ✅ Automatique (CRON)
- ✅ Temps réel
- ✅ Lien vers profil

---

## 🆘 Dépannage Express

### Pas de notification ?
```sql
SELECT * FROM cron.job
WHERE jobname = 'generate-rdv-visite-medicale-inbox';
```

### Doublons ?
```sql
DELETE FROM inbox a USING inbox b
WHERE a.id < b.id AND a.type = 'rdv_visite_medicale'
  AND a.reference_id = b.reference_id
  AND a.utilisateur_id = b.utilisateur_id;
```

---

## 📊 Requêtes Utiles

### Tous les RDV
```sql
SELECT matricule_tca, prenom, nom,
       visite_medicale_rdv_date,
       visite_medicale_rdv_heure,
       visite_medicale_rdv_date - CURRENT_DATE AS jours_avant
FROM profil
WHERE visite_medicale_rdv_date IS NOT NULL
  AND deleted_at IS NULL
ORDER BY visite_medicale_rdv_date;
```

### Toutes les notifications
```sql
SELECT i.titre, i.description, i.lu,
       au.prenom || ' ' || au.nom AS destinataire,
       i.created_at
FROM inbox i
JOIN app_utilisateur au ON i.utilisateur_id = au.id
WHERE i.type = 'rdv_visite_medicale'
ORDER BY i.created_at DESC;
```

### Exécuter manuellement
```sql
SELECT * FROM generate_rdv_visite_medicale_inbox_notifications();
```

---

## 📚 Documentation

| Pour | Fichier |
|------|---------|
| Démarrer | `COMMENCER-ICI-RDV-VISITE-MEDICALE.md` |
| Installer | `DEMARRAGE-RAPIDE-RDV-INBOX.md` |
| Comprendre | `RESUME-RDV-VISITE-MEDICALE-INBOX.md` |
| Détails | `GUIDE-RDV-VISITE-MEDICALE-INBOX.md` |
| Tests | `TEST-RDV-VISITE-MEDICALE-INBOX.sql` |
| Index | `INDEX-RDV-VISITE-MEDICALE-INBOX.md` |

---

## 🎯 Récap

| Quoi | Réponse |
|------|---------|
| **Où ?** | Table `inbox` |
| **Quand ?** | J-2 à 8h00 (ou immédiat si < 2j) |
| **Pour qui ?** | Users RH actifs |
| **Type ?** | `rdv_visite_medicale` |
| **Lien profil ?** | Oui via `reference_id` |
| **Erreur ?** | Aucune |

---

**🚀 Prêt en 1 minute d'installation !**
