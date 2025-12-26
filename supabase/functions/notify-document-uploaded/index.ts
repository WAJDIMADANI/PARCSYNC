// supabase/functions/notify-document-uploaded/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  profil_id: string;
  document_label: string; // ex: "Permis de conduire", "Carte Vitale", etc.
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    // 1) Auth obligatoire (si ton lien d’upload est public, on adaptera après)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) return json(401, { error: "Missing Bearer token" });

    // Client admin (bypass RLS) + on passe le token pour vérifier l’utilisateur
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser();
    if (authErr || !authData?.user) {
      return json(401, { error: "Invalid token", details: authErr?.message });
    }
    const authUserId = authData.user.id;

    // 2) Lire body
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const { profil_id, document_label } = body;
    if (!profil_id || !document_label) {
      return json(400, { error: "profil_id and document_label are required" });
    }

    // 3) Charger le profil pour composer le message et sécuriser
    const { data: profil, error: profilErr } = await supabaseAdmin
      .from("profil")
      .select("id, user_id, prenom, nom, matricule_tca")
      .eq("id", profil_id)
      .maybeSingle();

    if (profilErr) return json(500, { error: "profil select failed", details: profilErr.message });
    if (!profil) return json(404, { error: "profil not found" });

    // Sécurité simple : si profil.user_id existe, il doit matcher le user connecté
    if (profil.user_id && profil.user_id !== authUserId) {
      return json(403, { error: "Forbidden: profil not owned by current user" });
    }

    const fullName = `${profil.prenom ?? ""} ${profil.nom ?? ""}`.trim();
    const matricule = profil.matricule_tca ? ` (matricule ${profil.matricule_tca})` : "";

    // 4) Récupérer les destinataires = users des pôles Accueil/Recrutement + Comptabilité
    const POLE_ACCUEIL_RECRUTEMENT = "788db7fd-eee5-41fd-b548-a0853e4bea93";
    const POLE_COMPTA = "0dcd78ec-d5f8-4a68-b6a7-8b69b044286e";

    const { data: recipients, error: recErr } = await supabaseAdmin
      .from("app_utilisateur")
      .select("id, auth_user_id, pole_id")
      .in("pole_id", [POLE_ACCUEIL_RECRUTEMENT, POLE_COMPTA])
      .not("auth_user_id", "is", null);

    if (recErr) return json(500, { error: "recipients select failed", details: recErr.message });

    const rows = (recipients ?? []).map((r) => ({
      utilisateur_id: r.id, // FK vers app_utilisateur.id (confirmé)
      type: "demande_externe",
      titre: "Document reçu",
      description: `${fullName}${matricule} a téléversé : ${document_label}`,
      contenu: null,
      reference_id: profil_id,
      reference_type: "profil",
      statut: "nouveau",
      lu: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return json(200, {
        ok: true,
        inserted: 0,
        warning:
          "Aucun destinataire trouvé (vérifie que des users ont bien pole_id=Accueil/Recrutement ou Comptabilité et auth_user_id non null).",
      });
    }

    const { error: insErr } = await supabaseAdmin.from("inbox").insert(rows);
    if (insErr) return json(500, { error: "inbox insert failed", details: insErr.message });

    return json(200, { ok: true, inserted: rows.length });
  } catch (e) {
    return json(500, { error: "Unexpected error", details: String(e) });
  }
});
