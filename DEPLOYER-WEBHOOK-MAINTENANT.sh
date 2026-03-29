#!/bin/bash

# Script de déploiement du webhook yousign-webhook
# À exécuter depuis la racine du projet

echo "🚀 Déploiement de yousign-webhook..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI non installé"
    echo "Installation: npm install -g supabase"
    exit 1
fi

# Déployer la fonction
supabase functions deploy yousign-webhook --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Webhook yousign-webhook déployé avec succès"
    echo ""
    echo "📝 Vérifications à faire:"
    echo "1. Vérifier les logs dans Supabase Dashboard → Edge Functions → yousign-webhook"
    echo "2. Tester avec un nouveau contrat Yousign"
    echo "3. Vérifier que fichier_signe_url est rempli après signature"
    echo "4. Vérifier que le PDF est bien dans Storage → documents → contrats/"
else
    echo "❌ Échec du déploiement"
    echo ""
    echo "🔧 Solution alternative:"
    echo "1. Aller dans Supabase Dashboard"
    echo "2. Edge Functions → yousign-webhook"
    echo "3. Copier le contenu de supabase/functions/yousign-webhook/index.ts"
    echo "4. Coller dans l'éditeur web"
    echo "5. Cliquer sur Deploy"
    exit 1
fi
