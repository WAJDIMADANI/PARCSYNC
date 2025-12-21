#!/bin/bash

echo "=================================="
echo "DÉPLOIEMENT FIX YOUSIGN CDI"
echo "=================================="
echo ""

echo "📦 Déploiement de la fonction create-yousign-signature..."
supabase functions deploy create-yousign-signature

if [ $? -eq 0 ]; then
  echo "✅ Fonction déployée avec succès!"
  echo ""
  echo "🔍 ÉTAPES SUIVANTES :"
  echo ""
  echo "1. Vérifier le fichier DOCX du modèle CDI dans Supabase Storage"
  echo "   → Dashboard > Storage > documents"
  echo ""
  echo "2. S'assurer que le bucket 'documents' est PUBLIC"
  echo "   → Dashboard > Storage > documents > Settings > Public bucket"
  echo ""
  echo "3. Vérifier l'URL du modèle CDI dans la table modeles_contrats"
  echo "   → SQL: SELECT * FROM modeles_contrats WHERE type_contrat = 'CDI';"
  echo ""
  echo "4. Tester les deux boutons :"
  echo "   - Bouton BLEU 'Télécharger' : génère PDF sans Yousign"
  echo "   - Bouton VERT 'Renvoyer' : envoie via Yousign (nécessite DOCX)"
  echo ""
else
  echo "❌ Erreur lors du déploiement"
  exit 1
fi
