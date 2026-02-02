export interface ProprietaireData {
  mode: 'tca' | 'entreprise';
  displayName: string;
  tcaValue: string;
  entrepriseName: string;
  entreprisePhone: string;
  entrepriseAddress: string;
}

export function parseProprietaireCarteGrise(raw: string | null | undefined): ProprietaireData {
  if (!raw) {
    return {
      mode: 'tca',
      displayName: '-',
      tcaValue: 'TCA TRANSPORT',
      entrepriseName: '',
      entreprisePhone: '',
      entrepriseAddress: ''
    };
  }

  if (raw.startsWith('Entreprise:')) {
    const parts = raw.split('|').map(p => p.trim());

    let entrepriseName = '';
    let entreprisePhone = '';
    let entrepriseAddress = '';

    parts.forEach(part => {
      if (part.startsWith('Entreprise:')) {
        entrepriseName = part.replace('Entreprise:', '').trim();
      } else if (part.startsWith('Tel:')) {
        entreprisePhone = part.replace('Tel:', '').trim();
      } else if (part.startsWith('Adresse:')) {
        entrepriseAddress = part.replace('Adresse:', '').trim();
      }
    });

    return {
      mode: 'entreprise',
      displayName: entrepriseName || 'Entreprise externe',
      tcaValue: '',
      entrepriseName,
      entreprisePhone,
      entrepriseAddress
    };
  }

  return {
    mode: 'tca',
    displayName: raw,
    tcaValue: raw,
    entrepriseName: '',
    entreprisePhone: '',
    entrepriseAddress: ''
  };
}

export function formatProprietaireCarteGrise(data: {
  mode: 'tca' | 'entreprise';
  tcaValue?: string;
  entrepriseName?: string;
  entreprisePhone?: string;
  entrepriseAddress?: string;
}): string {
  if (data.mode === 'tca') {
    return data.tcaValue || 'TCA TRANSPORT';
  }

  const parts = [`Entreprise: ${data.entrepriseName || ''}`];

  if (data.entreprisePhone) {
    parts.push(`Tel: ${data.entreprisePhone}`);
  }

  if (data.entrepriseAddress) {
    parts.push(`Adresse: ${data.entrepriseAddress}`);
  }

  return parts.join(' | ');
}
