import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: hyper-responder
 * Endpoint: https://<project-ref>.supabase.co/functions/v1/hyper-responder
 *
 * Env vars required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - YOUSIGN_WEBHOOK_SECRET  (ou YOUSIGN_WEBHOOK_SECRET_KEY en fallback)
 *
 * Optional (testing only):
 * - SKIP_WEBHOOK_VERIFY=true   (désactiver la vérif HMAC)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Yousign-Signature-256, X-Yousign-Retry, X-Yousign-Issued-At",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- HMAC helpers ---
function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeHmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toHex(sig);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isTrue(v: string | null | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

async function restGet<T>(
  baseUrl: string,
  pathAndQuery: string,
  serviceKey: string
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const r = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  const raw = await r.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { ok: r.ok, status: r.status, data, raw };
}

async function restPatch<T>(
  baseUrl: string,
  pathAndQuery: string,
  serviceKey: string,
  body: any,
  prefer: "return=representation" | "return=minimal" = "return=representation"
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const r = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: prefer,
    },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { ok: r.ok, status: r.status, data, raw };
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // IMPORTANT: chez toi le secret s'appelle YOUSIGN_WEBHOOK_SECRET
  // On garde un fallback si tu as encore l'autre nom.
  const YOUSIGN_SECRET =
    Deno.env.get("YOUSIGN_WEBHOOK_SECRET") ??
    Deno.env.get("YOUSIGN_WEBHOOK_SECRET_KEY") ??
    "";

  const SKIP_VERIFY = isTrue(Deno.env.get("SKIP_WEBHOOK_VERIFY"));

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ ok: false, error: "Supabase env vars missing" }, 500);
  }
  if (!YOUSIGN_SECRET && !SKIP_VERIFY) {
    console.error("Missing Yousign webhook secret (YOUSIGN_WEBHOOK_SECRET)");
    return json({ ok: false, error: "Yousign secret missing" }, 500);
  }

  try {
    console.log("=== Yousign Webhook ===");
    console.log("Method:", req.method);
    console.log("UA:", req.headers.get("user-agent"));
    console.log("Content-Type:", req.headers.get("content-type"));
    console.log("X-Yousign-Retry:", req.headers.get("X-Yousign-Retry"));
    console.log("X-Yousign-Issued-At:", req.headers.get("X-Yousign-Issued-At"));

    const bodyText = await req.text();

    if (!bodyText || !bodyText.trim()) {
      console.warn("Empty body received");
      return json({ ok: true, message: "Empty body" }, 200);
    }

    // --- Signature verification (skip uniquement si SKIP_WEBHOOK_VERIFY=true) ---
    if (SKIP_VERIFY) {
      console.warn(
        "SKIP_WEBHOOK_VERIFY enabled (testing mode) — signature NOT verified"
      );
    } else {
      const expected = req.headers.get("X-Yousign-Signature-256") ?? "";
      if (!expected) {
        console.error("Missing X-Yousign-Signature-256 header");
        return json({ ok: false, error: "Missing signature header" }, 401);
      }

      const computedDigest = await computeHmacSha256Hex(
        YOUSIGN_SECRET,
        bodyText
      );
      const computed = `sha256=${computedDigest}`;

      if (!timingSafeEqual(expected, computed)) {
        console.error("Signature mismatch");
        console.error("Expected header:", expected);
        console.error("Computed:", computed);
        return json({ ok: false, error: "Invalid signature" }, 401);
      }
    }

    // --- Parse JSON ---
    let webhookData: any;
    try {
      webhookData = JSON.parse(bodyText);
    } catch (e) {
      console.error("Invalid JSON:", e);
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const eventName = webhookData?.event_name;
    const eventId = webhookData?.event_id;

    const signatureRequest = webhookData?.data?.signature_request;
    const signatureRequestId = signatureRequest?.id;
    const externalId = signatureRequest?.external_id;
    const signatureRequestStatus = signatureRequest?.status;

    console.log("event_name:", eventName);
    console.log("event_id:", eventId);
    console.log("signature_request.id:", signatureRequestId);
    console.log("signature_request.status:", signatureRequestStatus);
    console.log("signature_request.external_id:", externalId);

    // On accepte aussi signer.done, MAIS uniquement si signature_request.status est "done"
    const handledEvents = new Set([
      "signature_request.done",
      "signature_request.completed",
      "signature_request.finished",
      "signer.done",
    ]);

    if (!handledEvents.has(String(eventName))) {
      return json({ ok: true, ignored: eventName }, 200);
    }

    if (
      String(eventName) === "signer.done" &&
      String(signatureRequestStatus) !== "done"
    ) {
      // évite de marquer signé si ce n'est pas la fin
      return json({ ok: true, ignored: "signer.done_not_final" }, 200);
    }

    if (!signatureRequestId && !externalId) {
      console.error(
        "Missing identifiers (signature_request.id and external_id)"
      );
      return json({ ok: false, error: "Missing identifiers" }, 500);
    }

    const nowIso = new Date().toISOString();

    // --- Update contract (comme avant) ---
    const filter = signatureRequestId
      ? `yousign_signature_request_id=eq.${encodeURIComponent(
          String(signatureRequestId)
        )}`
      : `id=eq.${encodeURIComponent(String(externalId))}`;

    // NOTE: on ajoute select=... pour être sûr d'avoir les champs utiles dans la réponse
    const contractPatch = await restPatch<any[]>(
      SUPABASE_URL,
      `contrat?${filter}&select=id,profil_id,modele_id,date_debut,date_fin,type,statut`,
      SERVICE_KEY,
      {
        statut: "signe",
        date_signature: nowIso,
        yousign_signed_at: nowIso,
      },
      "return=representation"
    );

    if (!contractPatch.ok) {
      console.error(
        "Contract update failed:",
        contractPatch.status,
        contractPatch.data ?? contractPatch.raw
      );
      return json(
        {
          ok: false,
          error: "Contract update failed",
          status: contractPatch.status,
          details: contractPatch.data ?? contractPatch.raw,
        },
        500
      );
    }

    const updatedContracts = Array.isArray(contractPatch.data)
      ? contractPatch.data
      : [];
    if (updatedContracts.length === 0) {
      console.error("0 contract updated. Filter:", filter);
      return json({ ok: false, error: "No contract updated", filter }, 500);
    }
    if (updatedContracts.length > 1) {
      console.warn(
        "WARNING: multiple contracts updated for filter:",
        filter,
        "count:",
        updatedContracts.length
      );
    }

    const c = updatedContracts[0];
    const profilId = c?.profil_id as string | null;
    const modeleId = c?.modele_id as string | null;

    // --- (AJOUT) Remplir contrat.type si NULL ---
    let computedType: string | null = c?.type ?? null;

    if (!computedType) {
      // 1) préférer le type_contrat du modèle
      if (modeleId) {
        const modeleRes = await restGet<any[]>(
          SUPABASE_URL,
          `modeles_contrats?id=eq.${encodeURIComponent(
            String(modeleId)
          )}&select=type_contrat`,
          SERVICE_KEY
        );
        if (
          modeleRes.ok &&
          Array.isArray(modeleRes.data) &&
          modeleRes.data.length > 0
        ) {
          computedType = modeleRes.data[0]?.type_contrat ?? null;
        }
      }

      // 2) fallback si pas de modèle
      if (!computedType) {
        // Si date_fin est NULL => CDI, sinon CDD (fallback)
        computedType = c?.date_fin ? "CDD" : "CDI";
      }

      // Patch type uniquement si on a trouvé quelque chose
      if (computedType) {
        const typePatch = await restPatch<any[]>(
          SUPABASE_URL,
          `contrat?id=eq.${encodeURIComponent(String(c.id))}&select=id,type`,
          SERVICE_KEY,
          { type: computedType },
          "return=representation"
        );

        if (!typePatch.ok) {
          console.error(
            "Contract type patch failed:",
            typePatch.status,
            typePatch.data ?? typePatch.raw
          );
          // on ne bloque pas tout, mais on log
        } else {
          console.log("Contract type filled:", computedType);
        }
      }
    }

    // --- (AJOUT) Update profil: statut + date_entree + matricule_tca si manquants ---
    if (profilId) {
      // lire le profil actuel
      const profilRes = await restGet<any[]>(
        SUPABASE_URL,
        `profil?id=eq.${encodeURIComponent(
          String(profilId)
        )}&select=id,matricule_tca,date_entree,statut`,
        SERVICE_KEY
      );

      let currentProfil: any = null;
      if (
        profilRes.ok &&
        Array.isArray(profilRes.data) &&
        profilRes.data.length > 0
      ) {
        currentProfil = profilRes.data[0];
      }

      const profilPatchBody: any = { statut: "contrat_signe" };

      // date_entree = contrat.date_debut si profil.date_entree est NULL
      if (!currentProfil?.date_entree && c?.date_debut) {
        profilPatchBody.date_entree = c.date_debut;
      }

      // matricule_tca si NULL
      if (!currentProfil?.matricule_tca) {
        // Nouveau système : matricule numérique auto-incrémenté à partir de 1613
        const BASE = 1613;

        const matsRes = await restGet<any[]>(
          SUPABASE_URL,
          `profil?select=matricule_tca&matricule_tca=not.is.null&limit=200`,
          SERVICE_KEY
        );

        let maxN = BASE - 1; // si aucun matricule trouvé >= 1613 => next = 1613

        if (matsRes.ok && Array.isArray(matsRes.data)) {
          for (const row of matsRes.data) {
            const m = String(row?.matricule_tca ?? "").trim();

            // On ne garde que les matricules 100% numériques (ex: 1613, 1614, 1700...)
            if (!/^\d+$/.test(m)) continue;

            const n = parseInt(m, 10);
            if (Number.isNaN(n)) continue;

            // On ignore tout ce qui est < 1613 (donc 1612 ne compte pas)
            if (n >= BASE && n <= 99999) {
              maxN = Math.max(maxN, n);
            }
          }
        }

        const newMatricule = String(maxN + 1); // 1613, puis 1614, puis 1615...
        profilPatchBody.matricule_tca = newMatricule;
      }

      const profilPatch = await restPatch<any[]>(
        SUPABASE_URL,
        `profil?id=eq.${encodeURIComponent(String(profilId))}`,
        SERVICE_KEY,
        profilPatchBody,
        "return=minimal"
      );

      if (!profilPatch.ok) {
        console.error(
          "Profil update failed:",
          profilPatch.status,
          profilPatch.data ?? profilPatch.raw
        );
        return json(
          {
            ok: false,
            error: "Profil update failed",
            details: profilPatch.data ?? profilPatch.raw,
          },
          500
        );
      }
    }

    return json(
      {
        ok: true,
        message: "Contract updated + fields synced",
        eventName,
        signatureRequestId,
        filter,
      },
      200
    );
  } catch (error: any) {
    console.error("Fatal webhook error:", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
