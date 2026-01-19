import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

interface RequestPayload {
  mode: "all" | "selected" | "sector";
  subject: string;
  message: string;
  profilIds?: string[];
  secteurIds?: string[];
}

function safeJsonParse(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY non configurée");

    const payload: RequestPayload = await req.json();
    const { mode, subject, message, profilIds, secteurIds } = payload;

    console.log("[send-simple-email] Payload reçu:", {
      mode,
      subject,
      profilIdsCount: profilIds?.length,
      secteurIdsCount: secteurIds?.length,
    });

    if (!subject || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Sujet et message requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Configuration Supabase manquante");

    // JWT utilisateur
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      console.error("[send-simple-email] Authorization Bearer manquant");
      return new Response(JSON.stringify({ ok: false, error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client Supabase (RLS) avec JWT user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Vérifier user (évite AuthSessionMissingError)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("[send-simple-email] Erreur auth:", userErr);
      return new Response(JSON.stringify({ ok: false, error: "JWT invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUid = userData.user.id;

    // Trouver app_utilisateur
    const { data: appUser, error: appErr } = await supabase
      .from("app_utilisateur")
      .select("id, email, prenom, nom")
      .eq("auth_user_id", authUid)
      .maybeSingle();

    if (appErr || !appUser?.id) {
      console.error("[send-simple-email] App user non trouvé:", appErr);
      return new Response(JSON.stringify({ ok: false, error: "Utilisateur non trouvé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-simple-email] App user:", appUser.id);

    // Charger profils
    let query = supabase.from("profil").select("id, email, prenom, nom, date_sortie, secteur_id");

    if (mode === "all") {
      query = query.is("date_sortie", null).not("email", "is", null);
    } else if (mode === "selected" && profilIds && profilIds.length > 0) {
      query = query.in("id", profilIds);
    } else if (mode === "sector" && secteurIds && secteurIds.length > 0) {
      query = query.in("secteur_id", secteurIds).is("date_sortie", null);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Aucun destinataire spécifié" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profils, error: profilErr } = await query;
    if (profilErr) {
      console.error("[send-simple-email] Erreur chargement profils:", profilErr);
      throw new Error(`Erreur récupération des profils: ${profilErr.message}`);
    }

    const validProfils = (profils || []).filter((p) => p.email);
    console.log("[send-simple-email] Profils chargés:", validProfils.length);

    if (validProfils.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Aucun destinataire valide trouvé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Créer batch CRM
    const batchData: any = {
      created_by: appUser.id,
      mode,
      brevo_template_id: 0,
      params: { subject, message },
      tags: ["crm_simple"],
      status: "sending",
      total_recipients: validProfils.length,
    };

    // Ajouter les secteur IDs si mode secteur
    if (mode === "sector" && secteurIds && secteurIds.length > 0) {
      batchData.target_secteur_ids = secteurIds;
    }

    const { data: batch, error: batchErr } = await supabase
      .from("crm_email_batches")
      .insert(batchData)
      .select("id")
      .single();

    if (batchErr || !batch?.id) {
      console.error("[send-simple-email] Erreur création batch:", batchErr);
      return new Response(JSON.stringify({ ok: false, error: `Erreur création batch: ${batchErr?.message || "inconnu"}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchId = batch.id;
    console.log("[send-simple-email] Batch créé:", batchId);

    // Insérer recipients
    const recipientRows = validProfils.map((p) => ({
      batch_id: batchId,
      profil_id: p.id,
      email: p.email,
      full_name: `${p.prenom || ""} ${p.nom || ""}`.trim(),
      status: "pending",
    }));

    const { error: recInsErr } = await supabase
      .from("crm_email_recipients")
      .upsert(recipientRows, { onConflict: "batch_id,profil_id", ignoreDuplicates: true });

    if (recInsErr) {
      console.error("[send-simple-email] Erreur insertion recipients:", recInsErr);
      await supabase.from("crm_email_batches").update({ status: "failed", failed_count: validProfils.length }).eq("id", batchId);
      return new Response(JSON.stringify({ ok: false, error: `Erreur insertion recipients: ${recInsErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // ✅ Sender validé (TCA)
    const SENDER_NAME = "TRANSPORT CLASSE AFFAIRE";
    const SENDER_EMAIL = "pierre.chopar12@gmail.com";

    for (const profil of validProfils) {
      try {
        const emailPayload = {
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email: profil.email, name: `${profil.prenom || ""} ${profil.nom || ""}`.trim() }],
          subject,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Bonjour ${profil.prenom || ""} ${profil.nom || ""},</p>
                <div style="white-space: pre-wrap; margin: 20px 0;">${message}</div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">
                  Cordialement,<br>L'équipe TRANSPORT CLASSE AFFAIRE
                </p>
              </div>
            </body>
            </html>
          `,
          tags: ["crm_simple"],
        };

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const brevoTxt = await brevoResponse.text();
        console.log("[send-simple-email] Brevo status:", brevoResponse.status, brevoTxt);

        if (!brevoResponse.ok) {
          throw new Error(`Brevo error ${brevoResponse.status}: ${brevoTxt}`);
        }

        const brevoJson = safeJsonParse(brevoTxt);
        const messageId = brevoJson?.messageId ?? null;

        successCount++;

        await supabase
          .from("crm_email_recipients")
          .update({ status: "sent", brevo_message_id: messageId, error: null })
          .eq("batch_id", batchId)
          .eq("profil_id", profil.id);

        // email_logs (optionnel) : ne doit jamais casser l’envoi
        const { error: logErr } = await supabase.from("email_logs").insert({
          profil_id: profil.id,
          email_to: profil.email,
          subject,
          sent_at: new Date().toISOString(),
          statut: "envoyé",
          type_email: "crm_simple",
        });

        if (logErr) console.error("[send-simple-email] Erreur email_logs:", logErr);
      } catch (err: any) {
        console.error(`[send-simple-email] Erreur envoi à ${profil.email}:`, err);
        failureCount++;

        await supabase
          .from("crm_email_recipients")
          .update({ status: "failed", error: err?.message || "Erreur inconnue" })
          .eq("batch_id", batchId)
          .eq("profil_id", profil.id);
      }
    }

    const finalStatus = failureCount === 0 ? "sent" : successCount > 0 ? "partial" : "failed";

    await supabase
      .from("crm_email_batches")
      .update({
        status: finalStatus,
        sent_count: successCount,
        failed_count: failureCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    console.log("[send-simple-email] Envoi terminé:", { batchId, successCount, failureCount });

    return new Response(JSON.stringify({ ok: true, batchId, successCount, failureCount, total: validProfils.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
