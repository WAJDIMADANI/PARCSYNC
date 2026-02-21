import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-upload-token",
};

type Body = {
  profil_id: string;
  document_label: string;
  token?: string; // upload token (fallback)
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isLikelyJwt(value: string) {
  return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(value);
}

export default Deno.serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const profil_id = (body.profil_id ?? "").trim();
    const document_label = (body.document_label ?? "").trim();

    // ✅ Token: header first, fallback to body.token
    const headerUploadToken = (req.headers.get("x-upload-token") ?? "").trim();
    const uploadToken = (headerUploadToken || (body.token ?? "")).trim();

    if (!profil_id || !document_label) {
      return json(400, { error: "profil_id and document_label are required" });
    }

    // --- Auth mode A : JWT user (si connecté)
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    let authUserId: string | null = null;

    if (bearer && isLikelyJwt(bearer)) {
      const { data: authData, error: authErr } =
        await supabaseAdmin.auth.getUser(bearer);
      if (!authErr && authData?.user?.id) authUserId = authData.user.id;
    }

    // --- Auth mode B : upload token (lien anonyme)
    let tokenOk = false;

    if (!authUserId && uploadToken) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("upload_tokens")
        .select("token, profil_id, expires_at")
        .eq("token", uploadToken)
        .eq("profil_id", profil_id)
        .maybeSingle();

      if (tokenError || !tokenData) {
        return json(401, { error: "Invalid upload token" });
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return json(401, { error: "Upload token expired" });
      }

      tokenOk = true;
    }

    if (!authUserId && !tokenOk) {
      return json(401, {
        error: "Missing authentication (valid JWT or upload token required)",
      });
    }

    // --- Profil
    const { data: profil, error: profilErr } = await supabaseAdmin
      .from("profil")
      .select("id, user_id, prenom, nom, matricule_tca")
      .eq("id", profil_id)
      .maybeSingle();

    if (profilErr)
      return json(500, { error: "profil select failed", details: profilErr.message });
    if (!profil) return json(404, { error: "profil not found" });

    // Si connecté, il faut matcher le user_id du profil
    if (authUserId && profil.user_id && profil.user_id !== authUserId) {
      return json(403, { error: "Forbidden: profil not owned by current user" });
    }

    const fullName = `${profil.prenom ?? ""} ${profil.nom ?? ""}`.trim();
    const matricule = profil.matricule_tca
      ? ` (matricule ${profil.matricule_tca})`
      : "";

    // --- Destinataires
    const POLE_ACCUEIL_RECRUTEMENT = "788db7fd-eee5-41fd-b548-a0853e4bea93";
    const POLE_COMPTA = "0dcd78ec-d5f8-4a68-b6a7-8b69b044286e";

    const { data: recipients, error: recErr } = await supabaseAdmin
      .from("app_utilisateur")
      .select("id, pole_id, auth_user_id")
      .in("pole_id", [POLE_ACCUEIL_RECRUTEMENT, POLE_COMPTA])
      .not("auth_user_id", "is", null);

    if (recErr)
      return json(500, { error: "recipients select failed", details: recErr.message });

    // dédoublonnage par id (au cas où)
    const uniqueIds = new Set<string>();
    const cleanRecipients = (recipients ?? []).filter((r) => {
      if (!r?.id) return false;
      if (uniqueIds.has(r.id)) return false;
      uniqueIds.add(r.id);
      return true;
    });

    const now = new Date().toISOString();
    const rows = cleanRecipients.map((r) => ({
      utilisateur_id: r.id,
      type: "demande_externe",
      titre: "Document reçu",
      description: `${fullName}${matricule} a téléversé : ${document_label}`,
      contenu: null,
      reference_id: profil_id,
      reference_type: "profil",
      statut: "nouveau",
      lu: false,
      created_at: now,
      updated_at: now,
    }));

    if (rows.length === 0) {
      return json(200, {
        ok: true,
        inserted: 0,
        warning: "Aucun destinataire trouvé pour ces pôles.",
      });
    }

    const { error: insErr } = await supabaseAdmin.from("inbox").insert(rows);
    if (insErr)
      return json(500, { error: "inbox insert failed", details: insErr.message });

    return json(200, { ok: true, inserted: rows.length });
  } catch (e) {
    return json(500, { error: "Unexpected error", details: String(e) });
  }
});