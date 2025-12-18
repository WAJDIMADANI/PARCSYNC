#!/bin/bash

# ========================================
# SCRIPT DE TEST DU WEBHOOK YOUSIGN
# ========================================

echo "🧪 Test du webhook Yousign..."
echo ""

# URL du webhook
WEBHOOK_URL="https://jnlvinwekqvkrywxrjgr.supabase.co/functions/v1/yousign-webhook"

# Payload de test (remplace TEST-ID par un vrai ID de contrat)
PAYLOAD='{
  "event_name": "signature_request.done",
  "data": {
    "signature_request": {
      "external_id": "TEST-ID",
      "status": "done"
    }
  }
}'

echo "📤 Envoi du webhook à: $WEBHOOK_URL"
echo "📦 Payload:"
echo "$PAYLOAD" | jq .
echo ""

# Envoyer la requête
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Séparer le code de statut et le body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📥 Réponse HTTP: $HTTP_CODE"
echo "📄 Body:"
echo "$BODY" | jq .
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook appelé avec succès!"
  echo ""
  echo "🔍 Prochaines étapes:"
  echo "  1. Vérifie les logs dans Supabase (Edge Functions > yousign-webhook > Logs)"
  echo "  2. Exécute DIAGNOSTIC-WEBHOOK-CONTRATS.sql pour voir les contrats"
  echo "  3. Si TEST-ID existe, vérifie si le statut a changé"
else
  echo "❌ Erreur lors de l'appel du webhook"
  echo ""
  echo "🔧 Vérifications à faire:"
  echo "  1. L'URL du webhook est-elle correcte?"
  echo "  2. La fonction yousign-webhook est-elle déployée?"
  echo "  3. Les logs Supabase montrent-ils une erreur?"
fi

echo ""
echo "========================================"
echo "Pour tester avec un vrai contrat:"
echo "  1. Trouve l'ID d'un contrat en statut 'envoye'"
echo "  2. Remplace TEST-ID dans le script par cet ID"
echo "  3. Relance ce script"
echo "========================================"
