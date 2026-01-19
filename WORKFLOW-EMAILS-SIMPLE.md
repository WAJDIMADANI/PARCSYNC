# 📧 Workflow simplifié - Envoi d'emails

## 🔄 Comparaison Avant / Après

### ❌ AVANT (compliqué)

```
1. Aller sur Brevo
2. Créer un template
3. Noter l'ID du template (ex: 123)
4. Retourner dans l'app
5. Cocher des cases pour sélectionner
6. Entrer l'ID template: 123
7. Entrer des tags: "crm, newsletter"
8. Écrire du JSON: {"key": "value"}
9. Envoyer
```

### ✅ MAINTENANT (simple)

```
1. Taper "Dupont" dans la recherche
2. Cliquer sur le salarié
3. Écrire l'objet
4. Écrire le message
5. Envoyer
```

---

## 📝 Scénario 1 : Email à 3 salariés

### Étapes

1. **Ouvrir RH > Emails**
2. **Mode :** "Sélectionner des salariés" (déjà coché par défaut)
3. **Recherche :** Tapez "1234" → Cliquez sur "Dupont Jean"
4. **Recherche :** Tapez "Martin" → Cliquez sur "Martin Sophie"
5. **Recherche :** Tapez "5678" → Cliquez sur "Dubois Pierre"

Vous voyez maintenant 3 badges bleus :
```
[Dupont Jean (1234) x]  [Martin Sophie (2345) x]  [Dubois Pierre (5678) x]
```

6. **Objet :** "Rappel réunion"
7. **Message :**
```
La réunion d'équipe aura lieu demain à 14h en salle A.

Merci de confirmer votre présence.
```

8. **Cliquez sur "Envoyer"**

Le compteur affiche : **3 destinataires**

---

## 📝 Scénario 2 : Email à tous les salariés

### Étapes

1. **Ouvrir RH > Emails**
2. **Mode :** Cocher "Tous les salariés actifs"
3. **Objet :** "Information importante"
4. **Message :**
```
Nous vous informons que l'entreprise sera fermée le 25 décembre.

Bonnes fêtes à tous !
```

5. **Cliquez sur "Envoyer"**

Le compteur affiche : **42 destinataires** (tous les salariés actifs)

---

## 🎯 Interface visuelle

### Barre de recherche

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Tapez le matricule, nom ou prénom...             │
└─────────────────────────────────────────────────────┘
       ↓ (vous tapez "Dup")
┌─────────────────────────────────────────────────────┐
│ Dupont Jean (1234)                  jean@example.com│ ← cliquez
│ Duparc Marie (5678)                marie@example.com│ ← cliquez
│ Dupuis Thomas (9012)              thomas@example.com│ ← cliquez
└─────────────────────────────────────────────────────┘
```

### Badges sélectionnés

```
┌───────────────────────┐  ┌────────────────────────┐
│ Dupont Jean (1234) [x]│  │ Duparc Marie (5678) [x]│
└───────────────────────┘  └────────────────────────┘
```

Cliquez sur [x] pour retirer un destinataire.

### Formulaire complet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Destinataires
  ○ Sélectionner des salariés  ● Tous les salariés actifs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rechercher des salariés *
┌─────────────────────────────────────────────────────┐
│ 🔍 Tapez le matricule, nom ou prénom...             │
└─────────────────────────────────────────────────────┘

[Dupont Jean (1234) x]  [Martin Sophie (2345) x]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objet de l'email *
┌─────────────────────────────────────────────────────┐
│ Rappel important                                     │
└─────────────────────────────────────────────────────┘

Message *
┌─────────────────────────────────────────────────────┐
│                                                      │
│ Bonjour,                                            │
│                                                      │
│ Ceci est un rappel pour...                         │
│                                                      │
│                                                      │
│                                                      │
└─────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 2 destinataires                        [Envoyer →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💡 Astuces

### Recherche rapide
- **Par matricule :** Tapez "1234"
- **Par nom :** Tapez "Dupont"
- **Par prénom :** Tapez "Jean"
- Les résultats s'affichent instantanément

### Retirer un destinataire
- Cliquez sur le **[x]** dans le badge bleu
- Le salarié est retiré immédiatement

### Changer d'avis
- Mode "Sélection" → Mode "Tous" : les badges disparaissent
- Mode "Tous" → Mode "Sélection" : recherchez à nouveau

### Désactivation du bouton
Le bouton "Envoyer" est grisé si :
- ❌ Objet vide
- ❌ Message vide
- ❌ Aucun destinataire (en mode sélection)

### Confirmation d'envoi
- ✅ Bouton devient vert : "Envoyé avec succès !"
- ⏱️ Disparaît après 5 secondes
- 📝 Tous les champs sont réinitialisés

---

## 📊 Ce qui se passe derrière

1. **Recherche** : Requête en temps réel sur `profil`
2. **Sélection** : Stockage local des salariés choisis
3. **Envoi** : Appel à la fonction `send-simple-email`
4. **Brevo** : Envoi via API Brevo (un par un)
5. **Historique** : Enregistrement dans `email_logs`
6. **Format** : HTML propre avec salutation personnalisée

### Format de l'email reçu

```
De: MAD IMPACT <noreply@mad-impact.com>
À: jean.dupont@example.com
Objet: Rappel important

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour Jean Dupont,

Ceci est un rappel pour...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cordialement,
L'équipe MAD IMPACT
```

---

## 🎯 Résumé

**3 étapes seulement :**
1. Chercher/Sélectionner
2. Écrire
3. Envoyer

**Plus besoin de :**
- ❌ Templates Brevo
- ❌ IDs à mémoriser
- ❌ JSON à écrire
- ❌ Tags à gérer
- ❌ Aller/retour entre plateformes

**Tout en un seul endroit, simple et rapide !**
