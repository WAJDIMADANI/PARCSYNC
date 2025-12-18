🚨 ERREUR RLS - CORRECTION EN 3 MINUTES 🚨

==============================================
ÉTAPES À SUIVRE (DANS L'ORDRE)
==============================================

1️⃣ Ouvrir Supabase
   → https://supabase.com/dashboard
   → Sélectionner votre projet
   → Cliquer sur "SQL Editor" dans le menu

2️⃣ Copier le Script
   → Ouvrir le fichier: FIX-RLS-DEMANDE-SUPER-PUISSANT.sql
   → Ctrl+A (tout sélectionner)
   → Ctrl+C (copier)

3️⃣ Exécuter
   → Coller dans SQL Editor (Ctrl+V)
   → Cliquer sur "RUN" (ou Ctrl+Enter)
   → Attendre 3 secondes

4️⃣ Vérifier
   → Vous devriez voir: "✅ SCRIPT EXÉCUTÉ AVEC SUCCÈS"
   → Et une liste de policies

5️⃣ Tester
   → Retourner sur votre app
   → Ctrl+F5 (recharger)
   → Aller sur /demande-externe
   → Entrer matricule: 1353
   → Envoyer une demande

==============================================
FICHIER À UTILISER
==============================================

⭐ FIX-RLS-DEMANDE-SUPER-PUISSANT.sql ⭐

==============================================
SI ÇA NE MARCHE PAS
==============================================

- Vérifier qu'il n'y a pas d'erreur rouge après RUN
- Essayer en navigation privée
- Ouvrir la console (F12) et regarder les erreurs
- M'envoyer une capture d'écran

==============================================
POURQUOI CETTE ERREUR ?
==============================================

La page /demande-externe est accessible SANS connexion
mais Supabase bloque par défaut les utilisateurs non connectés.

Ce script autorise l'accès anonyme sécurisé (comme l'onboarding).

==============================================
