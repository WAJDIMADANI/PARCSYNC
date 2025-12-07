import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content, ContentText, ContentStack, ContentColumns } from 'pdfmake/interfaces';
import { pdfConfig } from './pdfConfig';

pdfMake.vfs = pdfFonts.vfs;

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
  align?: 'left' | 'center' | 'right' | 'justify';
}

export class AdministrativeLetterGenerator {
  private config = pdfConfig;

  async generate(data: LetterGenerationData): Promise<Blob> {
    const docDefinition = this.buildDocumentDefinition(data);

    return new Promise<Blob>((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBlob((blob: Blob) => {
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildDocumentDefinition(data: LetterGenerationData): TDocumentDefinitions {
    const content: Content[] = [];

    content.push(...this.buildCompanyHeader());
    content.push(this.buildSeparatorLine());
    content.push(this.buildDateBlock(data.options?.date, data.options?.lieu));
    content.push(...this.buildRecipientBlock(data.recipient));
    content.push(this.buildObjectBlock(data.object));
    content.push(this.buildGreeting(data.recipient.civilite));
    content.push(...this.buildHTMLContent(data.content));
    content.push(this.buildPoliteFormula(data.recipient.civilite));
    content.push(this.buildSignatureBlock(data.signature));

    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [
        this.mmToPt(this.config.margins.left),
        this.mmToPt(this.config.margins.top),
        this.mmToPt(this.config.margins.right),
        this.mmToPt(this.config.margins.bottom)
      ],
      content,
      footer: data.options?.showFooter !== false
        ? this.buildFooter(data.options)
        : undefined,
      styles: this.buildStyles(),
      defaultStyle: {
        font: 'Helvetica',
        fontSize: this.config.typography.body.size,
        lineHeight: this.config.typography.body.lineHeight,
        color: this.config.typography.body.color
      }
    };
  }

  private mmToPt(mm: number): number {
    return mm * 2.83465;
  }

  private buildCompanyHeader(): Content[] {
    const company = this.config.company;
    const content: Content[] = [];

    content.push({
      text: company.name,
      style: 'companyName'
    });

    content.push({
      text: [
        company.address + '\n',
        `${company.postalCode} ${company.city}\n`,
        `Téléphone: ${company.phone}\n`,
        `SIRET: ${company.siret}`
      ],
      style: 'companyInfo'
    });

    content.push({
      text: '',
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.afterHeader - 10)]
    });

    return content;
  }

  private buildSeparatorLine(): Content {
    return {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: this.mmToPt(this.config.margins.contentWidth),
          y2: 0,
          lineWidth: this.config.layout.separator.thickness,
          lineColor: '#333333'
        }
      ],
      margin: [0, 0, 0, this.mmToPt(8)]
    };
  }

  private buildDateBlock(date?: Date, lieu?: string): Content {
    const dateStr = this.formatDateLong(date || new Date());
    const lieuStr = lieu || 'Paris';
    const fullText = `${lieuStr}, le ${dateStr}`;

    return {
      text: fullText,
      alignment: 'right',
      style: 'date',
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.afterDate)]
    };
  }

  private buildRecipientBlock(recipient: LetterRecipient): Content[] {
    const content: Content[] = [];
    const lines: string[] = [];

    let fullName: string;
    if (recipient.civilite === 'Madame') {
      fullName = `Madame ${recipient.prenom} ${recipient.nom.toUpperCase()}`;
    } else if (recipient.civilite === 'Monsieur') {
      fullName = `Monsieur ${recipient.prenom} ${recipient.nom.toUpperCase()}`;
    } else {
      fullName = `${recipient.prenom} ${recipient.nom.toUpperCase()}`;
    }
    lines.push(fullName);

    if (recipient.adresse) {
      lines.push(recipient.adresse);
    }

    if (recipient.adresse_ligne_2) {
      lines.push(recipient.adresse_ligne_2);
    }

    if (recipient.code_postal && recipient.ville) {
      lines.push(`${recipient.code_postal} ${recipient.ville}`);
    }

    content.push({
      text: lines.join('\n'),
      style: 'recipient',
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.afterRecipient)]
    });

    return content;
  }

  private buildObjectBlock(object: string): Content {
    return {
      text: `Objet: ${object}`,
      style: 'object',
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.afterObject)]
    };
  }

  private buildGreeting(civilite: string): Content {
    return {
      text: `${civilite},`,
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.afterGreeting)]
    };
  }

  private buildHTMLContent(html: string): Content[] {
    const blocks = this.parseHTMLToBlocks(html);
    const content: Content[] = [];

    for (const block of blocks) {
      const blockContent = this.renderBlock(block);
      if (blockContent) {
        content.push(blockContent);
      }
    }

    return content;
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

  private renderBlock(block: ParsedBlock): Content | null {
    switch (block.type) {
      case 'paragraph':
        return this.renderParagraph(block.segments!, block.align || 'justify');
      case 'heading1':
        return this.renderHeading(block.segments!, 1);
      case 'heading2':
        return this.renderHeading(block.segments!, 2);
      case 'heading3':
        return this.renderHeading(block.segments!, 3);
      case 'list':
        return this.renderList(block.items!, block.ordered!);
      case 'separator':
        return this.renderSeparator();
      case 'break':
        return { text: '', margin: [0, 0, 0, this.mmToPt(5)] };
      default:
        return null;
    }
  }

  private renderParagraph(segments: TextSegment[], align: string): Content {
    const textContent = this.segmentsToText(segments);

    return {
      text: textContent,
      alignment: align as any,
      margin: [0, 0, 0, this.mmToPt(this.config.spacing.betweenParagraphs)]
    };
  }

  private segmentsToText(segments: TextSegment[]): any {
    if (segments.length === 0) {
      return '';
    }

    if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].underline) {
      return segments[0].text;
    }

    return segments.map(segment => {
      const textObj: any = { text: segment.text };

      if (segment.bold) {
        textObj.bold = true;
      }

      if (segment.italic) {
        textObj.italics = true;
      }

      if (segment.underline) {
        textObj.decoration = 'underline';
      }

      return textObj;
    });
  }

  private renderHeading(segments: TextSegment[], level: number): Content {
    const styleName = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
    const config = level === 1 ? this.config.typography.h1 :
                   level === 2 ? this.config.typography.h2 :
                   this.config.typography.h3;

    const text = segments.map(s => s.text).join('');

    return {
      text,
      style: styleName,
      margin: [
        0,
        this.mmToPt(config.spaceBefore),
        0,
        this.mmToPt(config.spaceAfter)
      ]
    };
  }

  private renderList(items: string[], ordered: boolean): Content {
    return {
      [ordered ? 'ol' : 'ul']: items,
      margin: [
        this.mmToPt(this.config.typography.list.indent),
        0,
        0,
        this.mmToPt(this.config.spacing.betweenParagraphs)
      ]
    };
  }

  private renderSeparator(): Content {
    return {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: this.mmToPt(this.config.margins.contentWidth),
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#999999'
        }
      ],
      margin: [0, this.mmToPt(4), 0, this.mmToPt(4)]
    };
  }

  private buildPoliteFormula(civilite: string): Content {
    const formula = `Veuillez agréer, ${civilite}, l'expression de nos salutations distinguées.`;

    return {
      text: formula,
      margin: [
        0,
        this.mmToPt(this.config.spacing.beforePoliteFormula),
        0,
        this.mmToPt(this.config.spacing.beforeSignature)
      ]
    };
  }

  private buildSignatureBlock(signature: LetterSignature): Content {
    const fullName = signature.prenom
      ? `${signature.prenom} ${signature.nom.toUpperCase()}`
      : signature.nom.toUpperCase();

    return {
      stack: [
        {
          text: signature.fonction,
          style: 'signatureTitle'
        },
        {
          text: '',
          margin: [0, 0, 0, this.mmToPt(15)]
        },
        {
          text: fullName,
          style: 'signature'
        }
      ],
      alignment: 'right'
    };
  }

  private buildFooter(options?: LetterOptions): (currentPage: number, pageCount: number) => Content {
    return (currentPage: number, pageCount: number): Content => {
      const footerContent: Content[] = [];

      footerContent.push({
        canvas: [
          {
            type: 'line',
            x1: this.mmToPt(this.config.margins.left),
            y1: 0,
            x2: this.mmToPt(210 - this.config.margins.right),
            y2: 0,
            lineWidth: 0.3,
            lineColor: '#999999'
          }
        ],
        margin: [0, 0, 0, this.mmToPt(2)]
      });

      const leftText = `${this.config.company.name} - Document confidentiel`;
      const date = this.formatDateShort(new Date());
      const rightText = options?.showPageNumbers !== false
        ? `Page ${currentPage}/${pageCount} | Généré le ${date}`
        : '';

      footerContent.push({
        columns: [
          {
            text: leftText,
            style: 'footer',
            alignment: 'left',
            width: '*'
          },
          {
            text: rightText,
            style: 'footer',
            alignment: 'right',
            width: '*'
          }
        ],
        margin: [
          this.mmToPt(this.config.margins.left),
          0,
          this.mmToPt(this.config.margins.right),
          0
        ]
      });

      return {
        stack: footerContent,
        margin: [0, this.mmToPt(5), 0, 0]
      };
    };
  }

  private buildStyles(): any {
    return {
      companyName: {
        fontSize: this.config.typography.companyName.size,
        bold: this.config.typography.companyName.weight === 'bold',
        color: this.config.typography.companyName.color,
        margin: [0, 0, 0, 2]
      },
      companyInfo: {
        fontSize: this.config.typography.companyInfo.size,
        color: this.config.typography.companyInfo.color,
        lineHeight: 1.2
      },
      date: {
        fontSize: this.config.typography.body.size
      },
      recipient: {
        fontSize: this.config.typography.body.size,
        bold: true,
        lineHeight: 1.2
      },
      object: {
        fontSize: this.config.typography.object.size,
        bold: this.config.typography.object.weight === 'bold',
        decoration: this.config.typography.object.underline ? 'underline' : undefined,
        color: this.config.typography.object.color
      },
      heading1: {
        fontSize: this.config.typography.h1.size,
        bold: this.config.typography.h1.weight === 'bold'
      },
      heading2: {
        fontSize: this.config.typography.h2.size,
        bold: this.config.typography.h2.weight === 'bold'
      },
      heading3: {
        fontSize: this.config.typography.h3.size,
        bold: this.config.typography.h3.weight === 'bold'
      },
      signature: {
        fontSize: this.config.typography.signature.size,
        bold: this.config.typography.signature.weight === 'bold',
        color: this.config.typography.signature.color
      },
      signatureTitle: {
        fontSize: this.config.typography.signatureTitle.size,
        bold: this.config.typography.signatureTitle.weight === 'bold',
        color: this.config.typography.signatureTitle.color
      },
      footer: {
        fontSize: this.config.typography.footer.size,
        color: this.config.typography.footer.color
      }
    };
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
