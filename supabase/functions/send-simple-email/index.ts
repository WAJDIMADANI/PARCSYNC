import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  mode: "all" | "selected";
  subject: string;
  message: string;
  profilIds?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // =========================
    // 0) ENV + PAYLOAD
    // =========================
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY non configurée");

    const payload: RequestPayload = await req.json();
    const { mode, subject, message, profilIds } = payload;

    console.log("[send-simple-email] Payload reçu:", {
      mode,
      subject,
      profilIdsCount: profilIds?.length ?? 0,
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

    // =========================
    // 1) AUTH JWT
    // =========================
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      console.error("[send-simple-email] JWT manquant");
      return new Response(JSON.stringify({ ok: false, error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Plus fiable : ne PAS passer jwt en param, il est déjà dans les headers
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("[send-simple-email] Erreur auth:", userErr);
      return new Response(JSON.stringify({ ok: false, error: "JWT invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUid = userData.user.id;

    // =========================
    // 2) APP USER
    // =========================
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

    // =========================
    // 3) CHARGER PROFILS
    // =========================
    let query = supabase.from("profil").select("id, email, prenom, nom, date_sortie");

    if (mode === "all") {
      query = query.is("date_sortie", null).not("email", "is", null);
    } else if (mode === "selected" && profilIds && profilIds.length > 0) {
      query = query.in("id", profilIds);
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

    const validProfils = (profils ?? []).filter((p) => !!p.email);
    console.log("[send-simple-email] Profils chargés:", validProfils.length);

    if (validProfils.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Aucun destinataire valide trouvé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================
    // 4) CREER BATCH
    // =========================
    const { data: batch, error: batchErr } = await supabase
      .from("crm_email_batches")
      .insert({
        created_by: appUser.id,
        mode,
        brevo_template_id: 0,
        params: { subject, message },
        tags: ["crm_simple"],
        status: "sending",
        total_recipients: validProfils.length,
      })
      .select("id")
      .single();

    if (batchErr || !batch?.id) {
      console.error("[send-simple-email] Erreur création batch:", batchErr);
      return new Response(
        JSON.stringify({ ok: false, error: `Erreur création batch: ${batchErr?.message || "inconnu"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const batchId = batch.id;
    console.log("[send-simple-email] Batch créé:", batchId);

    // =========================
    // 5) INSERER RECIPIENTS
    // =========================
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
      await supabase
        .from("crm_email_batches")
        .update({ status: "failed", failed_count: validProfils.length })
        .eq("id", batchId);

      return new Response(JSON.stringify({ ok: false, error: `Erreur insertion recipients: ${recInsErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================
    // 6) ENVOI BREVO
    // =========================
    let successCount = 0;
    let failureCount = 0;

    for (const profil of validProfils) {
      try {
        const fullName = `${profil.prenom || ""} ${profil.nom || ""}`.trim();

        const emailPayload = {
          sender: {
            name: "MAD IMPACT",
            email: "noreply@mad-impact.com",
          },
          to: [{ email: profil.email, name: fullName }],
          subject,
          htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <p>Bonjour ${fullName},</p>
    <div style="white-space: pre-wrap; margin: 20px 0;">${message}</div>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px;">
      Cordialement,<br> L'équipe MAD IMPACT
    </p>
  </div>
</body>
</html>`,
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

        // IMPORTANT : toujours lire le body
        const brevoText = await brevoResponse.text();
        console.log("[send-simple-email] Brevo status:", brevoResponse.status, brevoText);

        if (!brevoResponse.ok) {
          throw new Error(`Brevo ${brevoResponse.status}: ${brevoText}`);
        }

        // Brevo renvoie messageId si accepté
        let messageId: string | null = null;
        try {
          const brevoJson = JSON.parse(brevoText);
          messageId = brevoJson?.messageId ?? null;
        } catch {
          messageId = null;
        }

        if (!messageId) {
          throw new Error(`Brevo response without messageId: ${brevoText}`);
        }

        successCount++;

        // update recipient => sent + messageId
        const { error: updRecErr } = await supabase
          .from("crm_email_recipients")
          .update({ status: "sent", brevo_message_id: messageId, error: null })
          .eq("batch_id", batchId)
          .eq("profil_id", profil.id);

        if (updRecErr) {
          console.error("[send-simple-email] Erreur update recipient:", updRecErr);
        }

        // log email_logs (si la table a ces colonnes)
        const { error: logErr } = await supabase.from("email_logs").insert({
          profil_id: profil.id,
          email_to: profil.email,
          subject,
          sent_at: new Date().toISOString(),
          statut: "envoyé",
          type_email: "crm_simple",
        });

        if (logErr) {
          console.error("[send-simple-email] Erreur email_logs:", logErr);
        }
      } catch (error: any) {
        failureCount++;
        console.error(`[send-simple-email] Erreur envoi à ${profil.email}:`, error?.message ?? error);

        await supabase
          .from("crm_email_recipients")
          .update({ status: "failed", error: String(error?.message ?? error) })
          .eq("batch_id", batchId)
          .eq("profil_id", profil.id);
      }
    }

    // =========================
    // 7) FINALISER BATCH
    // =========================
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

    return new Response(
      JSON.stringify({ ok: true, batchId, successCount, failureCount, total: validProfils.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(JSON.stringify({ ok: false, error: String(error?.message ?? error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
