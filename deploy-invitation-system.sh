#!/bin/bash

echo "🚀 Déploiement du système d'invitation via Brevo..."
echo ""

# Déployer la fonction d'envoi d'email
echo "📧 Déploiement de send-user-invitation..."
npx supabase functions deploy send-user-invitation

# Déployer la fonction admin-create-user mise à jour
echo "👤 Déploiement de admin-create-user..."
npx supabase functions deploy admin-create-user

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Teste en créant un nouvel utilisateur"
echo "2. Vérifie que l'email arrive via Brevo avec 'TCA' comme expéditeur"
echo "3. Clique sur le lien pour définir le mot de passe"
