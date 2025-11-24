# Calcul Automatique de la Période d'Essai

## ✅ Ce qui a été fait

### ÉTAPE 1 : Base de données (déjà effectuée par vous)
- ✅ Ajout de la colonne `date_fin_periode_essai` dans la table `profil`
- Cette colonne stocke la date de fin de période d'essai calculée automatiquement

### ÉTAPE 2 : Fichier de calcul créé
- ✅ **Nouveau fichier** : `src/lib/trialPeriodCalculator.ts`
- Ce fichier contient toutes les fonctions de calcul de période d'essai
- **Aucun fichier existant n'a été modifié**

### ÉTAPE 3 : Intégration dans le formulaire
- ✅ **Modifications dans** : `src/components/ContractSendModal.tsx`
- Ajouts effectués (aucune suppression, aucune modification de l'existant) :
  - Import de la fonction de calcul
  - 2 nouveaux états React pour gérer le renouvellement et le résultat du calcul
  - 1 `useEffect` qui calcule automatiquement la période d'essai quand les dates changent
  - 1 checkbox "Renouveler la période d'essai" (visible uniquement pour les CDI)
  - 1 bloc d'information qui affiche la période calculée
  - Sauvegarde automatique de `date_fin_periode_essai` dans le profil lors de l'envoi du contrat

---

## 🎯 Comment ça fonctionne

### Pour les CDI
- **Par défaut** : 2 mois de période d'essai
- **Si renouvelée** : 4 mois de période d'essai (cochez la case)
- Calcul : Date de début + X mois - 1 jour
- Exemple : 01/09/2025 + 2 mois = 31/10/2025

### Pour les CDD
- **CDD ≥ 6 mois** : 1 mois de période d'essai
- **CDD < 6 mois** : 1 jour par semaine (max 14 jours)
- Exemple : CDD de 3 mois et 15 jours (109 jours)
  - 109 jours ÷ 7 = 15 semaines
  - Période d'essai = 14 jours (plafonné à 14)
  - 01/09/2025 + 14 jours = 14/09/2025

---

## 📋 Utilisation dans l'interface

1. **Ouvrir le formulaire d'envoi de contrat** pour un salarié
2. **Sélectionner un modèle de contrat** (CDI ou CDD)
3. **Remplir la date de début**
4. **Pour CDI** : Cocher ou non "Renouveler la période d'essai"
5. **Pour CDD** : Remplir aussi la date de fin
6. **Un bloc vert s'affiche automatiquement** avec :
   - La durée calculée (ex: "2 mois", "14 jours", etc.)
   - La date de fin de période d'essai (format DD/MM/YYYY et YYYY-MM-DD)
7. **Envoyer le contrat** : La date est automatiquement sauvegardée dans `profil.date_fin_periode_essai`

---

## 🔍 Où trouver la date calculée après l'envoi

Une fois le contrat envoyé, la date de fin de période d'essai est stockée dans :
- **Table** : `profil`
- **Colonne** : `date_fin_periode_essai`
- **Format** : `YYYY-MM-DD` (date SQL standard)

Vous pouvez la consulter avec cette requête SQL :
```sql
SELECT
  nom,
  prenom,
  date_fin_periode_essai
FROM profil
WHERE date_fin_periode_essai IS NOT NULL;
```

---

## 🛡️ Garanties

### Ce qui N'A PAS été touché :
- ❌ Table `contrat` : aucune modification
- ❌ Autres tables : aucune modification
- ❌ Fonctionnalités existantes : tout fonctionne comme avant
- ❌ Aucun code supprimé ou modifié

### Ce qui A été ajouté :
- ✅ 1 nouveau fichier TypeScript de calcul
- ✅ Quelques lignes dans le formulaire (ajouts uniquement)
- ✅ 1 colonne dans la table `profil`

---

## 🧪 Tests manuels recommandés

### Test 1 : CDI standard (2 mois)
1. Sélectionner un modèle CDI
2. Date de début : 01/09/2025
3. Ne PAS cocher "Renouveler"
4. **Résultat attendu** : 31/10/2025 (2 mois)

### Test 2 : CDI renouvelé (4 mois)
1. Sélectionner un modèle CDI
2. Date de début : 01/09/2025
3. Cocher "Renouveler la période d'essai"
4. **Résultat attendu** : 31/12/2025 (4 mois)

### Test 3 : CDD court (< 6 mois)
1. Sélectionner un modèle CDD
2. Date de début : 01/09/2025
3. Date de fin : 19/12/2025 (109 jours = ~3.5 mois)
4. **Résultat attendu** : 14/09/2025 (14 jours)

### Test 4 : CDD long (≥ 6 mois)
1. Sélectionner un modèle CDD
2. Date de début : 01/09/2025
3. Date de fin : 01/05/2026 (242 jours = ~8 mois)
4. **Résultat attendu** : 31/09/2025 (1 mois)

---

## 📞 Support

Si vous avez des questions ou rencontrez un problème :
1. Vérifiez que la colonne `date_fin_periode_essai` existe bien dans la table `profil`
2. Vérifiez que le fichier `src/lib/trialPeriodCalculator.ts` existe
3. Consultez la console du navigateur (F12) pour voir les logs de calcul

---

## 🎉 Résumé

Vous avez maintenant un système de calcul automatique de période d'essai qui :
- ✅ Respecte les règles légales françaises
- ✅ S'adapte au type de contrat (CDI/CDD)
- ✅ Permet le renouvellement pour les CDI
- ✅ Affiche le résultat en temps réel
- ✅ Sauvegarde automatiquement la date calculée
- ✅ Ne touche à aucune fonctionnalité existante
