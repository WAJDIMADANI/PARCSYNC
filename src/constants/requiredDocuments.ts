import { Car, CreditCard, Heart, Briefcase, FileText } from 'lucide-react';

export interface RequiredDocumentConfig {
  value: string;
  label: string;
  icon: any;
}

export const REQUIRED_DOCUMENTS: RequiredDocumentConfig[] = [
  {
    value: 'cni_recto',
    label: 'Carte d\'identité (Recto)',
    icon: CreditCard
  },
  {
    value: 'cni_verso',
    label: 'Carte d\'identité (Verso)',
    icon: CreditCard
  },
  {
    value: 'carte_vitale',
    label: 'Carte vitale',
    icon: CreditCard
  },
  {
    value: 'casier_judiciaire',
    label: 'B3 casier judiciaire',
    icon: FileText
  },
  {
    value: 'permis_recto',
    label: 'Permis de conduire (Recto)',
    icon: Car
  },
  {
    value: 'permis_verso',
    label: 'Permis de conduire (Verso)',
    icon: Car
  },
  {
    value: 'attestation_points',
    label: 'Point permis',
    icon: FileText
  },
  {
    value: 'rib',
    label: 'RIB',
    icon: Briefcase
  },
  {
    value: 'dpae',
    label: 'DPAE',
    icon: FileText
  },
  {
    value: 'certificat_medical',
    label: 'Certificat médical',
    icon: Heart
  }
];

export const REQUIRED_DOCUMENT_TYPES = REQUIRED_DOCUMENTS.map(doc => doc.value);

export const REQUIRED_DOCUMENTS_MAP: Record<string, RequiredDocumentConfig> =
  REQUIRED_DOCUMENTS.reduce((acc, doc) => {
    acc[doc.value] = doc;
    return acc;
  }, {} as Record<string, RequiredDocumentConfig>);
