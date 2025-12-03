import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { contractId } = await req.json();
    if (!contractId) {
      return new Response(JSON.stringify({
        error: "contractId required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("Downloading signed PDF for contract:", contractId);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    // 1) Récupérer le contrat
    const contractResponse = await fetch(`${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=yousign_signature_request_id,profil_id`, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY
      }
    });
    if (!contractResponse.ok) {
      return new Response(JSON.stringify({
        error: "Contract not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const contracts = await contractResponse.json();
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({
        error: "Contract not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const contract = contracts[0];
    const signatureRequestId = contract.yousign_signature_request_id;
    const profilId = contract.profil_id;
    if (!signatureRequestId) {
      return new Response(JSON.stringify({
        error: "No signature request ID"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("Signature request ID:", signatureRequestId);
    // 2) Récupérer les documents depuis Yousign
    const srResponse = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}`, {
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!srResponse.ok) {
      const errText = await srResponse.text();
      console.error("Yousign API error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to fetch signature request from Yousign"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const srData = await srResponse.json();
    const documents = srData.documents || [];
    if (documents.length === 0) {
      return new Response(JSON.stringify({
        error: "No documents found in signature request"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const documentId = documents[0].id;
    console.log("Document ID:", documentId);
    // 3) Télécharger le PDF signé
    const downloadUrl = `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents/${documentId}/download`;
    console.log("Downloading from:", downloadUrl);
    const pdfResponse = await fetch(downloadUrl, {
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`
      }
    });
    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      console.error("PDF download error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to download PDF from Yousign"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const pdfBlob = await pdfResponse.blob();
    console.log("PDF downloaded, size:", pdfBlob.size);
    // 4) Upload dans Supabase Storage
    const fileName = `documents/contrats/${profilId}/${contractId}-signed.pdf`;
    console.log("Uploading to storage:", fileName);
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${fileName}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/pdf"
      },
      body: pdfBlob
    });
    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error("Storage upload error:", errText);
      return new Response(JSON.stringify({
        error: "Failed to upload PDF to storage"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("PDF uploaded successfully");
    // 5) Mettre à jour le contrat avec le chemin du fichier
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        fichier_signe_url: fileName,
        signed_storage_path: fileName
      })
    });
    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error("Database update error:", errText);
    // Continue anyway, PDF is already uploaded
    }
    console.log("✅ PDF downloaded and stored successfully");
    // 6) Retourner l'URL de téléchargement
    const downloadLink = `${SUPABASE_URL}/storage/v1/object/public/documents/${fileName}`;
    return new Response(JSON.stringify({
      success: true,
      message: "PDF downloaded successfully",
      url: downloadLink,
      fileName: `contrat-${contractId}-signed.pdf`
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
