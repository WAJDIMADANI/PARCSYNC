import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConvertRequest {
  sourceBucket: string;
  sourcePath: string;
  destBucket: string;
  destPath: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");

    if (!cloudConvertApiKey) {
      throw new Error("CLOUDCONVERT_API_KEY non configurée");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Parse and validate body
    const body: ConvertRequest = await req.json();
    const { sourceBucket, sourcePath, destBucket, destPath } = body;

    if (!sourceBucket || !sourcePath || !destBucket || !destPath) {
      return new Response(
        JSON.stringify({
          error: "Paramètres requis: sourceBucket, sourcePath, destBucket, destPath",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[convert-docx-to-pdf] source=${sourceBucket}/${sourcePath} dest=${destBucket}/${destPath}`);

    // 2) Download DOCX from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloadError || !fileData) {
      throw new Error(
        `Erreur download storage (${sourceBucket}/${sourcePath}): ${downloadError?.message}`
      );
    }

    const docxArrayBuffer = await fileData.arrayBuffer();
    console.log(`[convert-docx-to-pdf] DOCX downloaded, size=${docxArrayBuffer.byteLength}`);

    // 3) Create CloudConvert job
    const createJobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cloudConvertApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-docx": { operation: "import/upload" },
          "convert-to-pdf": {
            operation: "convert",
            input: "import-docx",
            output_format: "pdf",
          },
          "export-pdf": { operation: "export/url", input: "convert-to-pdf" },
        },
      }),
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      throw new Error(`CloudConvert job creation failed: ${errorText}`);
    }

    const jobData = await createJobResponse.json();
    const importTask = jobData.data.tasks.find((t: any) => t.name === "import-docx");
    if (!importTask?.result?.form) {
      throw new Error("Pas de formulaire d'upload CloudConvert");
    }

    // 4) Upload DOCX to CloudConvert
    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters;

    const formData = new FormData();
    Object.keys(uploadParams).forEach((k) => formData.append(k, uploadParams[k]));
    formData.append(
      "file",
      new Blob([docxArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "document.docx"
    );

    const uploadResponse = await fetch(uploadUrl, { method: "POST", body: formData });
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload DOCX vers CloudConvert échoué: ${errorText}`);
    }

    console.log(`[convert-docx-to-pdf] Uploaded to CloudConvert, polling...`);

    // 5) Poll job status
    let jobStatus = jobData.data.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (jobStatus !== "finished" && jobStatus !== "error" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusResponse = await fetch(
        `https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`,
        {
          headers: { "Authorization": `Bearer ${cloudConvertApiKey}` },
        }
      );

      if (!statusResponse.ok) {
        throw new Error("Impossible de vérifier le statut de conversion");
      }

      const statusData = await statusResponse.json();
      jobStatus = statusData.data.status;
      console.log(`[convert-docx-to-pdf] CloudConvert status=${jobStatus} attempt=${attempts}`);
    }

    if (jobStatus !== "finished") {
      throw new Error(`Conversion échouée/expirée (statut: ${jobStatus})`);
    }

    // 6) Get PDF download URL
    const finalJobResponse = await fetch(
      `https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`,
      {
        headers: { "Authorization": `Bearer ${cloudConvertApiKey}` },
      }
    );

    const finalJobData = await finalJobResponse.json();
    const exportTask = finalJobData.data.tasks.find((t: any) => t.name === "export-pdf");
    const pdfDownloadUrl = exportTask?.result?.files?.[0]?.url;

    if (!pdfDownloadUrl) {
      throw new Error("Pas d'URL PDF dans la réponse CloudConvert");
    }

    // 7) Download PDF from CloudConvert
    const pdfResponse = await fetch(pdfDownloadUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Impossible de télécharger le PDF converti: ${pdfResponse.status}`);
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    console.log(`[convert-docx-to-pdf] PDF downloaded, size=${pdfArrayBuffer.byteLength}`);

    // 8) Upload PDF to destination bucket
    const { error: uploadError } = await supabase.storage
      .from(destBucket)
      .upload(destPath, new Uint8Array(pdfArrayBuffer), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erreur upload PDF: ${uploadError.message}`);
    }

    console.log(`[convert-docx-to-pdf] PDF uploaded to ${destBucket}/${destPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfPath: destPath,
        pdfBucket: destBucket,
        message: "PDF généré avec succès",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[convert-docx-to-pdf] Erreur:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});