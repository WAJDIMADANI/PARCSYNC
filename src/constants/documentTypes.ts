import { Car, CreditCard, Heart, Briefcase, FileText, User } from 'lucide-react';

export interface DocumentTypeConfig {
  value: string;
  label: string;
  icon: any;
  requiresExpiration?: boolean;
  expirationField?: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    value: 'cni_recto',
    label: 'Carte d\'identité (Recto)',
    icon: CreditCard,
    requiresExpiration: false
  },
  {
    value: 'cni_verso',
    label: 'Carte d\'identité (Verso)',
    icon: CreditCard,
    requiresExpiration: false
  },
  {
    value: 'carte_vitale',
    label: 'Carte vitale',
    icon: CreditCard,
    requiresExpiration: false
  },
  {
    value: 'casier_judiciaire',
    label: 'B3 casier judiciaire',
    icon: FileText,
    requiresExpiration: false
  },
  {
    value: 'permis_recto',
    label: 'Permis de conduire (Recto)',
    icon: Car,
    requiresExpiration: false
  },
  {
    value: 'permis_verso',
    label: 'Permis de conduire (Verso)',
    icon: Car,
    requiresExpiration: false
  },
  {
    value: 'attestation_points',
    label: 'Point permis',
    icon: FileText,
    requiresExpiration: false
  },
  {
    value: 'rib',
    label: 'RIB',
    icon: Briefcase,
    requiresExpiration: false
  },
  {
    value: 'dpae',
    label: 'DPAE',
    icon: FileText,
    requiresExpiration: false
  },
  {
    value: 'certificat_medical',
    label: 'Certificat médical',
    icon: Heart,
    requiresExpiration: true,
    expirationField: 'date_fin_visite_medicale'
  },
  {
    value: 'titre_sejour',
    label: 'Titre de séjour / Carte de résident',
    icon: FileText,
    requiresExpiration: true,
    expirationField: 'titre_sejour_fin_validite'
  },
  {
    value: 'autre',
    label: 'Autre document',
    icon: FileText,
    requiresExpiration: false
  }
];

export const DOCUMENT_CONFIG: Record<string, { label: string; icon: any }> = DOCUMENT_TYPES.reduce(
  (acc, doc) => {
    acc[doc.value] = { label: doc.label, icon: doc.icon };
    return acc;
  },
  {} as Record<string, { label: string; icon: any }>
);
