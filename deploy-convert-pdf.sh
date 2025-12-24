#!/bin/bash

# Script de déploiement de la fonction Edge convert-courrier-to-pdf
# Usage: ./deploy-convert-pdf.sh

set -e

echo "🚀 Déploiement de convert-courrier-to-pdf"
echo "=========================================="

# Vérifier que la clé API CloudConvert est configurée
echo ""
echo "⚠️  Assurez-vous d'avoir configuré CLOUDCONVERT_API_KEY :"
echo "   supabase secrets set CLOUDCONVERT_API_KEY=votre-clé"
echo ""
read -p "La clé API est-elle configurée ? (o/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Veuillez configurer la clé API CloudConvert d'abord"
    echo ""
    echo "Étapes :"
    echo "1. Créer un compte sur https://cloudconvert.com/"
    echo "2. Obtenir votre API Key dans le dashboard"
    echo "3. Exécuter : supabase secrets set CLOUDCONVERT_API_KEY=votre-clé"
    exit 1
fi

# Vérifier que le fichier existe
if [ ! -f "supabase/functions/convert-courrier-to-pdf/index.ts" ]; then
    echo "❌ Fichier supabase/functions/convert-courrier-to-pdf/index.ts introuvable"
    exit 1
fi

echo ""
echo "📦 Déploiement de la fonction..."
supabase functions deploy convert-courrier-to-pdf

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fonction déployée avec succès !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "1. Déployer le frontend : npm run build"
    echo "2. Tester la conversion dans l'interface"
    echo ""
    echo "🔍 Pour voir les logs :"
    echo "   Supabase Dashboard > Edge Functions > convert-courrier-to-pdf > Logs"
    echo ""
else
    echo ""
    echo "❌ Échec du déploiement"
    exit 1
fi
