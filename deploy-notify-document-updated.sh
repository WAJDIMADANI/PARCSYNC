#!/bin/bash

echo "🚀 Déploiement de la fonction notify-document-uploaded..."

supabase functions deploy notify-document-uploaded \
  --project-ref YOUR_PROJECT_REF

echo "✅ Fonction déployée avec succès !"
echo ""
echo "📝 Note : Cette fonction accepte maintenant 2 modes d'authentification :"
echo "   1) Bearer token (utilisateurs connectés)"
echo "   2) Upload token dans le body (accès anonyme)"
