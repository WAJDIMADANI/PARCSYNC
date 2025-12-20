import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadRequest {
  contractId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { contractId }: DownloadRequest = await req.json();

    console.log("Downloading signed contract for:", contractId);

    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!YOUSIGN_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuration missing");
    }

    // Récupérer les informations du contrat
    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,modele:modele_id(nom)`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!contractResponse.ok) {
      throw new Error("Contract not found");
    }

    const contracts = await contractResponse.json();
    const contract = contracts[0];

    if (!contract || !contract.yousign_signature_request_id) {
      throw new Error("No Yousign signature request ID found");
    }

    const signatureRequestId = contract.yousign_signature_request_id;

    // Récupérer les détails de la signature request pour obtenir le document ID
    console.log("Fetching signature request details...");
    const signatureRequestResponse = await fetch(
      `https://api.yousign.app/v3/signature_requests/${signatureRequestId}`,
      {
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        }
      }
    );

    if (!signatureRequestResponse.ok) {
      throw new Error("Failed to fetch signature request details");
    }

    const signatureRequestData = await signatureRequestResponse.json();
    const documentId = signatureRequestData.documents?.[0]?.id;

    if (!documentId) {
      throw new Error("No document found in signature request");
    }

    console.log("Document ID:", documentId);

    // Télécharger le document signé
    console.log("Downloading signed document...");
    const downloadUrl = `https://api.yousign.app/v3/signature_requests/${signatureRequestId}/documents/${documentId}/download`;

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
      },
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error("Download error:", errorText);
      throw new Error(`Failed to download signed document: ${downloadResponse.statusText}`);
    }

    const pdfBlob = await downloadResponse.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();
    console.log("PDF downloaded, size:", pdfBuffer.byteLength, "bytes");

    // Uploader vers Supabase Storage using convention: documents/contrats/{profil_id}/{contrat_id}-signed.pdf
    const profilId = contract.profil_id;
    const fileName = `documents/contrats/${profilId}/${contractId}-signed.pdf`;
    console.log("Uploading to storage:", fileName);

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/documents/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/pdf',
        },
        body: pdfBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload error:", errorText);
      throw new Error(`Failed to upload to storage: ${errorText}`);
    }

    console.log("Uploaded to storage path:", fileName);

    // Mettre à jour le contrat avec le chemin storage (pas l'URL complète)
    await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          fichier_signe_url: fileName,
        })
      }
    );

    // Créer une entrée dans la table document
    const modeleName = contract.modele?.nom || 'Contrat de travail';

    await fetch(
      `${SUPABASE_URL}/rest/v1/document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          proprietaire_type: 'profil',
          proprietaire_id: contract.profil_id,
          type: 'contrat',
          fichier_url: fileName,
          statut: 'valide',
        })
      }
    );

    console.log("Document entry created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        fileUrl: fileName,
        message: "Document signé téléchargé et ajouté aux documents"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in download-signed-contract:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
