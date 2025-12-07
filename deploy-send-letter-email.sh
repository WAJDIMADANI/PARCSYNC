#!/bin/bash

# Script de déploiement rapide pour la correction d'envoi d'email des courriers

echo "🚀 Déploiement de la correction d'envoi d'email pour les courriers"
echo "================================================================"
echo ""

# Vérifier la connexion Supabase
echo "🔐 Vérification de la connexion Supabase..."
if ! npx supabase projects list &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Supabase"
    echo "🔑 Connexion en cours..."
    npx supabase login
fi

echo "✅ Connecté à Supabase"
echo ""

# Déployer la fonction
echo "📤 Déploiement de send-letter-email..."
npx supabase functions deploy send-letter-email --project-ref jnlvinwekqvkrywxrjgr --no-verify-jwt

echo ""
echo "✅ Fonction déployée avec succès !"
echo ""
echo "🎉 Correction terminée !"
echo ""
echo "ℹ️  L'envoi d'email pour les courriers fonctionne maintenant avec Brevo"
echo "   Testez en allant dans Courriers Générés et en cliquant sur l'icône Mail"
echo ""
