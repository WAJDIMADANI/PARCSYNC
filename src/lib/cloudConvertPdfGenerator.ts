const CLOUDCONVERT_API_KEY = import.meta.env.VITE_CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2';

interface CloudConvertJob {
  id: string;
  status: string;
  tasks: Array<{
    id: string;
    name: string;
    operation: string;
    status: string;
    result?: {
      files: Array<{
        filename: string;
        url: string;
      }>;
    };
  }>;
}

export async function generatePDFFromHTML(html: string): Promise<Blob> {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error('CloudConvert API key not configured');
  }

  try {
    const job = await createConversionJob();
    const uploadTaskId = job.tasks.find(t => t.operation === 'import/upload')?.id;
    const exportTaskId = job.tasks.find(t => t.operation === 'export/url')?.id;

    if (!uploadTaskId || !exportTaskId) {
      throw new Error('Failed to get task IDs from CloudConvert');
    }

    await uploadHTMLFile(uploadTaskId, html);

    const result = await waitForJobCompletion(job.id);
    const exportTask = result.tasks.find(t => t.id === exportTaskId);

    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No PDF file generated');
    }

    const pdfBlob = await downloadPDF(exportTask.result.files[0].url);
    return pdfBlob;
  } catch (error) {
    console.error('CloudConvert error:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createConversionJob(): Promise<CloudConvertJob> {
  const response = await fetch(`${CLOUDCONVERT_API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'upload-html': {
          operation: 'import/upload',
        },
        'convert-to-pdf': {
          operation: 'convert',
          input: 'upload-html',
          output_format: 'pdf',
          engine: 'chrome',
          engine_version: '132',
          filename: 'contract.pdf',
          page_width: 8.27,
          page_height: 11.69,
          margin_top: 0,
          margin_bottom: 0,
          margin_left: 0,
          margin_right: 0,
          print_background: true,
          display_header_footer: false,
        },
        'export-pdf': {
          operation: 'export/url',
          input: 'convert-to-pdf',
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create job: ${error}`);
  }

  return await response.json();
}

async function uploadHTMLFile(taskId: string, html: string): Promise<void> {
  const blob = new Blob([html], { type: 'text/html' });
  const formData = new FormData();
  formData.append('file', blob, 'contract.html');

  const response = await fetch(
    `${CLOUDCONVERT_API_URL}/import/upload/${taskId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload HTML: ${error}`);
  }
}

async function waitForJobCompletion(jobId: string): Promise<CloudConvertJob> {
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const response = await fetch(`${CLOUDCONVERT_API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check job status');
    }

    const job: CloudConvertJob = await response.json();

    if (job.status === 'finished') {
      return job;
    }

    if (job.status === 'error') {
      throw new Error('Job failed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Job timeout');
}

async function downloadPDF(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  return await response.blob();
}
