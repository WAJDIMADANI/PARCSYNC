#!/bin/bash

# Script de déploiement des fonctions email avec le nouveau branding TRANSPORT CLASSE AFFAIRE

echo "🚀 Déploiement des fonctions email mises à jour..."

# Liste des fonctions à déployer
functions=(
  "send-onboarding-email"
  "send-application-link"
  "send-contract-email"
  "send-documents-email"
  "send-missing-documents-reminder"
  "send-all-missing-documents-reminder"
  "send-rejection-email"
  "send-letter-email"
  "send-medical-certificate-request"
  "send-contract-pdf-simple"
  "generate-contract-pdf"
)

# Déployer chaque fonction
for func in "${functions[@]}"
do
  echo "📦 Déploiement de $func..."
  supabase functions deploy "$func" --no-verify-jwt

  if [ $? -eq 0 ]; then
    echo "✅ $func déployée avec succès"
  else
    echo "❌ Erreur lors du déploiement de $func"
  fi

  echo ""
done

echo "✨ Déploiement terminé !"
echo ""
echo "Les emails utiliseront maintenant 'TRANSPORT CLASSE AFFAIRE' au lieu de 'PARC SYNC'"
