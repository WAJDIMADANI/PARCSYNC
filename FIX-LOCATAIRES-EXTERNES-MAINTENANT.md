# FIX Locataires Externes - À FAIRE MAINTENANT

## Problème identifié

```
Erreur lors de la création de l'attribution: 
null value in column "profil_id" violates not-null constraint
```

Quand vous essayez d'attribuer un véhicule à un locataire externe (personne ou entreprise), ça échoue car la table exige un `profil_id` (salarié).

## Solution en 2 étapes

### ÉTAPE 1: Exécuter le SQL

1. Ouvrir Supabase Dashboard: https://supabase.com/dashboard
2. Aller dans **SQL Editor**
3. Copier le contenu du fichier: `fix-attribution-vehicule-locataires-externes.sql`
4. Cliquer sur **RUN**

Le script va:
- Rendre `profil_id` nullable (pour locataires externes)
- Rendre `type_attribution` nullable (pour locataires externes)
- Ajouter une contrainte pour garantir qu'il y a soit un profil, soit un loueur

### ÉTAPE 2: Tester

1. Recharger votre application
2. Module Parc → Cliquer sur un véhicule
3. Onglet "Attributions" → "Attribuer"
4. Choisir "Personne externe" ou "Entreprise externe"
5. Sélectionner un locataire externe dans la liste
6. Remplir la date de début
7. Cliquer "Confirmer l'attribution"
8. ✅ Ça devrait marcher!

## Ce qui change

**AVANT:**
- Impossible d'attribuer aux locataires externes
- `profil_id` obligatoire → bloque les externes

**APRÈS:**
- ✅ Attribution aux salariés TCA (profil_id renseigné)
- ✅ Attribution aux locataires externes (profil_id = NULL, loueur_id renseigné)
- Contrainte garantit qu'il y a toujours soit l'un soit l'autre

## Fichiers créés

1. **fix-attribution-vehicule-locataires-externes.sql**
   → Script SQL à exécuter

2. **EXECUTER-FIX-ATTRIBUTION-LOCATAIRES-EXTERNES.md**
   → Guide détaillé avec explications techniques

3. **FIX-LOCATAIRES-EXTERNES-MAINTENANT.md** (ce fichier)
   → Guide rapide

---

**Durée:** 2 minutes
**Risque:** Aucun
**Urgence:** Haute (bloque l'attribution aux externes)
