import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { contractId } = await req.json();
    if (!contractId) {
      return new Response("Missing contractId", { status: 400, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const YOUSIGN_BASE_URL = Deno.env.get("YOUSIGN_BASE_URL") ?? "https://api.yousign.app";

    if (!SUPABASE_URL || !SERVICE_ROLE || !YOUSIGN_API_KEY) {
      throw new Error(
        "Missing env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / YOUSIGN_API_KEY)"
      );
    }

    // 1) Lire le contrat (service role)
    const contractRes = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=id,yousign_signature_request_id,yousign_signed_at`,
      {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
      }
    );

    if (!contractRes.ok) {
      const t = await contractRes.text();
      throw new Error(`Failed to fetch contract: ${t}`);
    }

    const rows = await contractRes.json();
    const contract = rows?.[0];

    if (!contract?.yousign_signature_request_id) {
      throw new Error("No yousign_signature_request_id on this contract");
    }
    if (!contract?.yousign_signed_at) {
      throw new Error("Contract not signed on Yousign yet");
    }

    const signatureRequestId = contract.yousign_signature_request_id as string;

    // 2) Télécharger les documents signés (PDF si 1 doc, ZIP si plusieurs)
    const dlRes = await fetch(
      `${YOUSIGN_BASE_URL}/v3/signature_requests/${signatureRequestId}/documents/download`,
      { headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` } }
    );

    if (!dlRes.ok) {
      const t = await dlRes.text();
      throw new Error(`Failed to download signed document(s): ${t}`);
    }

    const contentType = dlRes.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await dlRes.arrayBuffer());

    // Extension selon le type
    const isZip = contentType.toLowerCase().includes("zip");
    const isPdf = contentType.toLowerCase().includes("pdf");
    const ext = isZip ? "zip" : isPdf ? "pdf" : "bin";

    // 3) Retourner le fichier au navigateur + headers debug
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        // Permettre au navigateur de lire ces headers (debug)
        "Access-Control-Expose-Headers": "X-Contract-Id, X-Yousign-Request-Id",
        "X-Contract-Id": contractId,
        "X-Yousign-Request-Id": signatureRequestId,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="contrat_${contractId}_signed.${ext}"`,
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
