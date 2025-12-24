export type FileType = 'pdf' | 'docx' | 'unknown';

export interface FileInfo {
  type: FileType;
  mimeType: string;
  extension: string;
}

export function detectFileType(url: string | null | undefined): FileType {
  if (!url) return 'unknown';

  const urlLower = url.toLowerCase();

  if (urlLower.endsWith('.pdf')) return 'pdf';
  if (urlLower.endsWith('.docx')) return 'docx';
  if (urlLower.includes('.pdf?')) return 'pdf';
  if (urlLower.includes('.docx?')) return 'docx';

  return 'unknown';
}

export function getFileInfo(url: string | null | undefined): FileInfo {
  const type = detectFileType(url);

  switch (type) {
    case 'pdf':
      return {
        type: 'pdf',
        mimeType: 'application/pdf',
        extension: '.pdf'
      };
    case 'docx':
      return {
        type: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx'
      };
    default:
      return {
        type: 'unknown',
        mimeType: 'application/octet-stream',
        extension: ''
      };
  }
}

export function getFileLabel(type: FileType): string {
  switch (type) {
    case 'pdf':
      return 'PDF';
    case 'docx':
      return 'Word';
    default:
      return 'Fichier';
  }
}

export interface DownloadableFile {
  url: string;
  type: FileType;
  label: string;
}

export function getAvailableDownloads(
  fichier_pdf_url: string | null | undefined,
  fichier_word_genere_url: string | null | undefined
): DownloadableFile[] {
  const downloads: DownloadableFile[] = [];

  if (fichier_word_genere_url) {
    const type = detectFileType(fichier_word_genere_url);
    downloads.push({
      url: fichier_word_genere_url,
      type,
      label: getFileLabel(type)
    });
  }

  if (fichier_pdf_url) {
    const type = detectFileType(fichier_pdf_url);
    if (type === 'pdf') {
      downloads.push({
        url: fichier_pdf_url,
        type,
        label: getFileLabel(type)
      });
    } else if (type === 'docx' && !fichier_word_genere_url) {
      downloads.push({
        url: fichier_pdf_url,
        type,
        label: getFileLabel(type)
      });
    }
  }

  return downloads;
}

export function hasPdfAvailable(
  fichier_pdf_url: string | null | undefined,
  fichier_word_genere_url: string | null | undefined
): boolean {
  const downloads = getAvailableDownloads(fichier_pdf_url, fichier_word_genere_url);
  return downloads.some(file => file.type === 'pdf');
}

export function canGeneratePdf(
  fichier_pdf_url: string | null | undefined,
  fichier_word_genere_url: string | null | undefined
): boolean {
  const hasPdf = hasPdfAvailable(fichier_pdf_url, fichier_word_genere_url);
  const hasDocx = fichier_word_genere_url || (fichier_pdf_url && detectFileType(fichier_pdf_url) === 'docx');
  return !hasPdf && !!hasDocx;
}
