import jsPDF from 'jspdf';
import { PDF_STYLES } from './pdfStyles';

interface GeneratePdfOptions {
  title?: string;
  recipient?: {
    name: string;
    address?: string;
    city?: string;
  };
  content: string;
  metadata?: {
    author?: string;
    subject?: string;
  };
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function calculateLineHeight(fontSize: number, lineHeightRatio: number): number {
  return (fontSize * lineHeightRatio * 25.4) / 72;
}

export async function generateProfessionalPdf(options: GeneratePdfOptions): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margins = PDF_STYLES.spacing;
  const contentWidth = pageWidth - margins.pageMarginLeft - margins.pageMarginRight;

  let currentY = margins.pageMarginTop;
  let pageNumber = 1;

  if (options.metadata) {
    if (options.metadata.author) doc.setProperties({ author: options.metadata.author });
    if (options.metadata.subject) doc.setProperties({ subject: options.metadata.subject });
  }

  const addHeader = () => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(PDF_STYLES.company.name, margins.pageMarginLeft, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(PDF_STYLES.company.address, margins.pageMarginLeft, 28);
    doc.text(`${PDF_STYLES.company.postalCode} ${PDF_STYLES.company.city}`, margins.pageMarginLeft, 32);
    doc.text(`Tél: ${PDF_STYLES.company.phone} | ${PDF_STYLES.company.email}`, margins.pageMarginLeft, 36);

    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.8);
    doc.line(margins.pageMarginLeft, 40, pageWidth - margins.pageMarginRight, 40);
  };

  const addFooter = (pageNum: number) => {
    const footerY = pageHeight - 15;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margins.pageMarginLeft, footerY - 5, pageWidth - margins.pageMarginRight, footerY - 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${PDF_STYLES.company.name} - Document confidentiel`, margins.pageMarginLeft, footerY);

    const date = new Date().toLocaleDateString('fr-FR');
    const pageText = `Page ${pageNum} | Généré le ${date}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - margins.pageMarginRight - pageTextWidth, footerY);
  };

  const checkPageBreak = (neededSpace: number): boolean => {
    const safetyMargin = margins.safetyMargin || 15;
    const maxY = pageHeight - margins.pageMarginBottom - safetyMargin;

    if (currentY + neededSpace > maxY) {
      addFooter(pageNumber);
      doc.addPage();
      pageNumber++;
      addHeader();
      currentY = 50;
      return true;
    }
    return false;
  };

  addHeader();
  currentY = 50;

  if (options.recipient) {
    const recipientFontSize = 10;
    const recipientLineHeight = calculateLineHeight(recipientFontSize, 1.5);

    checkPageBreak(recipientLineHeight * 5);

    doc.setFontSize(recipientFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);

    doc.text('À l\'attention de:', margins.pageMarginLeft, currentY);
    currentY += recipientLineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text(options.recipient.name, margins.pageMarginLeft, currentY);
    currentY += recipientLineHeight;

    if (options.recipient.address) {
      doc.setFont('helvetica', 'normal');
      doc.text(options.recipient.address, margins.pageMarginLeft, currentY);
      currentY += recipientLineHeight;
    }

    if (options.recipient.city) {
      doc.text(options.recipient.city, margins.pageMarginLeft, currentY);
      currentY += recipientLineHeight;
    }

    currentY += PDF_STYLES.spacing.sectionSpacing;
  }

  if (options.title) {
    const titleFontSize = PDF_STYLES.fonts.title.size;
    const titleLineHeight = calculateLineHeight(titleFontSize, PDF_STYLES.fonts.title.lineHeight);

    checkPageBreak(titleLineHeight * 2);
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    const titleLines = doc.splitTextToSize(options.title, contentWidth);
    doc.text(titleLines, margins.pageMarginLeft, currentY);
    currentY += titleLines.length * titleLineHeight + PDF_STYLES.spacing.sectionSpacing;
  }

  const htmlContent = options.content || '';
  const blocks = parseHtmlToBlocks(htmlContent);

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      await renderParagraph(doc, block.segments, margins.pageMarginLeft, contentWidth);
    } else if (block.type === 'heading') {
      await renderHeading(doc, block.text, margins.pageMarginLeft, contentWidth);
    } else if (block.type === 'list') {
      await renderList(doc, block.items, margins.pageMarginLeft, contentWidth, block.ordered);
    } else if (block.type === 'break') {
      currentY += PDF_STYLES.spacing.paragraphSpacing;
    }
  }

  async function renderParagraph(pdf: jsPDF, segments: TextSegment[], x: number, maxWidth: number) {
    const fontSize = PDF_STYLES.fonts.body.size;
    const lineHeightRatio = PDF_STYLES.fonts.body.lineHeight;
    const lineHeight = calculateLineHeight(fontSize, lineHeightRatio);

    checkPageBreak(lineHeight * 3);

    pdf.setFontSize(fontSize);
    pdf.setTextColor(31, 41, 55);

    let lineText = '';
    let lineSegments: Array<{ text: string; style: string }> = [];

    for (const segment of segments) {
      const style = segment.bold ? 'bold' : segment.italic ? 'italic' : 'normal';
      const text = segment.text;

      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        pdf.setFont('helvetica', style);
        const testLine = lineText + word;
        const testWidth = pdf.getTextWidth(testLine);

        if (testWidth > maxWidth && lineText.length > 0) {
          renderLine(pdf, lineSegments, x, currentY);
          currentY += lineHeight;
          checkPageBreak(lineHeight * 2);
          lineText = word;
          lineSegments = [{ text: word, style }];
        } else {
          lineText = testLine;
          if (lineSegments.length > 0 && lineSegments[lineSegments.length - 1].style === style) {
            lineSegments[lineSegments.length - 1].text += word;
          } else {
            lineSegments.push({ text: word, style });
          }
        }
      }
    }

    if (lineText.length > 0) {
      renderLine(pdf, lineSegments, x, currentY);
      currentY += lineHeight;
    }

    currentY += PDF_STYLES.spacing.paragraphSpacing;
  }

  function renderLine(pdf: jsPDF, segments: Array<{ text: string; style: string }>, x: number, y: number) {
    let currentX = x;
    for (const seg of segments) {
      pdf.setFont('helvetica', seg.style);
      pdf.text(seg.text, currentX, y);
      currentX += pdf.getTextWidth(seg.text);
    }
  }

  async function renderHeading(pdf: jsPDF, text: string, x: number, maxWidth: number) {
    const fontSize = PDF_STYLES.fonts.heading.size;
    const lineHeightRatio = PDF_STYLES.fonts.heading.lineHeight;
    const lineHeight = calculateLineHeight(fontSize, lineHeightRatio);

    checkPageBreak(lineHeight * 2);

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);

    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, currentY);
    currentY += lines.length * lineHeight + PDF_STYLES.spacing.sectionSpacing;
  }

  async function renderList(pdf: jsPDF, items: string[], x: number, maxWidth: number, ordered: boolean) {
    const fontSize = PDF_STYLES.fonts.body.size;
    const lineHeightRatio = PDF_STYLES.fonts.body.lineHeight;
    const lineHeight = calculateLineHeight(fontSize, lineHeightRatio);

    checkPageBreak(lineHeight * 3);

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);

    items.forEach((item, index) => {
      checkPageBreak(lineHeight * 2);
      const bullet = ordered ? `${index + 1}.` : '•';
      const bulletWidth = pdf.getTextWidth(bullet + ' ');

      pdf.text(bullet, x, currentY);

      const itemLines = pdf.splitTextToSize(item, maxWidth - bulletWidth - 5);
      itemLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex > 0) {
          currentY += lineHeight;
          checkPageBreak(lineHeight * 2);
        }
        pdf.text(line, x + bulletWidth + 2, currentY);
      });

      currentY += lineHeight;
    });

    currentY += PDF_STYLES.spacing.paragraphSpacing;
  }

  addFooter(pageNumber);

  return doc.output('blob');
}

interface Block {
  type: 'paragraph' | 'heading' | 'list' | 'break';
  segments?: TextSegment[];
  text?: string;
  items?: string[];
  ordered?: boolean;
}

function parseHtmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];

  const cleanHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6]>/gi, '<h>');

  const lines = cleanHtml.split('\n');

  for (let line of lines) {
    line = line.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('<h>')) {
      const text = stripHtmlTags(line.replace('<h>', ''));
      blocks.push({ type: 'heading', text });
      continue;
    }

    if (line.match(/^<ul>|^<ol>/)) {
      const ordered = line.startsWith('<ol>');
      const items: string[] = [];
      const itemRegex = /<li>(.*?)<\/li>/gi;
      let match;

      while ((match = itemRegex.exec(line)) !== null) {
        items.push(stripHtmlTags(match[1]));
      }

      if (items.length > 0) {
        blocks.push({ type: 'list', items, ordered });
      }
      continue;
    }

    const segments = parseTextSegments(line);
    if (segments.length > 0 && segments.some(s => s.text.trim())) {
      blocks.push({ type: 'paragraph', segments });
    }
  }

  return blocks;
}

function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentPos = 0;

  const tagRegex = /<(b|strong|i|em|u)>(.*?)<\/\1>/gi;
  const matches: Array<{ start: number; end: number; tag: string; content: string }> = [];

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      tag: match[1],
      content: match[2]
    });
  }

  matches.sort((a, b) => a.start - b.start);

  for (const m of matches) {
    if (currentPos < m.start) {
      const plainText = stripHtmlTags(text.substring(currentPos, m.start));
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    const isBold = m.tag === 'b' || m.tag === 'strong';
    const isItalic = m.tag === 'i' || m.tag === 'em';
    const isUnderline = m.tag === 'u';

    segments.push({
      text: stripHtmlTags(m.content),
      bold: isBold,
      italic: isItalic,
      underline: isUnderline
    });

    currentPos = m.end;
  }

  if (currentPos < text.length) {
    const plainText = stripHtmlTags(text.substring(currentPos));
    if (plainText) {
      segments.push({ text: plainText });
    }
  }

  if (segments.length === 0) {
    const plainText = stripHtmlTags(text);
    if (plainText) {
      segments.push({ text: plainText });
    }
  }

  return segments;
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
