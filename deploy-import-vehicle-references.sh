#!/bin/bash

# Script de déploiement de l'Edge Function import-vehicle-references
# Usage: ./deploy-import-vehicle-references.sh

echo "========================================="
echo "Déploiement Edge Function"
echo "import-vehicle-references"
echo "========================================="
echo ""

# Vérifier que le fichier existe
if [ ! -f "supabase/functions/import-vehicle-references/index.ts" ]; then
    echo "❌ Erreur: Le fichier index.ts n'existe pas"
    echo "   Chemin attendu: supabase/functions/import-vehicle-references/index.ts"
    exit 1
fi

echo "✅ Fichier trouvé: supabase/functions/import-vehicle-references/index.ts"
echo ""

# Instructions pour l'utilisateur
echo "📋 Instructions de déploiement:"
echo ""
echo "La fonction Edge doit être déployée via l'outil MCP Supabase."
echo ""
echo "Méthode 1: Via l'assistant"
echo "--------------------------"
echo "Demandez à l'assistant:"
echo "  'Déploie l'edge function import-vehicle-references avec verify_jwt à true'"
echo ""
echo "Méthode 2: Via Supabase CLI (si installé)"
echo "------------------------------------------"
echo "  supabase functions deploy import-vehicle-references"
echo ""
echo "Méthode 3: Via Supabase Dashboard"
echo "----------------------------------"
echo "1. Aller sur https://app.supabase.com"
echo "2. Sélectionner votre projet"
echo "3. Aller dans 'Edge Functions'"
echo "4. Cliquer sur 'Deploy new function'"
echo "5. Uploader le fichier index.ts"
echo "6. Nom: import-vehicle-references"
echo "7. Activer 'Verify JWT'"
echo ""
echo "========================================="
echo ""
echo "📝 Configuration:"
echo "   - Nom: import-vehicle-references"
echo "   - Verify JWT: true"
echo "   - Fichier: supabase/functions/import-vehicle-references/index.ts"
echo ""
echo "🔒 Permissions requises:"
echo "   - manage_vehicle_references"
echo "   - super_admin (alternative)"
echo ""
echo "========================================="
