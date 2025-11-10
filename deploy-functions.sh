#!/bin/bash

# Script de déploiement des Edge Functions Supabase
# Ce script déploie toutes les fonctions nécessaires pour PARC SYNC

echo "🚀 Déploiement des Edge Functions Supabase"
echo "=========================================="
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation en cours..."
    npm install -g supabase
fi

echo "✅ Supabase CLI détecté"
echo ""

# Login (si nécessaire)
echo "🔐 Connexion à Supabase..."
supabase login

# Link au projet
echo "🔗 Connexion au projet..."
supabase link --project-ref jnlvinwekqvkrywxrjgr

# Configuration des secrets
echo ""
echo "🔑 Configuration des secrets..."
supabase secrets set BREVO_API_KEY="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"
supabase secrets set YOUSIGN_API_KEY="oXoYdHHpdz3vjINZUhp97wIvsqGrjPtp"
supabase secrets set VITE_APP_URL="https://parcsync.madimpact.fr"

echo "✅ Secrets configurés"
echo ""

# Déploiement des fonctions
echo "📤 Déploiement des fonctions..."
echo ""

echo "1/7 - Déploiement de create-yousign-signature..."
supabase functions deploy create-yousign-signature --no-verify-jwt

echo "2/7 - Déploiement de generate-contract-pdf..."
supabase functions deploy generate-contract-pdf --no-verify-jwt

echo "3/7 - Déploiement de send-contract-email..."
supabase functions deploy send-contract-email --no-verify-jwt

echo "4/7 - Déploiement de send-application-link..."
supabase functions deploy send-application-link --no-verify-jwt

echo "5/7 - Déploiement de send-onboarding-email..."
supabase functions deploy send-onboarding-email --no-verify-jwt

echo "6/7 - Déploiement de send-rejection-email..."
supabase functions deploy send-rejection-email --no-verify-jwt

echo "7/7 - Déploiement de yousign-webhook..."
supabase functions deploy yousign-webhook --no-verify-jwt

echo ""
echo "✅ Toutes les fonctions ont été déployées avec succès !"
echo ""
echo "🎉 Déploiement terminé !"
echo ""
echo "Tu peux maintenant utiliser l'application pour envoyer des contrats."
