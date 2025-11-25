# Guide d'utilisation - Système de Modèles de Courriers

## 📋 Vue d'ensemble

Le système de modèles de courriers permet de créer des courriers personnalisés pour vos salariés en quelques clics. Le système remplace automatiquement les variables par les vraies données du salarié.

### Avantages
- ✅ Gain de temps considérable
- ✅ Zéro erreur de saisie
- ✅ Standardisation des courriers
- ✅ Traçabilité complète
- ✅ PDF téléchargeable instantanément

---

## 🚀 Installation

### 1. Créer les tables dans Supabase

Exécutez le fichier SQL suivant dans le SQL Editor de Supabase :
```bash
create-letter-templates-system.sql
```

Ce script crée :
- Table `modele_courrier` (pour stocker les modèles)
- Table `courrier_genere` (pour stocker les courriers générés)
- Indexes pour optimiser les performances
- Policies RLS pour la sécurité

### 2. Créer le bucket Storage

Dans Supabase Dashboard :
1. Allez dans Storage
2. Créez un nouveau bucket nommé : `courriers-generes`
3. Configurez :
   - Public : **Non** (authentifié uniquement)
   - File size limit : 5MB
   - Allowed MIME types : `application/pdf`

### 3. Configurer les policies Storage

Dans Storage > courriers-generes > Policies :

**Policy 1 - Upload :**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'courriers-generes');
```

**Policy 2 - Read :**
```sql
CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'courriers-generes');
```

**Policy 3 - Delete :**
```sql
CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'courriers-generes');
```

### 4. Insérer les modèles d'exemple (optionnel)

Exécutez le fichier SQL suivant :
```bash
insert-example-letter-templates.sql
```

**⚠️ IMPORTANT :** Remplacez `YOUR_USER_ID` par votre UUID d'utilisateur admin avant d'exécuter.

---

## 📝 Utilisation

### Pour les Administrateurs : Créer des Modèles

1. **Accéder à la section**
   - Menu latéral → Administration → Modèles de Courriers

2. **Créer un nouveau modèle**
   - Cliquez sur "Nouveau modèle"

3. **Onglet 1 : Informations**
   - Nom du modèle : ex: "Avertissement Disciplinaire"
   - Type de courrier : sélectionnez dans la liste
   - Cochez "Modèle actif" pour le rendre disponible

4. **Onglet 2 : Contenu**
   - Sujet : écrivez l'objet du courrier
   - Utilisez les boutons bleus pour insérer des variables système
   - Exemple : Cliquez sur `{{nom}}` pour insérer le nom du salarié
   - Écrivez le contenu complet dans la zone de texte

5. **Onglet 3 : Variables Personnalisées**
   - Cliquez sur "Ajouter une variable personnalisée"
   - Exemples de variables :
     - `date_faits` (Date)
     - `description_faits` (Zone de texte)
     - `motif` (Texte court)
   - Ces variables seront remplies manuellement lors de la génération

6. **Enregistrer**
   - Vérifiez l'aperçu
   - Cliquez sur "Créer le modèle"

### Pour les RH : Générer des Courriers

1. **Accéder à la section**
   - Menu latéral → RH → Courriers Générés

2. **Démarrer la génération**
   - Cliquez sur "Générer un courrier"

3. **Étape 1 : Sélectionner le salarié**
   - Recherchez par nom, prénom ou matricule
   - Cliquez sur le salarié concerné
   - Vérifiez les informations affichées
   - Cliquez sur "Suivant"

4. **Étape 2 : Choisir le modèle**
   - Parcourez les modèles disponibles
   - Filtrez par type si nécessaire
   - Cliquez sur le modèle souhaité
   - Cliquez sur "Suivant"

5. **Étape 3 : Remplir les informations**
   - Les variables système sont déjà remplies (affichées en vert)
   - Remplissez les variables personnalisées dans le formulaire
   - Cliquez sur "Voir l'aperçu" pour vérifier le rendu
   - Vérifiez que tout est correct

6. **Générer le PDF**
   - Cliquez sur "Générer et Télécharger PDF"
   - Le PDF se télécharge automatiquement
   - Le courrier est enregistré dans la liste

7. **Actions disponibles**
   - 👁️ Prévisualiser : voir le contenu complet
   - ⬇️ Télécharger : re-télécharger le PDF
   - 🗑️ Supprimer : supprimer le courrier

---

## 🔧 Variables Disponibles

### Variables Système (Auto-remplies)

**Identité du salarié :**
- `{{nom}}` - Nom
- `{{prenom}}` - Prénom
- `{{nom_complet}}` - Nom complet
- `{{matricule_tca}}` - Matricule TCA

**Contact :**
- `{{email}}` - Email
- `{{tel}}` - Téléphone
- `{{adresse}}` - Adresse
- `{{complement_adresse}}` - Complément d'adresse
- `{{code_postal}}` - Code postal
- `{{ville}}` - Ville

**Professionnel :**
- `{{poste}}` - Poste
- `{{site_nom}}` - Site d'affectation
- `{{secteur_nom}}` - Secteur
- `{{date_entree}}` - Date d'entrée
- `{{date_sortie}}` - Date de sortie

**Personnel :**
- `{{date_naissance}}` - Date de naissance
- `{{lieu_naissance}}` - Lieu de naissance
- `{{nationalite}}` - Nationalité
- `{{numero_securite_sociale}}` - N° Sécurité Sociale

**Dates :**
- `{{date_aujourd_hui}}` - Date du jour (automatique)

**Entreprise :**
- `{{nom_entreprise}}` - TRANSPORT CLASSE AFFAIRE
- `{{adresse_entreprise}}` - 111 Avenue Victor Hugo, 75116 Paris
- `{{siret_entreprise}}` - 50426507500029

**Signataire :**
- `{{prenom_signataire}}` - Prénom du signataire
- `{{nom_signataire}}` - Nom du signataire
- `{{fonction_signataire}}` - Direction des Ressources Humaines

---

## 💡 Exemples de Modèles

### Exemple 1 : Avertissement Disciplinaire

**Sujet :**
```
Avertissement disciplinaire
```

**Contenu :**
```
Objet : Avertissement disciplinaire

Bonjour {{prenom}} {{nom}},

Nous avons constaté les faits suivants le {{date_faits}} :
{{description_faits}}

Ces faits constituent un manquement à vos obligations dans le cadre de vos fonctions de {{poste}} au sein de {{nom_entreprise}}.

Par la présente, nous vous notifions un avertissement disciplinaire.

Nous vous demandons de mettre fin à ce comportement et de respecter à l'avenir {{rappel_regle_ou_procedure}}.

Cordialement,

{{prenom_signataire}} {{nom_signataire}}
{{fonction_signataire}}
{{nom_entreprise}}
```

**Variables personnalisées :**
- `date_faits` (Date, requis)
- `description_faits` (Zone de texte, requis)
- `rappel_regle_ou_procedure` (Texte, optionnel)

### Exemple 2 : Attestation de Travail

**Sujet :**
```
Attestation de travail pour {{prenom}} {{nom}}
```

**Contenu :**
```
ATTESTATION DE TRAVAIL

Je soussigné(e), représentant de {{nom_entreprise}},
atteste que {{prenom}} {{nom}}, né(e) le {{date_naissance}}
à {{lieu_naissance}}, est employé(e) au sein de notre
entreprise depuis le {{date_entree}}.

Poste occupé : {{poste}}
Site d'affectation : {{site_nom}}
Secteur : {{secteur_nom}}

Cette attestation est délivrée pour servir et valoir ce
que de droit.

Fait à Paris, le {{date_aujourd_hui}}

{{fonction_signataire}}
{{nom_entreprise}}
```

**Variables personnalisées :** Aucune (toutes les variables sont système)

---

## 🎨 Bonnes Pratiques

### Pour créer des modèles efficaces :

1. **Nommez clairement vos modèles**
   - ✅ "Avertissement Disciplinaire"
   - ❌ "Modèle 1"

2. **Utilisez les bons types de variables**
   - Date → pour les dates
   - Zone de texte → pour les descriptions longues
   - Texte court → pour les références
   - Liste déroulante → pour les choix prédéfinis

3. **Marquez les champs requis**
   - Cochez "Requis" pour les informations essentielles
   - Laissez optionnel ce qui peut être vide

4. **Testez vos modèles**
   - Générez un courrier test
   - Vérifiez le rendu PDF
   - Ajustez si nécessaire

5. **Organisez par type**
   - Utilisez des types cohérents (Attestation, Avertissement, etc.)
   - Facilite la recherche et le filtrage

---

## 🔒 Sécurité

### RLS (Row Level Security)

Le système implémente une sécurité stricte :

**Modèles de courriers :**
- ✅ Tous peuvent voir les modèles actifs
- ✅ Seuls les admins peuvent créer/modifier/supprimer

**Courriers générés :**
- ✅ Tous les authentifiés peuvent créer
- ✅ Seul le créateur peut modifier/supprimer
- ✅ Tous peuvent consulter (historique)

**Storage :**
- ✅ Upload réservé aux authentifiés
- ✅ Lecture réservée aux authentifiés
- ✅ Suppression par le propriétaire uniquement

---

## 🐛 Dépannage

### Le modèle ne s'enregistre pas
- Vérifiez que tous les champs requis sont remplis
- Vérifiez qu'il n'y a pas de variables inconnues (❌ en rouge)
- Vérifiez votre connexion internet

### Les variables ne sont pas remplacées
- Vérifiez l'orthographe exacte de la variable
- Utilisez les boutons bleus pour éviter les erreurs
- Format correct : `{{variable}}` (avec deux accolades)

### Le PDF ne se génère pas
- Vérifiez que tous les champs requis sont remplis
- Vérifiez que le bucket Storage existe
- Vérifiez les policies Storage

### Je ne vois pas mes modèles
- Vérifiez que le modèle est marqué comme "Actif"
- Actualisez la page (F5)
- Vérifiez vos permissions

---

## 📊 Statistiques

Le système affiche automatiquement :
- Nombre total de modèles
- Nombre de modèles actifs
- Nombre de types de courriers
- Courriers générés ce mois
- Courriers générés cette semaine

---

## 🆘 Support

Pour toute question ou problème :
1. Consultez ce guide
2. Vérifiez les fichiers SQL de création
3. Contactez l'administrateur système

---

## 📚 Architecture Technique

### Tables créées :
- `modele_courrier` - Stocke les modèles
- `courrier_genere` - Stocke les courriers générés

### Composants ajoutés :
- `LetterTemplatesManager` - Gestion des modèles (admin)
- `GeneratedLettersList` - Liste des courriers générés
- `GenerateLetterWizard` - Wizard de génération
- `LetterTemplateModal` - Création/édition de modèles
- Composants auxiliaires (variables, preview, etc.)

### Technologies :
- React + TypeScript
- Supabase (Database + Storage)
- jsPDF (génération PDF)
- Tailwind CSS (design)

---

## ✅ Checklist de mise en production

- [ ] Tables créées dans Supabase
- [ ] Bucket Storage créé
- [ ] Policies Storage configurées
- [ ] Modèles d'exemple importés (optionnel)
- [ ] Tests de génération effectués
- [ ] Formation des utilisateurs
- [ ] Documentation distribuée

---

**Version :** 1.0.0
**Dernière mise à jour :** 2025-01-15
**Système :** 100% Additif - N'affecte pas les fonctionnalités existantes
