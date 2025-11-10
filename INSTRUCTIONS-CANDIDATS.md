# Instructions - Nouveau système de gestion des candidats

## Changements apportés

### 1. Base de données
Un nouveau fichier SQL a été créé : `add-candidat-workflow.sql`

**Vous devez exécuter ce fichier dans votre Supabase Dashboard :**
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Copiez le contenu de `add-candidat-workflow.sql`
5. Collez-le et cliquez sur "Run"

**Ce script ajoute 3 nouvelles colonnes à la table `candidat` :**
- `statut_candidature` : Le statut du candidat dans son parcours
- `code_couleur_rh` : Code couleur pour suivi interne RH
- `poste` : Le poste pour lequel le candidat postule

---

### 2. Onglet CANDIDATS - Nouveau tableau

L'affichage des candidats a été complètement refait avec un **tableau structuré** :

**Colonnes du tableau :**
1. **Nom** - Nom du candidat
2. **Prénom** - Prénom du candidat
3. **Poste** - Poste candidaté (ex: Chauffeur, Agent de sécurité...)
4. **Site** - Site associé au candidat
5. **Code Postal** - Code postal du candidat
6. **Date** - Date de candidature
7. **Documents** - Bouton "Voir" ou "Aucun" pour accéder aux documents
8. **Statut** - Statut de candidature (dropdown modifiable)
9. **Code RH** - Code couleur RH (dropdown + pastille de couleur)
10. **Actions** - Boutons Modifier/Supprimer/Convertir

---

### 3. Workflow des statuts de candidature

Le système gère maintenant **4 statuts** dans le parcours candidat :

#### 📩 **1. Candidature reçue**
- ✅ **Automatique** : Dès qu'un candidat remplit le formulaire public
- État initial de tout candidat

#### 💼 **2. Entretien**
- 👤 **Manuel** : Le RH change le statut manuellement
- Indique qu'un entretien est prévu ou a eu lieu

#### 🎯 **3. Pré-embauche**
- 👤 **Manuel** : Le RH change le statut manuellement
- ⚡ **Déclenche automatiquement** : Envoi de l'email d'onboarding avec le lien

#### ✅ **4. Salarié**
- 👤 **Manuel** : Le RH change le statut à "Salarié"
- 🔓 **Active le bouton** : "Convertir en salarié" dans les actions
- 📝 **Prochaine étape** : Signature du contrat (fonctionnalité à venir)

---

### 4. Code couleur RH

Le RH peut attribuer une **pastille de couleur** à chaque candidat :

**4 couleurs disponibles :**
- 🟢 **Vert**
- 🟡 **Jaune**
- 🔴 **Rouge**
- 🔵 **Bleu**

**Utilisation :**
- Codes **internes** sans signification fixe
- Le RH décide de la signification de chaque couleur
- Modifiable à tout moment
- Indépendant du statut de candidature

---

### 5. Formulaire de candidature public

Le formulaire `/apply` a été mis à jour :

**Nouveau champ obligatoire :**
- **Poste candidaté** : Le candidat doit indiquer le poste pour lequel il postule

**Statut automatique :**
- Tous les nouveaux candidats reçoivent automatiquement le statut "Candidature reçue"

---

## Résumé des actions RH

### Changement de statut
1. Le candidat postule → **Candidature reçue** (auto)
2. RH clique sur le dropdown "Statut" → Sélectionne **Entretien**
3. Après entretien → RH sélectionne **Pré-embauche** (email envoyé !)
4. Candidat OK → RH sélectionne **Salarié**
5. Bouton **Convertir en salarié** apparaît → Conversion en profil salarié

### Attribution de code couleur
- Le RH peut attribuer/modifier une couleur à tout moment
- Dropdown "Code RH" → Sélectionner la couleur
- Une pastille de couleur s'affiche à côté

### Voir les documents
- Colonne "Documents" → Bouton "Voir" ou "Aucun"
- Cliquer pour ouvrir la fiche complète du candidat avec tous ses documents

---

## Notes importantes

⚠️ **N'oubliez pas d'exécuter le fichier SQL** `add-candidat-workflow.sql` dans Supabase !

✅ **Le build a été testé** et fonctionne correctement.

📝 **Signature de contrat** : Cette fonctionnalité sera ajoutée plus tard lors de la conversion en salarié.
