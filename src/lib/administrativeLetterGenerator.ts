import jsPDF from 'jspdf';
import { pdfConfig } from './pdfConfig';

export interface LetterRecipient {
  civilite: 'Madame' | 'Monsieur' | 'Madame, Monsieur';
  nom: string;
  prenom: string;
  adresse?: string;
  adresse_ligne_2?: string;
  code_postal?: string;
  ville?: string;
}

export interface LetterSignature {
  nom: string;
  prenom?: string;
  fonction: string;
}

export interface LetterOptions {
  date?: Date;
  lieu?: string;
  showPageNumbers?: boolean;
  showFooter?: boolean;
}

export interface LetterGenerationData {
  recipient: LetterRecipient;
  object: string;
  content: string;
  signature: LetterSignature;
  options?: LetterOptions;
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface ParsedBlock {
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'separator' | 'break';
  segments?: TextSegment[];
  items?: string[];
  ordered?: boolean;
  level?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export class AdministrativeLetterGenerator {
  private doc: jsPDF;
  private currentY: number;
  private pageNumber: number;
  private config = pdfConfig;

  constructor() {
    this.doc = new jsPDF({
      orientation: this.config.page.orientation,
      unit: this.config.page.unit,
      format: this.config.page.format
    });
    this.currentY = this.config.margins.top;
    this.pageNumber = 1;
    this.doc.setFont(this.config.typography.mainFont);
  }

  async generate(data: LetterGenerationData): Promise<Blob> {
    this.addCompanyHeader();

    this.addSeparatorLine();

    this.addDateBlock(data.options?.date, data.options?.lieu);

    this.addRecipientBlock(data.recipient);

    this.addObjectBlock(data.object);

    this.addGreeting(data.recipient.civilite);

    await this.addHTMLContent(data.content);

    this.addPoliteFormula(data.recipient.civilite);

    this.addSignatureBlock(data.signature);

    this.addFooterToAllPages(data.options);

    return this.doc.output('blob');
  }

  private addCompanyHeader(): void {
    const company = this.config.company;
    const typo = this.config.typography;
    const x = this.config.margins.left;

    this.doc.setFontSize(typo.companyName.size);
    this.doc.setFont(this.config.typography.mainFont, typo.companyName.weight);
    this.doc.setTextColor(typo.companyName.color);
    this.doc.text(company.name, x, this.currentY);

    this.currentY += 5;

    this.doc.setFontSize(typo.companyInfo.size);
    this.doc.setFont(this.config.typography.mainFont, typo.companyInfo.weight);
    this.doc.setTextColor(typo.companyInfo.color);

    this.doc.text(company.address, x, this.currentY);
    this.currentY += 4;

    this.doc.text(`${company.postalCode} ${company.city}`, x, this.currentY);
    this.currentY += 4;

    this.doc.text(`Téléphone: ${company.phone}`, x, this.currentY);
    this.currentY += 4;

    this.doc.text(`SIRET: ${company.siret}`, x, this.currentY);
    this.currentY += this.config.spacing.afterHeader;
  }

  private addSeparatorLine(): void {
    const pageWidth = this.doc.internal.pageSize.getWidth();

    this.doc.setDrawColor(51, 51, 51);
    this.doc.setLineWidth(this.config.layout.separator.thickness);
    this.doc.line(
      this.config.margins.left,
      this.currentY,
      pageWidth - this.config.margins.right,
      this.currentY
    );

    this.currentY += 8;
  }

  private addDateBlock(date?: Date, lieu?: string): void {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const dateStr = this.formatDateLong(date || new Date());
    const lieuStr = lieu || 'Paris';
    const fullText = `${lieuStr}, le ${dateStr}`;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setFont(this.config.typography.mainFont, 'normal');
    this.doc.setTextColor(this.config.typography.body.color);

    const textWidth = this.doc.getTextWidth(fullText);
    const x = pageWidth - this.config.margins.right - textWidth;

    this.doc.text(fullText, x, this.currentY);
    this.currentY += this.config.spacing.afterDate;
  }

  private addRecipientBlock(recipient: LetterRecipient): void {
    const x = this.config.margins.left;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setFont(this.config.typography.mainFont, 'bold');
    this.doc.setTextColor(this.config.typography.body.color);

    const fullName = `${recipient.civilite} ${recipient.prenom} ${recipient.nom.toUpperCase()}`;
    this.doc.text(fullName, x, this.currentY);
    this.currentY += 5;

    this.doc.setFont(this.config.typography.mainFont, 'normal');

    if (recipient.adresse) {
      this.doc.text(recipient.adresse, x, this.currentY);
      this.currentY += 4;
    }

    if (recipient.adresse_ligne_2) {
      this.doc.text(recipient.adresse_ligne_2, x, this.currentY);
      this.currentY += 4;
    }

    if (recipient.code_postal && recipient.ville) {
      this.doc.text(`${recipient.code_postal} ${recipient.ville}`, x, this.currentY);
      this.currentY += 4;
    }

    this.currentY += this.config.spacing.afterRecipient;
  }

  private addObjectBlock(object: string): void {
    const x = this.config.margins.left;

    this.doc.setFontSize(this.config.typography.object.size);
    this.doc.setFont(this.config.typography.mainFont, this.config.typography.object.weight);
    this.doc.setTextColor(this.config.typography.object.color);

    const objectText = `Objet: ${object}`;
    const lines = this.doc.splitTextToSize(objectText, this.config.margins.contentWidth);

    lines.forEach((line: string, index: number) => {
      this.doc.text(line, x, this.currentY);
      if (this.config.typography.object.underline && index === 0) {
        const lineWidth = this.doc.getTextWidth(line);
        this.doc.line(x, this.currentY + 0.5, x + lineWidth, this.currentY + 0.5);
      }
      if (index < lines.length - 1) {
        this.currentY += 5;
      }
    });

    this.currentY += this.config.spacing.afterObject;
  }

  private addGreeting(civilite: string): void {
    const x = this.config.margins.left;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setFont(this.config.typography.mainFont, 'normal');
    this.doc.setTextColor(this.config.typography.body.color);

    this.doc.text(`${civilite},`, x, this.currentY);
    this.currentY += this.config.spacing.afterGreeting;
  }

  private async addHTMLContent(html: string): Promise<void> {
    const blocks = this.parseHTMLToBlocks(html);

    for (const block of blocks) {
      await this.renderBlock(block);
    }
  }

  private parseHTMLToBlocks(html: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];

    html = html.replace(/<br\s*\/?>/gi, '<br/>');

    const blockRegex = /<(p|h1|h2|h3|ul|ol|hr)([^>]*)>(.*?)<\/\1>|<(br\s*\/?)>|<hr\s*\/?>/gis;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
      const tag = match[1] || match[4];
      const attributes = match[2] || '';
      const content = match[3] || '';

      if (tag === 'p') {
        const align = this.extractAlign(attributes);
        const segments = this.parseTextSegments(content);
        if (segments.length > 0) {
          blocks.push({ type: 'paragraph', segments, align });
        }
      } else if (tag === 'h1') {
        blocks.push({ type: 'heading1', segments: this.parseTextSegments(content) });
      } else if (tag === 'h2') {
        blocks.push({ type: 'heading2', segments: this.parseTextSegments(content) });
      } else if (tag === 'h3') {
        blocks.push({ type: 'heading3', segments: this.parseTextSegments(content) });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = this.extractListItems(content);
        if (items.length > 0) {
          blocks.push({ type: 'list', items, ordered: tag === 'ol' });
        }
      } else if (tag === 'hr' || tag.startsWith('hr')) {
        blocks.push({ type: 'separator' });
      } else if (tag && tag.match(/br/i)) {
        blocks.push({ type: 'break' });
      }
    }

    if (blocks.length === 0 && html.trim()) {
      const segments = this.parseTextSegments(html);
      if (segments.length > 0) {
        blocks.push({ type: 'paragraph', segments, align: 'justify' });
      }
    }

    return blocks;
  }

  private extractAlign(attributes: string): 'left' | 'center' | 'right' | 'justify' {
    const alignMatch = attributes.match(/text-align:\s*(left|center|right|justify)/i);
    if (alignMatch) {
      return alignMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
    }
    return 'justify';
  }

  private extractListItems(content: string): string[] {
    const items: string[] = [];
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
    let match;

    while ((match = itemRegex.exec(content)) !== null) {
      const itemText = this.stripHtmlTags(match[1]);
      if (itemText.trim()) {
        items.push(itemText);
      }
    }

    return items;
  }

  private parseTextSegments(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const tagRegex = /<(b|strong|i|em|u)([^>]*)>(.*?)<\/\1>/gis;

    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const plainText = this.stripHtmlTags(text.substring(lastIndex, match.index));
        if (plainText) {
          segments.push({ text: plainText });
        }
      }

      const tag = match[1].toLowerCase();
      const content = this.stripHtmlTags(match[3]);

      if (content) {
        segments.push({
          text: content,
          bold: tag === 'b' || tag === 'strong',
          italic: tag === 'i' || tag === 'em',
          underline: tag === 'u'
        });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const plainText = this.stripHtmlTags(text.substring(lastIndex));
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    if (segments.length === 0) {
      const plainText = this.stripHtmlTags(text);
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    return segments;
  }

  private stripHtmlTags(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&agrave;/g, 'à')
      .replace(/&eacute;/g, 'é')
      .replace(/&egrave;/g, 'è')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&icirc;/g, 'î')
      .replace(/&ugrave;/g, 'ù')
      .replace(/&ccedil;/g, 'ç')
      .trim();
  }

  private async renderBlock(block: ParsedBlock): Promise<void> {
    switch (block.type) {
      case 'paragraph':
        await this.renderParagraph(block.segments!, block.align || 'justify');
        break;
      case 'heading1':
        await this.renderHeading(block.segments!, 1);
        break;
      case 'heading2':
        await this.renderHeading(block.segments!, 2);
        break;
      case 'heading3':
        await this.renderHeading(block.segments!, 3);
        break;
      case 'list':
        await this.renderList(block.items!, block.ordered!);
        break;
      case 'separator':
        this.renderSeparator();
        break;
      case 'break':
        this.currentY += 5;
        break;
    }
  }

  private async renderParagraph(segments: TextSegment[], align: string = 'justify'): Promise<void> {
    this.checkPageBreak(20);

    const x = this.config.margins.left;
    const maxWidth = this.config.margins.contentWidth;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setTextColor(this.config.typography.body.color);

    const lines = this.wrapTextSegments(segments, maxWidth);

    for (const line of lines) {
      this.checkPageBreak(10);

      if (align === 'center') {
        const lineWidth = this.calculateLineWidth(line);
        const startX = x + (maxWidth - lineWidth) / 2;
        this.renderLine(line, startX);
      } else if (align === 'right') {
        const lineWidth = this.calculateLineWidth(line);
        const startX = x + maxWidth - lineWidth;
        this.renderLine(line, startX);
      } else {
        this.renderLine(line, x);
      }

      this.currentY += 5;
    }

    this.currentY += this.config.spacing.betweenParagraphs;
  }

  private wrapTextSegments(segments: TextSegment[], maxWidth: number): TextSegment[][] {
    const lines: TextSegment[][] = [];
    let currentLine: TextSegment[] = [];
    let currentWidth = 0;

    for (const segment of segments) {
      const words = segment.text.split(' ');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const spaceAfter = i < words.length - 1 ? ' ' : '';
        const fullWord = word + spaceAfter;

        this.doc.setFont(
          this.config.typography.mainFont,
          segment.bold ? 'bold' : segment.italic ? 'italic' : 'normal'
        );

        const wordWidth = this.doc.getTextWidth(fullWord);

        if (currentWidth + wordWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentWidth = 0;
        }

        const lastSeg = currentLine[currentLine.length - 1];
        if (lastSeg &&
            lastSeg.bold === segment.bold &&
            lastSeg.italic === segment.italic &&
            lastSeg.underline === segment.underline) {
          lastSeg.text += fullWord;
        } else {
          currentLine.push({
            text: fullWord,
            bold: segment.bold,
            italic: segment.italic,
            underline: segment.underline
          });
        }

        currentWidth += wordWidth;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  private calculateLineWidth(segments: TextSegment[]): number {
    let width = 0;

    for (const segment of segments) {
      this.doc.setFont(
        this.config.typography.mainFont,
        segment.bold ? 'bold' : segment.italic ? 'italic' : 'normal'
      );
      width += this.doc.getTextWidth(segment.text);
    }

    return width;
  }

  private renderLine(segments: TextSegment[], startX: number): void {
    let currentX = startX;

    for (const segment of segments) {
      const style = segment.bold ? 'bold' : segment.italic ? 'italic' : 'normal';
      this.doc.setFont(this.config.typography.mainFont, style);

      this.doc.text(segment.text, currentX, this.currentY);

      if (segment.underline) {
        const textWidth = this.doc.getTextWidth(segment.text);
        this.doc.line(currentX, this.currentY + 0.5, currentX + textWidth, this.currentY + 0.5);
      }

      currentX += this.doc.getTextWidth(segment.text);
    }
  }

  private async renderHeading(segments: TextSegment[], level: number): Promise<void> {
    const config = level === 1 ? this.config.typography.h1 :
                   level === 2 ? this.config.typography.h2 :
                   this.config.typography.h3;

    this.checkPageBreak(20);
    this.currentY += config.spaceBefore;

    const x = this.config.margins.left;

    this.doc.setFontSize(config.size);
    this.doc.setFont(this.config.typography.mainFont, config.weight);
    this.doc.setTextColor(this.config.typography.body.color);

    const text = segments.map(s => s.text).join('');
    const lines = this.doc.splitTextToSize(text, this.config.margins.contentWidth);

    lines.forEach((line: string) => {
      this.checkPageBreak(10);
      this.doc.text(line, x, this.currentY);
      this.currentY += 6;
    });

    this.currentY += config.spaceAfter;
  }

  private async renderList(items: string[], ordered: boolean): Promise<void> {
    this.checkPageBreak(20);

    const x = this.config.margins.left;
    const indent = this.config.typography.list.indent;
    const maxWidth = this.config.margins.contentWidth - indent - 5;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setFont(this.config.typography.mainFont, 'normal');
    this.doc.setTextColor(this.config.typography.body.color);

    items.forEach((item, index) => {
      this.checkPageBreak(15);

      const bullet = ordered ? `${index + 1}.` : '•';
      const bulletWidth = this.doc.getTextWidth(bullet + ' ');

      this.doc.text(bullet, x, this.currentY);

      const lines = this.doc.splitTextToSize(item, maxWidth);
      lines.forEach((line: string, lineIndex: number) => {
        if (lineIndex > 0) {
          this.currentY += 5;
          this.checkPageBreak(10);
        }
        this.doc.text(line, x + indent, this.currentY);
      });

      this.currentY += 5 + this.config.typography.list.itemSpacing;
    });

    this.currentY += this.config.spacing.betweenParagraphs;
  }

  private renderSeparator(): void {
    this.checkPageBreak(10);

    const pageWidth = this.doc.internal.pageSize.getWidth();

    this.doc.setDrawColor(153, 153, 153);
    this.doc.setLineWidth(0.5);
    this.doc.line(
      this.config.margins.left,
      this.currentY,
      pageWidth - this.config.margins.right,
      this.currentY
    );

    this.currentY += 8;
  }

  private addPoliteFormula(civilite: string): void {
    this.checkPageBreak(20);

    this.currentY += this.config.spacing.beforePoliteFormula;

    const x = this.config.margins.left;

    this.doc.setFontSize(this.config.typography.body.size);
    this.doc.setFont(this.config.typography.mainFont, 'normal');
    this.doc.setTextColor(this.config.typography.body.color);

    const formula = `Veuillez agréer, ${civilite}, l'expression de nos salutations distinguées.`;
    const lines = this.doc.splitTextToSize(formula, this.config.margins.contentWidth);

    lines.forEach((line: string) => {
      this.doc.text(line, x, this.currentY);
      this.currentY += 5;
    });

    this.currentY += this.config.spacing.beforeSignature;
  }

  private addSignatureBlock(signature: LetterSignature): void {
    this.checkPageBreak(this.config.layout.signature.minSpace);

    const pageWidth = this.doc.internal.pageSize.getWidth();
    const rightMargin = this.config.margins.right;

    this.doc.setFontSize(this.config.typography.signatureTitle.size);
    this.doc.setFont(this.config.typography.mainFont, this.config.typography.signatureTitle.weight);
    this.doc.setTextColor(this.config.typography.signatureTitle.color);

    const functionWidth = this.doc.getTextWidth(signature.fonction);
    const functionX = pageWidth - rightMargin - functionWidth;
    this.doc.text(signature.fonction, functionX, this.currentY);

    this.currentY += 15;

    this.doc.setFontSize(this.config.typography.signature.size);
    this.doc.setFont(this.config.typography.mainFont, this.config.typography.signature.weight);
    this.doc.setTextColor(this.config.typography.signature.color);

    const fullName = signature.prenom
      ? `${signature.prenom} ${signature.nom.toUpperCase()}`
      : signature.nom.toUpperCase();

    const nameWidth = this.doc.getTextWidth(fullName);
    const nameX = pageWidth - rightMargin - nameWidth;
    this.doc.text(fullName, nameX, this.currentY);
  }

  private addFooterToAllPages(options?: LetterOptions): void {
    if (options?.showFooter === false) return;

    const totalPages = this.doc.getNumberOfPages();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const footerY = pageHeight - this.config.spacing.footerHeight;

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);

      this.doc.setDrawColor(153, 153, 153);
      this.doc.setLineWidth(0.3);
      this.doc.line(
        this.config.margins.left,
        footerY - 5,
        pageWidth - this.config.margins.right,
        footerY - 5
      );

      this.doc.setFontSize(this.config.typography.footer.size);
      this.doc.setFont(this.config.typography.mainFont, this.config.typography.footer.weight);
      this.doc.setTextColor(this.config.typography.footer.color);

      this.doc.text(
        `${this.config.company.name} - Document confidentiel`,
        this.config.margins.left,
        footerY
      );

      if (options?.showPageNumbers !== false) {
        const date = this.formatDateShort(new Date());
        const pageText = `Page ${i}/${totalPages} | Généré le ${date}`;
        const textWidth = this.doc.getTextWidth(pageText);
        this.doc.text(
          pageText,
          pageWidth - this.config.margins.right - textWidth,
          footerY
        );
      }
    }
  }

  private checkPageBreak(neededSpace: number): boolean {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const maxY = pageHeight - this.config.margins.bottom - this.config.spacing.footerHeight;

    if (this.currentY + neededSpace > maxY) {
      this.doc.addPage();
      this.pageNumber++;
      this.currentY = this.config.margins.top + 10;
      return true;
    }

    return false;
  }

  private formatDateLong(date: Date): string {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  private formatDateShort(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }
}

export async function generateAdministrativeLetter(data: LetterGenerationData): Promise<Blob> {
  const generator = new AdministrativeLetterGenerator();
  return await generator.generate(data);
}
