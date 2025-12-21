#!/bin/bash

echo "=================================================="
echo "TEST D'ACCÈS AUX FICHIERS DOCX CDI"
echo "=================================================="
echo ""

echo "📋 Test des URLs des modèles CDI..."
echo ""

# URLs des fichiers CDI d'après la base de données
CDI_URLS=(
  "https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/modeles-contrats/1766088241281_CDD_au_CDI___l_issue_de_deux_avenants.docx"
  "https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/modeles-contrats/1766088171690_CDI_Reprise_forfait_3H.docx"
  "https://jnlvinwekqvkrywxrjgr.supabase.co/storage/v1/object/public/modeles-contrats/1766088215561_CDI_REPRISE_Forfait_4h.docx"
)

NAMES=(
  "CDD au CDI à l'issue de deux avenants"
  "CDI Reprise forfait 3H"
  "CDI REPRISE Forfait 4h"
)

SUCCESS=0
FAILED=0

for i in "${!CDI_URLS[@]}"; do
  URL="${CDI_URLS[$i]}"
  NAME="${NAMES[$i]}"

  echo "📄 Test: $NAME"
  echo "   URL: $URL"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Accessible (HTTP $HTTP_CODE)"
    ((SUCCESS++))
  else
    echo "   ❌ Erreur (HTTP $HTTP_CODE)"
    ((FAILED++))
  fi
  echo ""
done

echo "=================================================="
echo "RÉSULTAT"
echo "=================================================="
echo "✅ Fichiers accessibles: $SUCCESS"
echo "❌ Fichiers inaccessibles: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  PROBLÈME DÉTECTÉ"
  echo ""
  echo "Les fichiers DOCX existent mais ne sont pas accessibles."
  echo "Cela signifie que le bucket 'modeles-contrats' n'est pas public."
  echo ""
  echo "SOLUTION :"
  echo "1. Exécuter le script SQL pour corriger les permissions :"
  echo "   FIX-BUCKET-MODELES-CONTRATS-PERMISSIONS.sql"
  echo ""
  echo "2. OU dans Supabase Dashboard :"
  echo "   → Storage → modeles-contrats → Settings"
  echo "   → Cocher 'Public bucket'"
  echo ""
  echo "3. Relancer ce test pour vérifier"
else
  echo "🎉 TOUT FONCTIONNE !"
  echo ""
  echo "Les fichiers DOCX sont accessibles publiquement."
  echo "L'envoi des contrats CDI devrait fonctionner."
  echo ""
  echo "Vous pouvez maintenant :"
  echo "1. Tester l'envoi d'un contrat CDI dans l'app"
  echo "2. Le fichier DOCX sera utilisé (pas le fallback HTML)"
fi
