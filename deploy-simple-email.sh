#!/bin/bash

# Script de déploiement de la fonction send-simple-email

echo "🚀 Déploiement de la fonction send-simple-email..."

supabase functions deploy send-simple-email --no-verify-jwt

echo "✅ Déploiement terminé !"
echo ""
echo "La fonction est maintenant disponible à l'URL :"
echo "https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/send-simple-email"
