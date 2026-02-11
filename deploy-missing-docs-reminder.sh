#!/bin/bash

echo "📦 Déploiement de send-missing-documents-reminder..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Déployer la fonction
supabase functions deploy send-missing-documents-reminder --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Fonction déployée avec succès!"
    echo "Les prochains emails de rappel auront des liens directs sans tracking."
else
    echo "❌ Échec du déploiement"
    echo ""
    echo "💡 Déploiement manuel via Dashboard Supabase:"
    echo "1. Aller sur: https://supabase.com/dashboard/project/_/functions"
    echo "2. Cliquer sur 'send-missing-documents-reminder'"
    echo "3. Cliquer sur 'Deploy new version'"
    echo "4. Copier-coller le contenu de: supabase/functions/send-missing-documents-reminder/index.ts"
    echo "5. Cliquer sur 'Deploy'"
    exit 1
fi
