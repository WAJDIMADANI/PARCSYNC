import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-yousign-signature",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== Webhook Yousign appelé ===");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));

    // Lire le body
    const bodyText = await req.text();
    console.log("Body reçu (longueur):", bodyText.length);
    console.log("Body reçu (contenu):", bodyText);

    // Si le body est vide (test de santé, etc.)
    if (!bodyText || !bodyText.trim()) {
      console.log("Body vide - probablement un test");
      return new Response(
        JSON.stringify({ ok: true, message: "Webhook ready" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le JSON
    let webhookData;
    try {
      webhookData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      console.error("Body problématique:", bodyText.substring(0, 500));
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Webhook data parsé:", JSON.stringify(webhookData, null, 2));

    // Extraire les informations
    const eventName = webhookData?.event_name;
    const signatureRequest = webhookData?.data?.signature_request;
    const externalId = signatureRequest?.external_id;
    const status = signatureRequest?.status;

    console.log("Event:", eventName);
    console.log("External ID:", externalId);
    console.log("Status:", status);

    // Filtrer les événements non pertinents
    if (eventName !== "signature_request.done") {
      console.log("Événement ignoré:", eventName);
      return new Response(
        JSON.stringify({ ok: true, ignored: eventName }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier l'external_id
    if (!externalId) {
      console.error("Pas d'external_id dans le webhook");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing external_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mettre à jour le contrat dans Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Mise à jour du contrat:", externalId);

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${externalId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY || "",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          statut: "signe",
          date_signature: new Date().toISOString(),
          yousign_signed_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Erreur lors de la mise à jour:", errorText);
      return new Response(
        JSON.stringify({ ok: false, error: errorText }),
        {
          status: updateResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updated = await updateResponse.json();
    console.log("Contrat mis à jour avec succès:", updated);

    // ========================================
    // Génération automatique notification/incident
    // ========================================
    let notificationResult = null;
    if (updated && updated.length > 0) {
      const contractId = updated[0].id;
      console.log("=== Tentative de création automatique de notification/incident ===");
      console.log("Contract ID:", contractId);

      try {
        // Récupérer le contrat avec toutes ses relations pour vérifier l'éligibilité
        const contractDetailsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=id,profil_id,modele_id,variables,modele_contrat(type_contrat),profil(avenant_1_date_fin,avenant_2_date_fin)`,
          {
            headers: {
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "apikey": SERVICE_KEY || "",
            },
          }
        );

        if (contractDetailsResponse.ok) {
          const contracts = await contractDetailsResponse.json();
          if (contracts && contracts.length > 0) {
            const contract = contracts[0];
            const modeleType = contract.modele_contrat?.type_contrat;
            const variablesType = contract.variables?.type_contrat;
            const variablesDateFin = contract.variables?.date_fin;
            const profilAv1Date = contract.profil?.avenant_1_date_fin;
            const profilAv2Date = contract.profil?.avenant_2_date_fin;

            console.log("Détails du contrat récupérés:");
            console.log("  - Modèle type:", modeleType);
            console.log("  - Variables type:", variablesType);
            console.log("  - Variables date_fin:", variablesDateFin);
            console.log("  - Profil avenant_1_date_fin:", profilAv1Date);
            console.log("  - Profil avenant_2_date_fin:", profilAv2Date);

            // Vérifier l'éligibilité
            let isEligible = false;

            if (modeleType === "CDD" && variablesDateFin) {
              isEligible = true;
              console.log("✓ Éligible: CDD avec date_fin dans variables");
            } else if (modeleType === "Avenant") {
              if (variablesType === "Avenant 1" && (variablesDateFin || profilAv1Date)) {
                isEligible = true;
                console.log("✓ Éligible: Avenant 1 avec date_fin disponible");
              } else if (variablesType === "Avenant 2" && (variablesDateFin || profilAv2Date)) {
                isEligible = true;
                console.log("✓ Éligible: Avenant 2 avec date_fin disponible");
              } else {
                console.log("✗ Non éligible: Avenant sans date_fin ou type inconnu");
              }
            } else {
              console.log("✗ Non éligible: Type de contrat non supporté ou date manquante");
            }

            if (isEligible) {
              console.log("Appel de la fonction SQL create_notification_or_incident_for_contract...");

              // Appeler la fonction SQL via RPC
              const rpcResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/rpc/create_notification_or_incident_for_contract`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SERVICE_KEY}`,
                    "apikey": SERVICE_KEY || "",
                  },
                  body: JSON.stringify({
                    p_contract_id: contractId,
                  }),
                }
              );

              if (rpcResponse.ok) {
                notificationResult = await rpcResponse.json();
                console.log("Résultat de la création:", JSON.stringify(notificationResult, null, 2));

                if (notificationResult.success) {
                  console.log("✓ Succès:", notificationResult.message);
                  console.log("  - Type créé:", notificationResult.type_created);
                  console.log("  - Notification type:", notificationResult.notification_type);
                  console.log("  - ID:", notificationResult.id);
                  console.log("  - Date fin utilisée:", notificationResult.date_fin_utilisee);
                  console.log("  - Source date:", notificationResult.source_date);
                  console.log("  - Jours avant expiration:", notificationResult.days_until_expiry);
                } else {
                  console.log("✗ Échec:", notificationResult.error);
                }
              } else {
                const errorText = await rpcResponse.text();
                console.error("Erreur lors de l'appel RPC:", errorText);
                notificationResult = { success: false, error: errorText };
              }
            } else {
              console.log("Contrat non éligible pour notification/incident automatique");
              notificationResult = { success: false, skipped: true, reason: "Non éligible" };
            }
          } else {
            console.log("Aucun contrat trouvé avec cet ID");
          }
        } else {
          const errorText = await contractDetailsResponse.text();
          console.error("Erreur lors de la récupération des détails du contrat:", errorText);
        }
      } catch (notifError) {
        console.error("Erreur lors de la génération de notification/incident:", notifError);
        console.error("Stack:", notifError.stack);
        notificationResult = { success: false, error: String(notifError) };
      }

      console.log("=== Fin de la création automatique ===");
    }

    // Mettre à jour le profil si nécessaire
    if (updated && updated.length > 0) {
      const profilId = updated[0].profil_id;
      if (profilId) {
        console.log("Mise à jour du profil:", profilId);

        // Récupérer le profil actuel pour vérifier le matricule TCA
        const profilResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profil?id=eq.${profilId}&select=matricule_tca`,
          {
            headers: {
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "apikey": SERVICE_KEY || "",
            },
          }
        );

        const profils = await profilResponse.json();
        const profil = profils && profils.length > 0 ? profils[0] : null;

        // Préparer les données de mise à jour
        const updateData: any = {
          statut: "contrat_signe",
        };

        // Générer un matricule TCA si nécessaire
        if (!profil?.matricule_tca) {
          console.log("Génération du matricule TCA pour le profil:", profilId);

          // Récupérer le dernier matricule TCA
          const lastMatriculeResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profil?select=matricule_tca&matricule_tca=not.is.null&matricule_tca=like.1590*&order=matricule_tca.desc&limit=1`,
            {
              headers: {
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "apikey": SERVICE_KEY || "",
              },
            }
          );

          const lastMatricules = await lastMatriculeResponse.json();
          let nextNumber = 1;

          if (lastMatricules && lastMatricules.length > 0) {
            const lastMatricule = lastMatricules[0].matricule_tca;
            // Extraire le numéro après "1590"
            const match = lastMatricule.match(/^1590(\d+)$/);
            if (match) {
              nextNumber = parseInt(match[1], 10) + 1;
            }
          }

          const newMatricule = `1590${nextNumber}`;
          updateData.matricule_tca = newMatricule;
          console.log("Nouveau matricule TCA généré:", newMatricule);
        }

        // Mettre à jour le profil
        await fetch(
          `${SUPABASE_URL}/rest/v1/profil?id=eq.${profilId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "apikey": SERVICE_KEY || "",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify(updateData),
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Contrat mis à jour avec succès",
        contractId: externalId,
        notificationCreation: notificationResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur fatale dans le webhook:", error);
    console.error("Stack:", error.stack);

    return new Response(
      JSON.stringify({
        ok: false,
        error: String(error),
        stack: error.stack,
      }),
      {
        status: 200, // Retourner 200 pour éviter les retries de Yousign
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
