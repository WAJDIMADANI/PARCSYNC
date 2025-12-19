import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Docxtemplater from "npm:docxtemplater@3.50.0";
import PizZip from "npm:pizzip@3.1.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignatureRequest {
  contractId: string;
}

// ✅ Fonction pour formater une date en français (format DD-MM-YYYY)
function formatDateFR(dateStr: string | undefined): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', dateStr, error);
    return dateStr;
  }
}

// ✅ Fonction pour préparer et formater les variables avant génération
function prepareVariables(variables: Record<string, any>): Record<string, any> {
  const prepared: Record<string, any> = {};

  Object.entries(variables).forEach(([key, value]) => {
    let processedValue = value;

    // ✅ Formater TOUTES les dates au format ISO (YYYY-MM-DD) en français (DD-MM-YYYY)
    // On détecte automatiquement si la valeur est une date ISO, peu importe le nom de la clé
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      processedValue = formatDateFR(value);
      console.log(`✅ Date formatée: ${key}: ${value} → ${processedValue}`);
    }

    // ✅ Nettoyer les valeurs vides ou undefined
    if (processedValue === undefined || processedValue === null) {
      processedValue = '';
    }

    prepared[key] = processedValue;
  });

  // ✅ Calculer la date de fin de période d'essai si elle n'existe pas
  if (!variables.trial_end_date && variables.contract_start) {
    const contractStart = new Date(variables.contract_start);
    const trialEnd = new Date(contractStart);
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 jours de période d'essai
    prepared.trial_end_date = trialEnd.toISOString().split('T')[0];
  }

  // ✅ Gérer la phrase de période d'essai conditionnellement
  if (prepared.trial_end_date && typeof prepared.trial_end_date === 'string' && prepared.trial_end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const formattedDate = formatDateFR(prepared.trial_end_date);
    prepared.trial_period_text = `Le Salarié sera soumis à une période d'essai qui prendra fin le : ${formattedDate}`;
  } else {
    prepared.trial_period_text = '';
  }

  return prepared;
}

// ✅ Fonction pour générer l'HTML du contrat avec les variables
async function generateContractHTML(contract: any): Promise<string> {
  let html = contract.modele.contenu_html;
  const variables = typeof contract.variables === 'string'
    ? JSON.parse(contract.variables)
    : contract.variables;

  // ✅ Préparer et formater les variables
  const preparedVars = prepareVariables(variables);

  // Remplacer les variables {{variable}} par les vraies valeurs
  Object.entries(preparedVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value || ''));
  });

  // ✅ Nettoyer les accolades restantes (pour les variables non définies)
  html = html.replace(/{{[^}]+}}/g, '');

  return html;
}

// ✅ Fonction pour générer le PDF via PDFShift (pour les modèles HTML)
async function generatePDF(htmlContent: string): Promise<ArrayBuffer> {
  const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");

  if (!PDFSHIFT_API_KEY) {
    throw new Error("PDFSHIFT_API_KEY not configured");
  }

  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PDFSHIFT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: htmlContent,
      sandbox: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDFShift API error: ${errorText}`);
  }

  return await response.arrayBuffer();
}

// ✅ NEW: Fonction pour convertir Word avec variables → PDF
async function convertWordToPDF(
  wordFileUrl: string,
  variables: Record<string, any>
): Promise<ArrayBuffer> {
  const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");

  if (!CLOUDCONVERT_API_KEY) {
    throw new Error("CLOUDCONVERT_API_KEY not configured");
  }

  console.log("Starting Word → PDF conversion with variable replacement...");

  // Étape 1: Télécharger le fichier Word depuis Supabase
  console.log("Step 1: Downloading Word template from:", wordFileUrl);
  const wordResponse = await fetch(wordFileUrl);
  if (!wordResponse.ok) {
    throw new Error(`Failed to download Word template: ${wordResponse.statusText}`);
  }

  const wordArrayBuffer = await wordResponse.arrayBuffer();
  console.log("Word template downloaded, size:", wordArrayBuffer.byteLength, "bytes");

  // Étape 2: Remplacer les variables avec docxtemplater
  console.log("Step 2: Replacing variables in Word template...");
  const preparedVariables = prepareVariables(variables);
  console.log("Variables to replace:", Object.keys(preparedVariables));

  try {
    const zip = new PizZip(wordArrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "", // Remplacer les valeurs null par une chaîne vide
    });

    doc.render(preparedVariables);

    const outputBuffer = doc.getZip().generate({
      type: "arraybuffer",
      compression: "DEFLATE",
    });

    console.log("Variables replaced successfully, new file size:", outputBuffer.byteLength, "bytes");

    // Étape 3: Uploader le fichier Word modifié vers CloudConvert et le convertir en PDF
    console.log("Step 3: Converting modified Word to PDF via CloudConvert...");

    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tasks: {
          "upload-docx": {
            operation: "import/upload"
          },
          "convert-to-pdf": {
            operation: "convert",
            input: "upload-docx",
            output_format: "pdf"
          },
          "export-pdf": {
            operation: "export/url",
            input: "convert-to-pdf"
          }
        }
      })
    });

    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      throw new Error(`CloudConvert job creation error: ${errorText}`);
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;
    console.log("CloudConvert job created:", jobId);

    // Étape 4: Uploader le fichier Word modifié
    const uploadTask = jobData.data.tasks.find((t: any) => t.name === "upload-docx");
    if (!uploadTask || !uploadTask.result?.form?.url) {
      throw new Error("Upload task URL not found in CloudConvert response");
    }

    const uploadUrl = uploadTask.result.form.url;
    const uploadParams = uploadTask.result.form.parameters;

    console.log("Step 4: Uploading modified Word file to CloudConvert...");

    const formData = new FormData();
    Object.entries(uploadParams).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("file", new Blob([outputBuffer]), "contract.docx");

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload Word file to CloudConvert: ${uploadResponse.statusText}`);
    }

    console.log("Word file uploaded successfully");

    // Étape 5: Attendre la fin de la conversion (polling)
    console.log("Step 5: Waiting for PDF conversion...");
    let jobStatus = jobData.data.status;
    let attempts = 0;
    const maxAttempts = 30;
    let finalStatusData = jobData;

    while (jobStatus !== "finished" && jobStatus !== "error" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`
        }
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to check CloudConvert job status");
      }

      finalStatusData = await statusResponse.json();
      jobStatus = finalStatusData.data.status;
      attempts++;

      console.log(`CloudConvert job status: ${jobStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (jobStatus === "error") {
      console.error("CloudConvert job detailed errors:", JSON.stringify(finalStatusData, null, 2));

      const errorTasks = finalStatusData.data.tasks?.filter((t: any) => t.status === "error") || [];
      if (errorTasks.length > 0) {
        const errorMessages = errorTasks.map((t: any) =>
          `Task "${t.name}": ${t.message || "Unknown error"}`
        ).join(", ");
        throw new Error(`CloudConvert job failed: ${errorMessages}`);
      }

      throw new Error("CloudConvert job failed with unknown error");
    }

    if (jobStatus !== "finished") {
      throw new Error(`CloudConvert job timeout after ${attempts} attempts`);
    }

    // Étape 6: Récupérer l'URL du PDF depuis les données de statut finales
    const exportTask = finalStatusData.data.tasks?.find((t: any) => t.name === "export-pdf");
    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      console.error("Export task not found or has no URL. All tasks:", JSON.stringify(finalStatusData.data.tasks, null, 2));
      throw new Error("CloudConvert export task not found or has no download URL");
    }

    const pdfUrl = exportTask.result.files[0].url;
    console.log("PDF generated at:", pdfUrl);

    // Étape 7: Télécharger le PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download converted PDF");
    }

    console.log("PDF download successful");
    return await pdfResponse.arrayBuffer();

  } catch (docxError: any) {
    console.error("Error during Word template processing:", docxError);
    throw new Error(`Word template processing failed: ${docxError.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { contractId }: SignatureRequest = body;

    console.log("Received request:", { contractId });

    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!YOUSIGN_API_KEY) {
      throw new Error("YOUSIGN_API_KEY not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Récupérer le contrat avec le modèle
    console.log("Fetching contract with ID:", contractId);
    const contractResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,modele:modele_id(*),profil:profil_id(*)`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );

    if (!contractResponse.ok) {
      throw new Error(`Failed to fetch contract: ${contractResponse.statusText}`);
    }

    const contracts = await contractResponse.json();
    const contract = contracts[0];

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Récupérer l'email et le nom depuis le profil
    const employeeEmail = contract.profil?.email || contract.variables?.email_salarie || '';
    const employeeName = contract.profil
      ? `${contract.profil.prenom} ${contract.profil.nom}`
      : contract.variables?.nom_salarie || 'Salarié';

    console.log("Employee data:", { employeeEmail, employeeName });

    if (!employeeEmail || !employeeEmail.includes('@')) {
      throw new Error("Email employé invalide ou manquant dans le profil");
    }

    // ✅ DÉCISION : PDF ou Word ?
    let pdfArrayBuffer: ArrayBuffer;
    const isWordFile = contract.modele?.fichier_nom?.toLowerCase().endsWith('.docx');

    if (isWordFile && contract.modele?.fichier_url) {
      // ✅ OPTION 1 : Fichier Word → CloudConvert
      console.log("Detected Word file, using CloudConvert...");

      const variables = typeof contract.variables === 'string'
        ? JSON.parse(contract.variables)
        : contract.variables || {};

      console.log("📊 Variables from contract:", JSON.stringify(variables, null, 2).substring(0, 500));

      // ✅ Enrichir les variables avec les données du profil
      const enrichedVariables = {
        ...variables,
        // Données personnelles du profil
        nom_salarie: employeeName,
        first_name: contract.profil?.prenom || '',
        last_name: contract.profil?.nom || '',
        birthday: contract.profil?.date_naissance || variables.birthday || '',
        birthplace: contract.profil?.lieu_naissance || variables.birthplace || '',
        nationality: contract.profil?.nationalite || variables.nationality || '',
        address_1: contract.profil?.adresse || variables.address_1 || '',
        city: contract.profil?.ville || variables.city || '',
        zip: contract.profil?.code_postal || variables.zip || '',
        id_number: contract.profil?.numero_piece_identite || variables.id_number || '',
        // Données du contrat
        contract_start: contract.date_debut || variables.contract_start || variables.date_debut || '',
        contract_end: contract.date_fin || variables.contract_end || variables.date_fin || '',
        // Autres variables
        email_salarie: employeeEmail,
        signature: '', // Zone de signature (vide)
      };

      console.log("✅ Enriched variables:", JSON.stringify(enrichedVariables, null, 2).substring(0, 800));

      pdfArrayBuffer = await convertWordToPDF(contract.modele.fichier_url, enrichedVariables);
      console.log("Word → PDF conversion completed");

    } else if (contract.modele?.contenu_html) {
      // ✅ OPTION 2 : HTML → PDF (méthode classique)
      console.log("Using HTML → PDF conversion...");
      const htmlContent = await generateContractHTML(contract);
      pdfArrayBuffer = await generatePDF(htmlContent);
      console.log("HTML → PDF conversion completed");

    } else {
      throw new Error("Le modèle de contrat n'a ni fichier Word ni contenu HTML");
    }

    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    console.log("PDF ready for Yousign, size:", pdfBlob.size, "bytes");

    // Calculer la date d'expiration (48h)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 48);
    const formattedExpiration = expirationDate.toISOString().split('T')[0];
    console.log("Setting expiration to 48h:", formattedExpiration);

    // ✅ ÉTAPE 1 : Créer une signature request
    console.log("Step 1: Creating signature request...");
    const signatureRequestResponse = await fetch("https://api-sandbox.yousign.app/v3/signature_requests", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrat de travail - ${employeeName}`,
        delivery_mode: "email",
        timezone: "Europe/Paris",
        expiration_date: formattedExpiration,
        external_id: contractId,
      }),
    });

    if (!signatureRequestResponse.ok) {
      const errorText = await signatureRequestResponse.text();
      console.error("Yousign signature request error:", errorText);
      throw new Error(`Yousign signature request error: ${errorText}`);
    }

    const signatureRequestData = await signatureRequestResponse.json();
    const signatureRequestId = signatureRequestData.id;
    console.log("Signature request created with ID:", signatureRequestId);

    // ✅ ÉTAPE 2 : Uploader le document vers la signature request
    console.log("Step 2: Uploading document to signature request...");
    const formData = new FormData();
    formData.append("nature", "signable_document");
    formData.append("parse_anchors", "true");
    formData.append("file", pdfBlob, `contrat_${employeeName.replace(/\s+/g, '_')}.pdf`);

    const uploadResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Yousign upload error:", errorText);
      throw new Error(`Yousign upload error: ${errorText}`);
    }

    const documentData = await uploadResponse.json();
    const documentId = documentData.id;
    console.log("Document uploaded with ID:", documentId);

    // Étape 4: Ajouter le signataire
    console.log("Step 4: Adding signer...");
    const nameParts = employeeName.trim().split(' ');
    const firstName = nameParts[0] || employeeName;
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const signerResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/signers`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          info: {
            first_name: firstName,
            last_name: lastName,
            email: employeeEmail,
            locale: "fr",
          },
          signature_level: "electronic_signature",
          signature_authentication_mode: "no_otp",
          fields: [
            {
              document_id: documentId,
              type: "signature",
              page: 1,
              x: 77,
              y: 581,
            }
          ]
        }),
      }
    );

    if (!signerResponse.ok) {
      const errorText = await signerResponse.text();
      console.error("Yousign signer error:", errorText);
      throw new Error(`Yousign signer error: ${errorText}`);
    }

    const signerData = await signerResponse.json();
    console.log("Signer added with ID:", signerData.id);

    // Étape 5: Activer la signature request
    console.log("Step 5: Activating signature request...");
    const activateResponse = await fetch(
      `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/activate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${YOUSIGN_API_KEY}`,
        },
      }
    );

    if (!activateResponse.ok) {
      const errorText = await activateResponse.text();
      console.error("Yousign activate error:", errorText);
      throw new Error(`Yousign activate error: ${errorText}`);
    }

    console.log("Signature request activated successfully");

    // Mettre à jour le contrat dans Supabase
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          yousign_signature_request_id: signatureRequestId,
          yousign_signer_id: signerData.id,
          statut: 'en_attente_signature'
        })
      }
    );

    if (!updateResponse.ok) {
      console.error("Supabase update error:", await updateResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        signatureRequestId: signatureRequestId,
        signerId: signerData.id,
        message: "Demande de signature créée et activée avec succès"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in create-yousign-signature:", error);
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
