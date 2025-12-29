# Solution Rapide - Upload Documents Candidats

## Problème
Erreur 400 lors de l'ajout de documents aux candidats. Le bucket "candidatures" n'existe pas ou n'est pas configuré correctement.

## Solution en 2 étapes

### Étape 1 : Créer le bucket candidatures
Exécutez le fichier SQL suivant dans l'éditeur SQL de Supabase :
- **Fichier** : `FIX-CANDIDATURES-BUCKET.sql`

### Étape 2 : Tester
1. Ouvrez l'onglet "Candidats" ou "Vivier"
2. Cliquez sur "Modifier le candidat"
3. Ajoutez un document (CV, lettre de motivation, etc.)
4. Cliquez sur "En cours..."
5. Le document devrait maintenant être uploadé avec succès

## Ce qui a été corrigé

1. Création du bucket "candidatures" avec les bonnes permissions
2. Organisation des fichiers par type :
   - CV → `candidatures/cv/`
   - Lettres de motivation → `candidatures/lettres/`
   - Cartes d'identité → `candidatures/cartes-identite/`

3. Politiques de sécurité :
   - Upload : utilisateurs authentifiés uniquement
   - Lecture : publique (pour afficher les documents)
   - Modification : utilisateurs authentifiés uniquement
   - Suppression : utilisateurs authentifiés uniquement

## Vérification
Pour vérifier que le bucket existe :
1. Allez dans Supabase Dashboard
2. Section "Storage"
3. Vous devriez voir le bucket "candidatures"
