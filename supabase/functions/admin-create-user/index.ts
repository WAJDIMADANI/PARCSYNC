// supabase/functions/admin-create-user/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  email: string;
  nom: string;
  prenom: string;
  password?: string;
  pole_id?: string | null;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Fallback robuste car "getUserByEmail" n'existe pas en supabase-js v2.
 * On parcourt la liste des users côté Admin (ok pour des volumes raisonnables).
 */
async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  const perPage = 200; // tu peux monter si tu veux (ex: 500)
  let page = 1;

  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) return { user: null, error };

    // selon versions, data peut varier => on sécurise
    const users: Array<{ id: string; email?: string | null }> =
      (data as any)?.users ?? (data as any)?.data?.users ?? [];

    const found = users.find((u) => normalizeEmail(u.email ?? "") === email);
    if (found) return { user: found, error: null };

    if (!users.length || users.length < perPage) break;
    page += 1;
  }

  return { user: null, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
      return json(500, {
        error:
          "Missing env vars (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client "user" pour identifier l'appelant via son JWT
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    const caller = userData?.user;

    if (userErr || !caller) {
      return json(401, { error: "Unauthorized" });
    }

    // Client admin (service role) pour actions admin + bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Charger app_utilisateur de l'appelant
    const { data: callerApp, error: callerAppErr } = await supabaseAdmin
      .from("app_utilisateur")
      .select("id, actif, pole_id")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    if (callerAppErr) {
      console.error("caller app_utilisateur error:", callerAppErr);
      return json(500, { error: "Failed to load caller app user" });
    }

    if (!callerApp || callerApp.actif !== true) {
      return json(403, { error: "Forbidden (caller not found/inactive)" });
    }

    const isSuperAdmin = callerApp.pole_id === null;

    // 2) Permission check backend ALIGNÉE avec ton front
    // -> autorisé si super-admin OU permission active 'admin/utilisateurs'
    if (!isSuperAdmin) {
      const { data: permRow, error: permErr } = await supabaseAdmin
        .from("utilisateur_permissions")
        .select("id")
        .eq("utilisateur_id", callerApp.id)
        .eq("section_id", "admin/utilisateurs")
        .eq("actif", true)
        .maybeSingle();

      if (permErr) {
        console.error("permission check error:", permErr);
        return json(500, { error: "Failed to check permissions" });
      }

      if (!permRow) {
        return json(403, { error: "Forbidden (not admin)" });
      }
    }

    // 3) Parse body
    const body = (await req.json()) as Body;

    const email = normalizeEmail(body.email);
    const nom = String(body.nom ?? "").trim();
    const prenom = String(body.prenom ?? "").trim();
    const password = String(body.password ?? "").trim();
    const pole_id = body.pole_id ?? null;

    if (!email || !email.includes("@")) return json(400, { error: "Invalid email" });
    if (!nom) return json(400, { error: "Missing nom" });
    if (!prenom) return json(400, { error: "Missing prenom" });
    if (!password || password.length < 8) return json(400, { error: "Password must be at least 8 characters" });

    // 4) Auth user: créer ou récupérer l'utilisateur existant
    let authUserId: string | null = null;
    let invited = false;

    // Chercher si l'utilisateur existe déjà
    const { user: existing, error: findErr } = await findAuthUserByEmail(
      supabaseAdmin,
      email,
    );

    if (findErr) {
      console.error("listUsers/findAuthUserByEmail error:", findErr);
      return json(500, {
        error: "Auth lookup failed (listUsers)",
        details: findErr.message ?? String(findErr),
      });
    }

    if (existing?.id) {
      // Utilisateur existe déjà
      authUserId = existing.id;
      invited = false;
    } else {
      // Créer un nouvel utilisateur avec le mot de passe fourni
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Auto-confirmer l'email
        });

      if (createErr) {
        console.error("createUser error:", createErr);
        return json(500, {
          error: "Failed to create user",
          details: createErr.message ?? String(createErr),
        });
      }

      authUserId = newUser?.user?.id ?? null;
      invited = true;
    }

    if (!authUserId) {
      return json(500, { error: "Auth user id missing after create/lookup" });
    }

    // 5) Sync/Upsert app_utilisateur (robuste aux doublons)
    const { data: existingRows, error: existingAppErr } = await supabaseAdmin
      .from("app_utilisateur")
      .select("id, auth_user_id, email")
      .ilike("email", email);

    if (existingAppErr) {
      console.error("existing app_user lookup error:", existingAppErr);
      return json(500, { error: "App user lookup failed" });
    }

    if ((existingRows?.length ?? 0) > 1) {
      return json(409, {
        error: "Conflict: multiple app_utilisateur rows with same email",
        rows: existingRows,
      });
    }

    const existingApp = existingRows?.[0] ?? null;

    if (existingApp?.auth_user_id && existingApp.auth_user_id !== authUserId) {
      return json(409, {
        error: "Conflict: this email is already linked to another auth_user_id",
        app_user_id: existingApp.id,
        current_auth_user_id: existingApp.auth_user_id,
        target_auth_user_id: authUserId,
      });
    }

    let appUserId: string;

    if (!existingApp) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("app_utilisateur")
        .insert({
          email,
          auth_user_id: authUserId,
          nom,
          prenom,
          actif: true,
          pole_id,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("insert app_user error:", insertErr);
        return json(500, { error: insertErr.message || "Insert app user failed" });
      }

      appUserId = inserted.id;
    } else {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("app_utilisateur")
        .update({
          auth_user_id: authUserId, // si null avant, on le lie
          nom,
          prenom,
          pole_id,
          actif: true,
        })
        .eq("id", existingApp.id)
        .select("id")
        .single();

      if (updateErr) {
        console.error("update app_user error:", updateErr);
        return json(500, { error: updateErr.message || "Update app user failed" });
      }

      appUserId = updated.id;
    }

    return json(200, {
      ok: true,
      created: invited,
      auth_user_id: authUserId,
      app_user_id: appUserId,
    });
  } catch (e) {
    console.error("admin-create-user fatal:", e);
    return json(500, { error: String((e as any)?.message ?? e) });
  }
});
