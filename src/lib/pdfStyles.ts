export const PDF_STYLES = {
  colors: {
    primary: '#1e40af',
    secondary: '#64748b',
    text: '#1f2937',
    lightGray: '#f3f4f6',
    border: '#e5e7eb',
    white: '#ffffff'
  },

  fonts: {
    title: {
      size: 16,
      weight: 'bold',
      lineHeight: 1.4
    },
    heading: {
      size: 14,
      weight: 'bold',
      lineHeight: 1.3
    },
    body: {
      size: 11,
      weight: 'normal',
      lineHeight: 1.6
    },
    small: {
      size: 9,
      weight: 'normal',
      lineHeight: 1.4
    }
  },

  spacing: {
    pageMarginTop: 25,
    pageMarginBottom: 25,
    pageMarginLeft: 20,
    pageMarginRight: 20,
    headerHeight: 70,
    footerHeight: 50,
    sectionSpacing: 18,
    paragraphSpacing: 12,
    safetyMargin: 15
  },

  company: {
    name: 'TRANSPORT CLASSE AFFAIRE',
    address: '111 Avenue Victor Hugo',
    postalCode: '75016',
    city: 'PARIS',
    phone: '01.86.22.24.00',
    siret: '50426507500029',
    email: 'contact@transportclasseaffaire.fr',
    website: 'www.transportclasseaffaire.fr'
  }
} as const;

export const LETTERHEAD_TEMPLATE = `
  <div style="border-bottom: 3px solid ${PDF_STYLES.colors.primary}; padding-bottom: 15px; margin-bottom: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="color: ${PDF_STYLES.colors.primary}; font-size: 20px; font-weight: bold; margin: 0 0 5px 0;">
          ${PDF_STYLES.company.name}
        </h1>
        <p style="color: ${PDF_STYLES.colors.secondary}; font-size: 10px; margin: 0; line-height: 1.4;">
          ${PDF_STYLES.company.address}<br/>
          ${PDF_STYLES.company.postalCode} ${PDF_STYLES.company.city}<br/>
          Tél: ${PDF_STYLES.company.phone} | Email: ${PDF_STYLES.company.email}
        </p>
      </div>
    </div>
  </div>
`;

export const FOOTER_TEMPLATE = (pageNum: number, totalPages: number, date: string) => `
  <div style="border-top: 1px solid ${PDF_STYLES.colors.border}; padding-top: 10px; margin-top: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <p style="color: ${PDF_STYLES.colors.secondary}; font-size: 8px; margin: 0;">
        ${PDF_STYLES.company.name} - Document confidentiel
      </p>
      <p style="color: ${PDF_STYLES.colors.secondary}; font-size: 8px; margin: 0;">
        Page ${pageNum} sur ${totalPages} | Généré le ${date}
      </p>
    </div>
  </div>
`;
