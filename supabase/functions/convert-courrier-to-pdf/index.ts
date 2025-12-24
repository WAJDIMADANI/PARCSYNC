import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConvertRequest {
  courrierId: string;
}

function extractStorageInfo(fileUrl: string, supabaseUrl: string) {
  try {
    const u = new URL(fileUrl);
    const base = new URL(supabaseUrl);

    // On ne traite que les URLs Supabase Storage de TON projet
    if (u.host !== base.host) return null;

    // /storage/v1/object/public/<bucket>/<path>
    // /storage/v1/object/<bucket>/<path>
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
    if (!m) return null;

    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");

    if (!cloudConvertApiKey) throw new Error("CLOUDCONVERT_API_KEY non configurée");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { courrierId }: ConvertRequest = await req.json();
    if (!courrierId) {
      return new Response(JSON.stringify({ error: "courrierId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: courrier, error: courrierError } = await supabase
      .from("courrier_genere")
      .select("id, fichier_pdf_url, fichier_word_genere_url, modele_nom, profil_id")
      .eq("id", courrierId)
      .maybeSingle();

    if (courrierError || !courrier) {
      return new Response(JSON.stringify({ error: "Courrier introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Trouver le DOCX
    let docxUrl = courrier.fichier_word_genere_url;
    let shouldMoveToWordUrl = false;

    if (!docxUrl && courrier.fichier_pdf_url) {
      const lower = courrier.fichier_pdf_url.toLowerCase();
      if (lower.includes(".docx")) {
        docxUrl = courrier.fichier_pdf_url;
        shouldMoveToWordUrl = true; // migration légère
      }
    }

    if (!docxUrl) {
      return new Response(JSON.stringify({ error: "Aucun fichier DOCX trouvé pour ce courrier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[convert] Courrier=${courrierId} DOCX=${docxUrl}`);

    // 2) Télécharger le DOCX (ROBUSTE)
    let docxArrayBuffer: ArrayBuffer;

    const storageInfo = extractStorageInfo(docxUrl, supabaseUrl);

    if (storageInfo) {
      // URL Supabase Storage -> download via service role (fonctionne même si bucket privé)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(storageInfo.bucket)
        .download(storageInfo.path);

      if (downloadError || !fileData) {
        throw new Error(`Erreur download storage (${storageInfo.bucket}/${storageInfo.path}): ${downloadError?.message}`);
      }

      docxArrayBuffer = await fileData.arrayBuffer();
    } else if (docxUrl.startsWith("http://") || docxUrl.startsWith("https://")) {
      // URL externe (rare)
      const resp = await fetch(docxUrl);
      if (!resp.ok) throw new Error(`Impossible de télécharger le DOCX (externe): ${resp.status}`);
      docxArrayBuffer = await resp.arrayBuffer();
    } else {
      // Si un jour tu stockes juste le path "1766...docx" ou "courriers/1766...docx"
      const path = docxUrl.replace(/^\/?courriers\//, "");
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("courriers")
        .download(path);

      if (downloadError || !fileData) {
        throw new Error(`Erreur téléchargement DOCX depuis storage: ${downloadError?.message}`);
      }

      docxArrayBuffer = await fileData.arrayBuffer();
    }

    console.log(`[convert] DOCX ok size=${docxArrayBuffer.byteLength}`);

    // 3) Créer job CloudConvert
    const createJobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cloudConvertApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-docx": { operation: "import/upload" },
          "convert-to-pdf": { operation: "convert", input: "import-docx", output_format: "pdf" },
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
    if (!importTask?.result?.form) throw new Error("Pas de formulaire d'upload CloudConvert");

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

    // 4) Poll job
    let jobStatus = jobData.data.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (jobStatus !== "finished" && jobStatus !== "error" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: { "Authorization": `Bearer ${cloudConvertApiKey}` },
      });

      if (!statusResponse.ok) throw new Error("Impossible de vérifier le statut de conversion");

      const statusData = await statusResponse.json();
      jobStatus = statusData.data.status;
      console.log(`[convert] CloudConvert status=${jobStatus} attempt=${attempts}`);
    }

    if (jobStatus !== "finished") throw new Error(`Conversion échouée/expirée (statut: ${jobStatus})`);

    const finalJobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
      headers: { "Authorization": `Bearer ${cloudConvertApiKey}` },
    });

    const finalJobData = await finalJobResponse.json();
    const exportTask = finalJobData.data.tasks.find((t: any) => t.name === "export-pdf");
    const pdfDownloadUrl = exportTask?.result?.files?.[0]?.url;
    if (!pdfDownloadUrl) throw new Error("Pas d'URL PDF dans la réponse CloudConvert");

    const pdfResponse = await fetch(pdfDownloadUrl);
    if (!pdfResponse.ok) throw new Error(`Impossible de télécharger le PDF converti: ${pdfResponse.status}`);

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    console.log(`[convert] PDF ok size=${pdfArrayBuffer.byteLength}`);

    // 5) Upload PDF dans bucket PUBLIC "courriers-generes"
    const pdfBucket = "courriers-generes";
    const pdfFileName = `pdf/${courrierId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(pdfBucket)
      .upload(pdfFileName, new Uint8Array(pdfArrayBuffer), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Erreur upload PDF: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from(pdfBucket).getPublicUrl(pdfFileName);
    const pdfUrl = publicUrlData.publicUrl;

    // 6) Update DB
    const updateData: any = { fichier_pdf_url: pdfUrl };
    if (shouldMoveToWordUrl) updateData.fichier_word_genere_url = docxUrl;

    const { error: updateError } = await supabase
      .from("courrier_genere")
      .update(updateData)
      .eq("id", courrierId);

    if (updateError) throw new Error(`Erreur mise à jour courrier_genere: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, pdfUrl, message: "PDF généré avec succès" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur convert-courrier-to-pdf:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
