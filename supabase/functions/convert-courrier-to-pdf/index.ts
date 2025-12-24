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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cloudConvertApiKey = Deno.env.get("CLOUDCONVERT_API_KEY");

    if (!cloudConvertApiKey) {
      throw new Error("CLOUDCONVERT_API_KEY non configurée");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { courrierId }: ConvertRequest = await req.json();

    if (!courrierId) {
      return new Response(
        JSON.stringify({ error: "courrierId requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: courrier, error: courrierError } = await supabase
      .from("courrier_genere")
      .select("id, fichier_pdf_url, fichier_word_genere_url, modele_nom, profil_id")
      .eq("id", courrierId)
      .maybeSingle();

    if (courrierError || !courrier) {
      return new Response(
        JSON.stringify({ error: "Courrier introuvable" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let docxUrl = courrier.fichier_word_genere_url;
    let shouldMoveToWordUrl = false;

    if (!docxUrl && courrier.fichier_pdf_url) {
      const pdfUrl = courrier.fichier_pdf_url.toLowerCase();
      if (pdfUrl.includes(".docx")) {
        docxUrl = courrier.fichier_pdf_url;
        shouldMoveToWordUrl = true;
      }
    }

    if (!docxUrl) {
      return new Response(
        JSON.stringify({ error: "Aucun fichier DOCX trouvé pour ce courrier" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Conversion du courrier ${courrierId}, DOCX: ${docxUrl}`);

    let docxArrayBuffer: ArrayBuffer;

    if (docxUrl.startsWith("http://") || docxUrl.startsWith("https://")) {
      const docxResponse = await fetch(docxUrl);
      if (!docxResponse.ok) {
        throw new Error(`Impossible de télécharger le DOCX: ${docxResponse.status}`);
      }
      docxArrayBuffer = await docxResponse.arrayBuffer();
    } else {
      const bucketPath = docxUrl.replace(/^courriers\//, "");
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("courriers")
        .download(bucketPath);

      if (downloadError || !fileData) {
        throw new Error(`Erreur téléchargement DOCX depuis storage: ${downloadError?.message}`);
      }

      docxArrayBuffer = await fileData.arrayBuffer();
    }

    console.log(`DOCX téléchargé, taille: ${docxArrayBuffer.byteLength} octets`);

    const createJobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cloudConvertApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-docx": {
            operation: "import/upload",
          },
          "convert-to-pdf": {
            operation: "convert",
            input: "import-docx",
            output_format: "pdf",
          },
          "export-pdf": {
            operation: "export/url",
            input: "convert-to-pdf",
          },
        },
      }),
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      throw new Error(`CloudConvert job creation failed: ${errorText}`);
    }

    const jobData = await createJobResponse.json();
    console.log(`CloudConvert job créé: ${jobData.data.id}`);

    const importTask = jobData.data.tasks.find((t: any) => t.name === "import-docx");
    if (!importTask || !importTask.result?.form) {
      throw new Error("Pas de formulaire d'upload dans la réponse CloudConvert");
    }

    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters;

    const formData = new FormData();
    Object.keys(uploadParams).forEach(key => {
      formData.append(key, uploadParams[key]);
    });
    formData.append("file", new Blob([docxArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "document.docx");

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload DOCX vers CloudConvert échoué: ${errorText}`);
    }

    console.log(`DOCX uploadé vers CloudConvert`);

    let jobStatus = jobData.data.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (jobStatus !== "finished" && jobStatus !== "error" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          "Authorization": `Bearer ${cloudConvertApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error("Impossible de vérifier le statut de conversion");
      }

      const statusData = await statusResponse.json();
      jobStatus = statusData.data.status;

      console.log(`CloudConvert job status: ${jobStatus} (attempt ${attempts})`);
    }

    if (jobStatus !== "finished") {
      throw new Error(`La conversion a échoué ou a expiré (statut: ${jobStatus})`);
    }

    const finalJobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
      headers: {
        "Authorization": `Bearer ${cloudConvertApiKey}`,
      },
    });

    const finalJobData = await finalJobResponse.json();
    const exportTask = finalJobData.data.tasks.find((t: any) => t.name === "export-pdf");

    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      throw new Error("Pas d'URL de téléchargement PDF dans la réponse CloudConvert");
    }

    const pdfDownloadUrl = exportTask.result.files[0].url;
    console.log(`Téléchargement du PDF depuis CloudConvert: ${pdfDownloadUrl}`);

    const pdfResponse = await fetch(pdfDownloadUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Impossible de télécharger le PDF converti: ${pdfResponse.status}`);
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    console.log(`PDF téléchargé, taille: ${pdfArrayBuffer.byteLength} octets`);

    const pdfFileName = `pdf/${courrierId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("courriers")
      .upload(pdfFileName, pdfArrayBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erreur upload PDF vers storage: ${uploadError.message}`);
    }

    console.log(`PDF uploadé vers storage: ${pdfFileName}`);

    const { data: publicUrlData } = supabase.storage
      .from("courriers")
      .getPublicUrl(pdfFileName);

    const pdfUrl = publicUrlData.publicUrl;

    const updateData: any = {
      fichier_pdf_url: pdfUrl,
    };

    if (shouldMoveToWordUrl) {
      updateData.fichier_word_genere_url = docxUrl;
    }

    const { error: updateError } = await supabase
      .from("courrier_genere")
      .update(updateData)
      .eq("id", courrierId);

    if (updateError) {
      throw new Error(`Erreur mise à jour courrier_genere: ${updateError.message}`);
    }

    console.log(`Courrier ${courrierId} mis à jour avec PDF: ${pdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        message: "PDF généré avec succès",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur convert-courrier-to-pdf:", error);
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
