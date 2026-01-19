// supabase/functions/send-crm-bulk-email/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  mode: "all" | "selected";
  profilIds?: string[];
  brevo_template_id: number;
  params?: Record<string, unknown>;
  tags?: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// Chunk “safe” (Brevo autorise jusqu’à 1000 messageVersions par appel)
const CHUNK_SIZE = 200;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "CRM";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!brevoKey) {
      return new Response(JSON.stringify({ error: "Missing BREVO_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!senderEmail) {
      return new Response(JSON.stringify({ error: "Missing BREVO_SENDER_EMAIL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // JWT user obligatoire
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;

    // Validations payload
    if (!body?.mode || (body.mode !== "all" && body.mode !== "selected")) {
      return new Response(JSON.stringify({ error: "Invalid mode (all|selected)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Number.isInteger(body.brevo_template_id) || body.brevo_template_id <= 0) {
      return new Response(JSON.stringify({ error: "Invalid brevo_template_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.mode === "selected") {
      if (!Array.isArray(body.profilIds) || body.profilIds.length === 0) {
        return new Response(JSON.stringify({ error: "profilIds is required for selected mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Sécuriser un minimum
      const invalid = body.profilIds.find((id) => typeof id !== "string" || !isUuid(id));
      if (invalid) {
        return new Response(JSON.stringify({ error: `Invalid profilIds UUID: ${invalid}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    });

    // Vérifier user
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Invalid JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUid = userData.user.id;

    // Trouver app_utilisateur du user connecté
    const { data: appUser, error: appErr } = await supabase
      .from("app_utilisateur")
      .select("id, email, prenom, nom")
      .eq("auth_user_id", authUid)
      .maybeSingle();

    if (appErr || !appUser?.id) {
      return new Response(JSON.stringify({ error: "No matching app_utilisateur for auth user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charger les profils destinataires
    let q = supabase
      .from("profil")
      .select("id, email, prenom, nom, is_staff, date_sortie");

    if (body.mode === "all") {
      q = q
        .eq("is_staff", true)
        .is("date_sortie", null)
        .not("email", "is", null);
    } else {
      q = q.in("id", body.profilIds!);
    }

    const { data: profils, error: profErr } = await q;
    if (profErr) {
      return new Response(JSON.stringify({ error: `Profil query failed: ${profErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (profils ?? [])
      .filter((p) => !!p.email)
      .filter((p) => body.mode === "selected" ? true : (p.is_staff === true && p.date_sortie == null))
      .map((p) => ({
        profil_id: p.id as string,
        email: String(p.email),
        full_name: `${p.prenom ?? ""} ${p.nom ?? ""}`.trim(),
        prenom: String(p.prenom ?? ""),
        nom: String(p.nom ?? ""),
      }));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Créer batch en DB (RLS: created_by doit matcher current_app_user_id())
    const { data: batch, error: batchErr } = await supabase
      .from("crm_email_batches")
      .insert({
        created_by: appUser.id,
        mode: body.mode,
        brevo_template_id: body.brevo_template_id,
        params: body.params ?? {},
        tags: body.tags ?? [],
        status: "sending",
        total_recipients: recipients.length,
      })
      .select("id")
      .single();

    if (batchErr || !batch?.id) {
      return new Response(JSON.stringify({ error: `Batch insert failed: ${batchErr?.message ?? "unknown"}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchId = batch.id as string;

    // Insérer recipients (ignore duplicates)
    const recipientRows = recipients.map((r) => ({
      batch_id: batchId,
      profil_id: r.profil_id,
      email: r.email,
      full_name: r.full_name,
      status: "pending",
    }));

    const { error: recInsErr } = await supabase
      .from("crm_email_recipients")
      .upsert(recipientRows, { onConflict: "batch_id,profil_id", ignoreDuplicates: true });

    if (recInsErr) {
      // On marque batch failed
      await supabase.from("crm_email_batches").update({ status: "failed", failed_count: recipients.length }).eq("id", batchId);
      return new Response(JSON.stringify({ error: `Recipients insert failed: ${recInsErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Envoi Brevo
    let sentCount = 0;
    let failedCount = 0;

    const commonParams = body.params ?? {};
    const tags = body.tags ?? ["crm"];

    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);

      const payload = {
        sender: { email: senderEmail, name: senderName },
        templateId: body.brevo_template_id,
        tags,
        // params au niveau racine = variables globales
        params: commonParams,
        // messageVersions = 1 destinataire par version
        messageVersions: chunk.map((r) => ({
          to: [{ email: r.email, name: r.full_name || r.email }],
          // params versionnés (peuvent override)
          params: {
            ...commonParams,
            prenom: r.prenom,
            nom: r.nom,
            email: r.email,
          },
        })),
      };

      const resp = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        failedCount += chunk.length;

        // maj recipients failed (bulk)
        await supabase
          .from("crm_email_recipients")
          .update({ status: "failed", error: json })
          .eq("batch_id", batchId)
          .in("profil_id", chunk.map((c) => c.profil_id));

        continue;
      }

      // Succès : on marque sent (best-effort)
      sentCount += chunk.length;

      await supabase
        .from("crm_email_recipients")
        .update({ status: "sent" })
        .eq("batch_id", batchId)
        .in("profil_id", chunk.map((c) => c.profil_id));

      // Optionnel: si Brevo renvoie messageIds (1 par version) on pourrait les stocker
      // Mais sans boucle DB (coût), on laisse vide pour l’instant.
    }

    const finalStatus =
      failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed";

    await supabase
      .from("crm_email_batches")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return new Response(JSON.stringify({ ok: true, batchId, sentCount, failedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
