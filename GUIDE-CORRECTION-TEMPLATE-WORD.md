# 📝 Guide de Correction du Template Word - Avenant

## 🚨 Problème Actuel

Quand on génère un avenant, le document affiche :
```
MADANI}} {{WAJDI}} a été engagé [...] prenant effet le {{2025-12-20}} et se terminant le {{2025-12-19}}.
```

**3 Problèmes :**
1. ❌ **Dates inversées** : la fin (12-20) est avant le début (12-19)
2. ❌ **Format brut** : {{2025-12-20}} au lieu de "20 décembre 2025"
3. ❌ **Accolades restantes** : MADANI}} {{WAJDI}}

---

## ✅ Solutions Appliquées

### 1. Format des Dates ✅ (Corrigé dans le Code)
La fonction Edge `create-yousign-signature` a été mise à jour pour formater automatiquement les dates.

**Résultat :**
- ✅ `2025-12-20` → `20 décembre 2025`
- ✅ `2025-12-19` → `19 décembre 2025`

### 2. Nettoyage des Accolades ✅ (Corrigé dans le Code)
Les accolades vides `{{variable_inexistante}}` sont automatiquement supprimées.

### 3. Ordre des Dates ⚠️ (À Corriger dans le Template Word)
**Cette correction DOIT être faite manuellement dans le fichier Word.**

---

## 📋 Procédure de Correction du Template Word

### Étape 1 : Localiser le Fichier

1. Aller sur **Supabase Dashboard**
2. Menu **Storage**
3. Bucket **modeles-contrats**
4. Trouver le fichier de l'avenant 1 (probablement nommé comme "Avenant 1.docx" ou similaire)

### Étape 2 : Télécharger le Fichier

1. Cliquer sur le fichier
2. Cliquer sur **Download**
3. Sauvegarder sur votre ordinateur

### Étape 3 : Ouvrir dans Word

1. Ouvrir le fichier avec **Microsoft Word**
2. Utiliser **Ctrl+F** (Rechercher) pour trouver les variables

### Étape 4 : Corriger les Variables

#### A. Corriger l'Ordre des Dates

**Rechercher :**
```
{{contract_end}}
```

**ET**

```
{{contract_start}}
```

**Vérifier la phrase :**
Si vous voyez quelque chose comme :
```
prenant effet le {{contract_end}} et se terminant le {{contract_start}}
```

**Corriger en :**
```
prenant effet le {{contract_start}} et se terminant le {{contract_end}}
```

#### B. Vérifier les Noms (optionnel)

Si vous voyez des doubles accolades comme :
```
{{MADANI}} {{WAJDI}}
```

Remplacer par les bonnes variables :
```
{{prenom}} {{nom}}
```

### Étape 5 : Sauvegarder

1. **Fichier** → **Enregistrer**
2. Garder le format **.docx**

### Étape 6 : Re-uploader

1. Retourner sur **Supabase Storage**
2. Même bucket **modeles-contrats**
3. **Upload** → Sélectionner le fichier corrigé
4. **Remplacer** le fichier existant

---

## 🧪 Test Après Correction

### Tester avec un Avenant

1. Aller dans l'application
2. Sélectionner un employé avec un CDD existant
3. Créer un avenant 1
4. Remplir les informations
5. Envoyer le contrat
6. Vérifier le document généré

**Le document devrait maintenant afficher :**
```
MADANI WAJDI a été engagé [...] prenant effet le 01 septembre 2025 et se terminant le 19 décembre 2025.
```

---

## 📊 Résumé des Corrections

| Problème | Solution | État |
|----------|----------|------|
| Format dates ({{2025-12-20}}) | Fonction Edge mise à jour | ✅ Automatique |
| Accolades restantes | Nettoyage automatique | ✅ Automatique |
| Dates inversées | Corriger template Word | ⚠️ Manuel |
| Dates CDD non éditables | Formulaire mis à jour | ✅ Automatique |
| Champs Date début/fin inutiles | Supprimés du formulaire | ✅ Automatique |

---

## 🔧 Modifications Techniques Effectuées

### 1. Fonction Edge `/create-yousign-signature/index.ts`
```typescript
// ✅ Nouvelle fonction de formatage
function formatDateFR(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// ✅ Préparation automatique des variables
function prepareVariables(variables) {
  // Formate toutes les dates en français
  // Nettoie les valeurs vides
}
```

### 2. Formulaire `/src/components/ContractSendModal.tsx`
```typescript
// ✅ Supprimé : Champs "Date de début" et "Date de fin (si CDD)"
// ✅ Modifié : Champs CDD maintenant éditables (pas disabled)
```

---

## 🆘 Si Ça Ne Marche Toujours Pas

### Vérifier les Logs

1. Après avoir envoyé un contrat, ouvrir la console développeur (F12)
2. Regarder l'onglet **Network**
3. Chercher la requête vers `create-yousign-signature`
4. Vérifier les logs dans l'onglet **Console**

### Variables à Vérifier

Les variables suivantes doivent être présentes dans le contrat :
- `contract_start` : Date début CDD
- `contract_end` : Date fin CDD
- `employees_date_de_fin__av1` : Date fin avenant 1
- `prenom` : Prénom employé
- `nom` : Nom employé
- `poste` : Poste
- etc.

---

## 📞 Besoin d'Aide ?

Si le problème persiste après avoir suivi ce guide :

1. Vérifier que le fichier Word a bien été remplacé dans Supabase Storage
2. Vider le cache du navigateur (Ctrl+Shift+Delete)
3. Tester en navigation privée
4. Envoyer une capture d'écran du document généré

---

**🎯 Une fois le template Word corrigé, tout fonctionnera automatiquement !**
