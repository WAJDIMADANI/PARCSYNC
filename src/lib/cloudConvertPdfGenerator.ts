const CLOUDCONVERT_API_KEY = import.meta.env.VITE_CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2';

interface CloudConvertJob {
  data: {
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
  };
}

export async function generatePDFFromHTML(html: string): Promise<Blob> {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error('CloudConvert API key not configured');
  }

  try {
    console.log('🎯 Creating CloudConvert job...');
    const job = await createConversionJob();
    console.log('✅ Job created:', job);

    if (!job.data || !job.data.tasks) {
      console.error('❌ Invalid job structure:', job);
      throw new Error('Invalid CloudConvert job response');
    }

    const tasksArray = Array.isArray(job.data.tasks) ? job.data.tasks : Object.values(job.data.tasks);
    const uploadTask = tasksArray.find((t: any) => t.operation === 'import/upload');
    const exportTask = tasksArray.find((t: any) => t.operation === 'export/url');

    if (!uploadTask?.id || !exportTask?.id) {
      console.error('❌ Missing task IDs:', { uploadTask, exportTask });
      throw new Error('Failed to get task IDs from CloudConvert');
    }

    console.log('📤 Uploading HTML...');
    await uploadHTMLFile(uploadTask.id, html);

    console.log('⏳ Waiting for conversion...');
    const result = await waitForJobCompletion(job.data.id);

    const resultTasksArray = Array.isArray(result.data.tasks) ? result.data.tasks : Object.values(result.data.tasks);
    const finalExportTask = resultTasksArray.find((t: any) => t.id === exportTask.id);

    if (!finalExportTask?.result?.files?.[0]?.url) {
      console.error('❌ No PDF URL in result:', finalExportTask);
      throw new Error('No PDF file generated');
    }

    console.log('⬇️ Downloading PDF...');
    const pdfBlob = await downloadPDF(finalExportTask.result.files[0].url);
    console.log('✅ PDF generated successfully');
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
  const maxAttempts = 60;

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

    if (job.data.status === 'finished') {
      return job;
    }

    if (job.data.status === 'error') {
      console.error('CloudConvert job error:', job);
      throw new Error('Job failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Job timeout after 120 seconds');
}

async function downloadPDF(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  return await response.blob();
}
