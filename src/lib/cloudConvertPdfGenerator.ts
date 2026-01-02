const CLOUDCONVERT_API_KEY = import.meta.env.VITE_CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_SYNC_API_URL = 'https://sync.api.cloudconvert.com/v2';

type CloudConvertTask = {
  id: string;
  name?: string;
  operation: string;
  status: string;
  message?: string | null;
  code?: string | null;
  result?: any;
};

type CloudConvertJobResponse = {
  data?: {
    id: string;
    status: "waiting" | "processing" | "finished" | "error";
    tasks?: CloudConvertTask[] | Record<string, CloudConvertTask>;
  };
};

function normalizeTasks(tasks: CloudConvertJobResponse["data"]["tasks"]): CloudConvertTask[] {
  if (!tasks) return [];
  if (Array.isArray(tasks)) return tasks;
  return Object.values(tasks);
}

function extractExportUrl(job: CloudConvertJobResponse): string {
  const tasks = normalizeTasks(job.data?.tasks);
  const exportTask = tasks.find(t => t.operation === "export/url" && t.status === "finished");

  const url = exportTask?.result?.files?.[0]?.url;
  if (!url) {
    const debug = tasks.map(t => ({
      op: t.operation,
      status: t.status,
      message: t.message,
      code: t.code,
      hasFiles: !!t.result?.files,
    }));
    throw new Error(`CloudConvert: export/url introuvable. Tasks=${JSON.stringify(debug)}`);
  }
  return url;
}

export async function htmlToPdfUrlCloudConvert(html: string): Promise<string> {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error("VITE_CLOUDCONVERT_API_KEY manquante");
  }

  console.log('🎯 Creating CloudConvert sync job...');

  const payload = {
    tasks: {
      "import-html": {
        operation: "import/raw",
        file: html,
        filename: "contract.html",
      },
      "convert-pdf": {
        operation: "convert",
        input: "import-html",
        input_format: "html",
        output_format: "pdf",
        engine: "chrome",
        engine_version: "132",
        page_width: 8.27,
        page_height: 11.69,
        margin_top: 0,
        margin_bottom: 0,
        margin_left: 0,
        margin_right: 0,
        print_background: true,
        display_header_footer: false,
      },
      "export-pdf": {
        operation: "export/url",
        input: "convert-pdf",
        inline: false,
      },
    },
  };

  const res = await fetch(`${CLOUDCONVERT_SYNC_API_URL}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('❌ CloudConvert job failed:', text);
    throw new Error(`CloudConvert job failed (${res.status}): ${text}`);
  }

  const job = (await res.json()) as CloudConvertJobResponse;
  console.log('✅ Job completed:', job.data?.status);

  if (!job.data) {
    throw new Error("CloudConvert: réponse inattendue (pas de data)");
  }

  if (job.data.status === "error") {
    const tasks = normalizeTasks(job.data.tasks);
    const errTask = tasks.find(t => t.status === "error");
    console.error('❌ Job error:', errTask);
    throw new Error(`CloudConvert: job error. ${errTask?.message ?? "Unknown error"}`);
  }

  return extractExportUrl(job);
}

export async function generatePDFFromHTML(html: string): Promise<Blob> {
  try {
    console.log('🎯 Generating PDF with CloudConvert...');
    const url = await htmlToPdfUrlCloudConvert(html);

    console.log('⬇️ Downloading PDF from:', url);
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`Download PDF failed (${r.status})`);
    }

    const blob = await r.blob();
    console.log('✅ PDF generated successfully');
    return blob;
  } catch (error) {
    console.error('CloudConvert error:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
