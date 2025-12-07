export const pdfConfig = {
  page: {
    width: 210,
    height: 297,
    format: 'a4' as const,
    orientation: 'portrait' as const,
    unit: 'mm' as const
  },

  margins: {
    top: 20,
    bottom: 25,
    left: 25,
    right: 25,
    contentWidth: 160,
    contentHeight: 252
  },

  spacing: {
    afterHeader: 20,
    afterDate: 15,
    afterRecipient: 15,
    afterObject: 10,
    afterGreeting: 8,
    betweenParagraphs: 6,
    beforePoliteFormula: 10,
    beforeSignature: 20,
    signatureHeight: 30,
    footerHeight: 15
  },

  layout: {
    header: {
      start: 20,
      height: 30
    },
    separator: {
      y: 52,
      thickness: 0.5
    },
    date: {
      start: 60
    },
    recipient: {
      start: 80
    },
    object: {
      start: 105
    },
    greeting: {
      start: 120
    },
    body: {
      start: 135,
      maxEnd: 230
    },
    signature: {
      minSpace: 50
    },
    footer: {
      separator: 272,
      text: 280
    }
  },

  typography: {
    mainFont: 'helvetica',

    body: {
      size: 11,
      lineHeight: 1.5,
      color: '#000000'
    },

    companyName: {
      size: 12,
      weight: 'bold' as const,
      color: '#000000'
    },

    companyInfo: {
      size: 10,
      weight: 'normal' as const,
      color: '#000000'
    },

    object: {
      size: 11,
      weight: 'bold' as const,
      underline: true,
      color: '#000000'
    },

    signature: {
      size: 11,
      weight: 'bold' as const,
      color: '#000000'
    },

    signatureTitle: {
      size: 11,
      weight: 'normal' as const,
      color: '#000000'
    },

    footer: {
      size: 9,
      weight: 'normal' as const,
      color: '#666666'
    },

    h1: {
      size: 14,
      weight: 'bold' as const,
      spaceBefore: 8,
      spaceAfter: 6
    },

    h2: {
      size: 13,
      weight: 'bold' as const,
      spaceBefore: 6,
      spaceAfter: 4
    },

    h3: {
      size: 12,
      weight: 'bold' as const,
      spaceBefore: 4,
      spaceAfter: 3
    },

    list: {
      indent: 10,
      itemSpacing: 3,
      bulletSize: 2
    }
  },

  company: {
    name: 'TRANSPORT CLASSE AFFAIRE',
    address: '111 Avenue Victor Hugo',
    postalCode: '75016',
    city: 'PARIS',
    phone: '01.86.22.24.00',
    siret: '50426507500029'
  },

  pageBreak: {
    minLinesAtBottom: 2,
    minLinesAtTop: 2,
    lineHeight: 5,
    checkThreshold: 30
  }
};

export type PDFConfig = typeof pdfConfig;
