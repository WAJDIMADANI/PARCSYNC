#!/bin/bash

# Script de déploiement de la fonction send-simple-email
# À exécuter depuis votre terminal local (pas dans l'interface)

echo "🚀 Déploiement de la fonction send-simple-email..."
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI n'est pas installé."
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Se connecter à Supabase (si ce n'est pas déjà fait)
echo "📡 Vérification de la connexion à Supabase..."
supabase functions deploy send-simple-email --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fonction send-simple-email déployée avec succès !"
    echo ""
    echo "🎯 La fonction est maintenant disponible."
    echo "📍 Testez-la dans l'interface RH > Emails"
else
    echo ""
    echo "❌ Erreur lors du déploiement."
    echo "Assurez-vous d'être connecté à Supabase avec: supabase link"
fi
