#!/bin/bash

echo "=================================================="
echo "DÉPLOIEMENT FIX CDI YOUSIGN (HTML FALLBACK)"
echo "=================================================="
echo ""

echo "🚀 Ce script va déployer la fonction create-yousign-signature"
echo "   avec le système de fallback HTML→PDF pour les CDI"
echo ""
echo "📝 Nouveauté :"
echo "   - Si le fichier DOCX n'est pas accessible (400)"
echo "   - Le système génère automatiquement un PDF depuis HTML"
echo "   - Plus besoin d'avoir les fichiers DOCX pour envoyer les contrats CDI"
echo ""
echo "Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler..."
read

echo ""
echo "📦 Déploiement de la fonction create-yousign-signature..."
supabase functions deploy create-yousign-signature

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Fonction déployée avec succès!"
  echo ""
  echo "🎉 Vous pouvez maintenant :"
  echo "   1. Envoyer des contrats CDI à Yousign SANS fichier DOCX"
  echo "   2. Le système utilisera automatiquement la génération HTML→PDF"
  echo "   3. Les contrats seront envoyés pour signature électronique"
  echo ""
  echo "📋 Test rapide :"
  echo "   1. Aller dans l'app → Salarié WAJDI MADANI"
  echo "   2. Cliquer sur 'Créer un contrat'"
  echo "   3. Sélectionner un modèle CDI"
  echo "   4. Cliquer sur 'Envoyer le contrat'"
  echo "   5. Le contrat devrait être généré et envoyé à Yousign"
  echo ""
  echo "📊 Vérifier les logs :"
  echo "   - Supabase Dashboard > Functions > create-yousign-signature > Logs"
  echo "   - Rechercher '📝 Génération du PDF depuis HTML (fallback)...'"
  echo ""
else
  echo "❌ Erreur lors du déploiement"
  exit 1
fi
