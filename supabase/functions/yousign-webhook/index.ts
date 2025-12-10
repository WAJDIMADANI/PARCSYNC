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
