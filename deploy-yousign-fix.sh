#!/bin/bash

echo "🔧 Déploiement de la correction Yousign..."
echo ""
echo "📋 Cette correction remplace PDFShift par HTML2PDF.it (gratuit)"
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "📦 Installation via npx..."
    npx supabase functions deploy create-yousign-signature
else
    echo "✅ Supabase CLI détecté"
    supabase functions deploy create-yousign-signature
fi

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "🧪 Prochaines étapes :"
echo "1. Testez l'envoi d'un contrat depuis l'interface RH"
echo "2. Vérifiez les logs dans le dashboard Supabase si besoin"
echo "3. Le salarié devrait recevoir un email avec le lien de signature Yousign"
