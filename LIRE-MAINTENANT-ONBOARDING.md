# FIX ONBOARDING - À EXÉCUTER MAINTENANT

## Le problème
**"permission denied for table document"** - Les candidats ne peuvent pas uploader leurs documents.

## La solution (2 minutes)

### Étape 1 : Diagnostic (optionnel)
1. Ouvrez votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Exécutez le fichier `DIAGNOSTIC-ONBOARDING-POLICIES.sql`
4. Regardez les résultats pour voir les politiques actuelles

### Étape 2 : Correction (OBLIGATOIRE)
1. Dans le **SQL Editor** de Supabase
2. Copiez TOUT le contenu du fichier `EXECUTER-MAINTENANT-FIX-ONBOARDING.sql`
3. Collez-le dans l'éditeur
4. Cliquez sur **Run** (▶)
5. Attendez le message "✅ POLITIQUES CRÉÉES AVEC SUCCÈS"

### Étape 3 : Test
1. Ouvrez le lien d'onboarding dans un **nouvel onglet en navigation privée** :
   ```
   https://parcsync.madimpact.fr/onboarding?id=ebf94930-3206-488a-a969-04ef2c100542
   ```
2. Remplissez le formulaire
3. Uploadez les documents
4. Vérifiez qu'il n'y a plus d'erreurs dans la console

## Pourquoi ça ne marchait pas ?

Les politiques RLS (Row Level Security) sur la table `document` et le bucket `candidatures` bloquaient les utilisateurs anonymes (non authentifiés).

Le formulaire d'onboarding est utilisé par des candidats **avant** qu'ils aient un compte, donc ils sont anonymes.

## Ce que le script fait

1. Supprime TOUTES les anciennes politiques qui causent des conflits
2. Crée de nouvelles politiques propres qui autorisent :
   - Les uploads anonymes sur le bucket `candidatures`
   - Les insertions anonymes dans la table `document`
   - La création/mise à jour de profils par les candidats anonymes

## Sécurité

C'est sécurisé car :
- Seul le bucket `candidatures` accepte les uploads anonymes
- Les autres buckets restent protégés
- La suppression de documents nécessite une authentification
