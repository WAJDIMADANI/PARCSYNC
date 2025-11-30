# 📧 Envoyer un Rappel de Documents - Guide Ultra-Rapide

## 🎯 Qu'est-ce qui a été ajouté ?

Un **nouveau menu** dans votre application qui permet d'envoyer des emails automatiques aux salariés ayant des documents manquants.

**Important :** L'ancien menu "Documents Manquants" **fonctionne toujours** exactement comme avant. Rien n'a été cassé !

---

## 📱 Comment Utiliser la Nouvelle Fonctionnalité ?

### Étape 1 : Ouvrir le nouveau menu
Dans la sidebar, section **RH**, cliquez sur :
- **"Documents Manquants v2"** (avec l'icône 📧)

### Étape 2 : Envoyer un rappel
Pour chaque salarié dans le tableau, cliquez sur le bouton :
- **"Envoyer rappel"** (bouton orange)

### Étape 3 : Confirmer
Dans le modal qui s'ouvre, cliquez sur :
- **"Envoyer le rappel"**

### ✅ C'est tout !
Le salarié reçoit un email avec un lien pour uploader ses documents. Sur mobile, il pourra utiliser sa caméra pour prendre les documents en photo directement !

---

## 🔧 Avant d'Utiliser (À Faire UNE SEULE FOIS)

Vous devez exécuter **3 étapes simples** :

1. **Créer 2 tables SQL dans Supabase**
   - Fichiers : `create-upload-tokens-table.sql` et `create-email-logs-table.sql`
   - Où : Supabase Dashboard > SQL Editor > Coller et Run

2. **Déployer 1 Edge Function**
   - Fichier : `supabase/functions/send-all-missing-documents-reminder/index.ts`
   - Où : Supabase Dashboard > Edge Functions > Deploy

3. **Vérifier les variables d'environnement**
   - `BREVO_API_KEY` (dans Supabase Secrets)
   - `APP_URL` (l'URL de votre application)

**Temps total : ~10 minutes**

Consultez `DEPLOIEMENT-SIMPLE.md` pour les instructions détaillées étape par étape.

---

## 📚 Documentation Disponible

### Pour comprendre rapidement :
- 📄 **LISEZ-MOI-ENVOI-RAPPEL.md** ← Vous êtes ici
- 🎯 **DEPLOIEMENT-SIMPLE.md** ← 3 étapes de déploiement

### Pour aller plus loin :
- 👁️ **GUIDE-VISUEL-ENVOI-RAPPEL.md** ← Captures d'écran et explications visuelles
- 📖 **GUIDE-ENVOI-RAPPEL-DOCUMENTS.md** ← Documentation complète avec FAQ

### Pour les détails techniques :
- 🔧 **IMPLEMENTATION-RAPPEL-DOCUMENTS.md** ← Architecture et fonctionnement technique

---

## ✨ Avantages de cette Nouvelle Fonctionnalité

### Pour vous (RH) :
- ⚡ **2 clics** pour envoyer un rappel (au lieu d'envoyer manuellement)
- 📊 **Traçabilité** complète (qui a reçu quoi et quand)
- 🔒 **Liens sécurisés** avec expiration automatique (7 jours)

### Pour les salariés :
- 📱 **Capture photo** sur mobile (plus besoin de scanner)
- ⚡ **Upload rapide** en 3 clics
- 🎯 **Liste claire** des documents manquants

---

## 🔍 Où Trouver le Nouveau Menu ?

```
Application PARC SYNC
└── Sidebar (menu de gauche)
    └── Section RH
        ├── Documents Manquants      ← ANCIEN (toujours fonctionnel)
        └── Documents Manquants v2   ← NOUVEAU (avec envoi rappel)
```

---

## ❓ Questions Fréquentes

### Q : L'ancien menu va-t-il disparaître ?
**R :** Non ! Il reste accessible et fonctionne exactement comme avant.

### Q : Puis-je tester sans risque ?
**R :** Oui ! Le nouveau menu est complètement séparé. Si quelque chose ne fonctionne pas, l'ancien continue de marcher.

### Q : Combien de temps le lien est-il valide ?
**R :** 7 jours. Après, le salarié voit un message "lien expiré" et vous pouvez renvoyer un nouveau rappel.

### Q : Puis-je envoyer plusieurs rappels au même salarié ?
**R :** Oui ! Chaque clic sur "Envoyer rappel" génère un nouveau lien unique.

### Q : Les documents uploadés apparaissent où ?
**R :** Dans la section "Documents" du profil du salarié, exactement comme les autres documents.

---

## 🚀 Prêt à Commencer ?

1. **Lisez** : `DEPLOIEMENT-SIMPLE.md` (10 minutes)
2. **Déployez** : Tables SQL + Edge Function (10 minutes)
3. **Testez** : Envoyez un rappel à un salarié test

**Temps total : 20 minutes** pour tout mettre en place ! ⚡

---

## 📞 Besoin d'Aide ?

Si vous rencontrez un problème :
1. Vérifiez que les 3 étapes de déploiement sont faites
2. Consultez `GUIDE-VISUEL-ENVOI-RAPPEL.md` pour voir où cliquer
3. Vérifiez que l'ancien menu fonctionne toujours (si oui, le problème est isolé au nouveau)

---

## ✅ Récapitulatif

| Fonctionnalité | Ancien Menu | Nouveau Menu v2 |
|----------------|-------------|-----------------|
| Voir les documents manquants | ✅ | ✅ |
| Voir le profil du salarié | ✅ | ✅ |
| **Envoyer un rappel email** | ❌ | ✅ **NOUVEAU** |
| **Page d'upload avec caméra** | ❌ | ✅ **NOUVEAU** |
| **Traçabilité des envois** | ❌ | ✅ **NOUVEAU** |

---

**Simple, sûr et efficace !** 🎉

Consultez `DEPLOIEMENT-SIMPLE.md` pour commencer.
