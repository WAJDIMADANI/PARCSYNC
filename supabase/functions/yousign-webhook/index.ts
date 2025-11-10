import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yousign-signature',
};

async function verifySignature(rawBody: Uint8Array, signature: string): Promise<boolean> {
  const YOUSIGN_WEBHOOK_SECRET = Deno.env.get("YOUSIGN_WEBHOOK_SECRET");

  if (!YOUSIGN_WEBHOOK_SECRET) {
    console.warn("YOUSIGN_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(YOUSIGN_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, rawBody);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === signature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const skipVerify = Deno.env.get("SKIP_WEBHOOK_VERIFY") === "1";
    const raw = new Uint8Array(await req.arrayBuffer());
    const text = new TextDecoder().decode(raw);

    if (!skipVerify) {
      const sig = req.headers.get("x-yousign-signature") ?? "";
      if (sig) {
        const ok = await verifySignature(raw, sig);
        if (!ok) {
          console.error("Invalid webhook signature");
          return new Response("Invalid signature", {
            status: 401,
            headers: corsHeaders
          });
        }
        console.log("Webhook signature verified successfully");
      } else {
        console.warn("No signature provided but SKIP_WEBHOOK_VERIFY is not set");
      }
    } else {
      console.log("Webhook verification skipped (SKIP_WEBHOOK_VERIFY=1)");
    }

    const webhookData = JSON.parse(text);

    console.log("Yousign webhook received:", JSON.stringify(webhookData, null, 2));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const eventType = webhookData.event_name || webhookData.type;
    const signatureRequestId = webhookData.signature_request?.id || webhookData.data?.signature_request_id;
    const externalId = webhookData.signature_request?.external_id;

    if (!signatureRequestId && !externalId) {
      console.error("No signature_request_id or external_id found in webhook");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing event: ${eventType}, signatureRequestId: ${signatureRequestId}, externalId: ${externalId}`);

    // Trouver le contrat par yousign_signature_request_id ou external_id
    let contractId = externalId;

    if (signatureRequestId && !contractId) {
      const contractSearchResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/contrat?yousign_signature_request_id=eq.${signatureRequestId}&select=id`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          }
        }
      );

      if (contractSearchResponse.ok) {
        const contracts = await contractSearchResponse.json();
        if (contracts.length > 0) {
          contractId = contracts[0].id;
          console.log(`Found contract by signature_request_id: ${contractId}`);
        }
      }
    }

    if (!contractId) {
      console.error("Could not find contract for this webhook");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Traiter différents événements
    let updateData: any = {};

    switch (eventType) {
      case "signature_request.done":
        console.log("Processing signature_request.done event");

        // Tous les signataires ont signé
        updateData = {
          statut: 'signe',
          date_signature: new Date().toISOString(),
          yousign_signed_at: new Date().toISOString(),
        };

        // Télécharger et sauvegarder le document signé
        if (webhookData.signature_request?.documents?.[0]?.id) {
          const documentId = webhookData.signature_request.documents[0].id;
          const signatureRequestId = webhookData.signature_request.id;

          try {
            const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");

            // Télécharger le document signé depuis Yousign
            const downloadUrl = `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents/${documentId}/download`;
            console.log("Downloading signed document from:", downloadUrl);

            const downloadResponse = await fetch(downloadUrl, {
              headers: {
                "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
              },
            });

            if (downloadResponse.ok) {
              const pdfBlob = await downloadResponse.blob();

              // Récupérer le profil_id du contrat pour construire le chemin
              const contractInfoResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=profil_id`,
                {
                  headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
                  }
                }
              );

              if (contractInfoResponse.ok) {
                const contractsInfo = await contractInfoResponse.json();
                if (contractsInfo.length > 0) {
                  const profilId = contractsInfo[0].profil_id;

                  // Upload using convention: documents/contrats/{profil_id}/{contrat_id}-signed.pdf
                  const fileName = `documents/contrats/${profilId}/${contractId}-signed.pdf`;

                  const uploadResponse = await fetch(
                    `${SUPABASE_URL}/storage/v1/object/documents/${fileName}`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/pdf',
                      },
                      body: pdfBlob,
                    }
                  );

                  if (uploadResponse.ok) {
                    updateData.fichier_signe_url = fileName;
                    console.log("Signed document saved to storage:", fileName);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error downloading/uploading signed document:", error);
          }
        }
        break;

      case "signature_request.declined":
        // Le signataire a refusé
        updateData = {
          statut: 'refuse',
        };
        break;

      case "signature_request.expired":
        // La demande a expiré
        updateData = {
          statut: 'expire',
        };
        break;

      case "signer.signed":
        // Un signataire a signé (pour multi-signataires)
        console.log("Signer has signed");
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Mettre à jour le contrat si nécessaire
    if (Object.keys(updateData).length > 0) {
      console.log(`Updating contract ${contractId} with:`, updateData);

      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error("Supabase update error:", errorText);
      } else {
        console.log(`Contract ${contractId} updated successfully`);

        // Si le contrat est signé, mettre à jour le profil et créer le document
        if (updateData.statut === 'signe') {
          // Récupérer le profil_id du contrat
          const contractResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=profil_id,modele:modele_id(nom)`,
            {
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
              }
            }
          );

          if (contractResponse.ok) {
            const contracts = await contractResponse.json();
            if (contracts.length > 0) {
              const profilId = contracts[0].profil_id;
              const modeleName = contracts[0].modele?.nom || 'Contrat de travail';

              // Mettre à jour le statut du profil
              await fetch(
                `${SUPABASE_URL}/rest/v1/profil?id=eq.${profilId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({
                    statut: 'contrat_signe'
                  })
                }
              );

              // Créer un document dans la table document si le PDF a été sauvegardé (stocke le chemin storage)
              if (updateData.fichier_signe_url) {
                await fetch(
                  `${SUPABASE_URL}/rest/v1/document`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                      proprietaire_id: profilId,
                      proprietaire_type: 'profil',
                      type: 'contrat',
                      fichier_url: updateData.fichier_signe_url,
                      statut: 'valide',
                    })
                  }
                );
                console.log("Document entry created in database with storage path");
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: true,
        contractId,
        eventType,
        message: "Webhook processed successfully"
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in yousign-webhook:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
