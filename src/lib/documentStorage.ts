import { supabase } from './supabase';

export interface Document {
  fichier_url?: string;
  storage_path?: string;
  bucket?: string;
  [key: string]: any;
}

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export async function resolveDocUrl(doc: Document): Promise<string> {
  // 1) Compat rétro : si l'ancien champ est une URL complète, on l'utilise
  if (isHttp(doc.fichier_url || '')) return doc.fichier_url!;

  // 2) Sinon on utilise storage_path normalisé
  const path = doc.storage_path || doc.fichier_url; // fallback (V1)
  if (!path) throw new Error('Chemin manquant');

  // Bucket : soit colonne 'bucket', soit premier segment du path
  const bucket = doc.bucket || path.split('/')[0];
  const relative = doc.bucket ? path : path.split('/').slice(1).join('/');

  // ⚠️ Si bucket privé (recommandé RH) -> URL signée
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(relative, 300); // 5 min

  if (error) throw error;
  return data.signedUrl;
}

export function isPdfDocument(doc: Document): boolean {
  const path = doc.storage_path || doc.fichier_url || '';
  return path.toLowerCase().endsWith('.pdf');
}

export async function onVoirDocument(doc: Document): Promise<void> {
  try {
    const url = await resolveDocUrl(doc);
    const isPdf = (doc.storage_path || doc.fichier_url || '').toLowerCase().endsWith('.pdf');
    if (isPdf) {
      // ouvre un modal <iframe src={url}> (ou déclenche un download)
      window.open(url, '_blank', 'noopener');
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch (e: any) {
    alert('Impossible d\'ouvrir le document : ' + (e.message || ''));
  }
}

// ===== SYSTÈME SPÉCIFIQUE POUR LES CONTRATS MANUELS =====

export interface Contract {
  source?: string;
  modele_id?: string | null;
  fichier_signe_url?: string;
  signed_storage_path?: string;
  [key: string]: any;
}

export function isManualContract(contract: Contract): boolean {
  return contract.source === 'manuel' || !contract.modele_id;
}

export async function resolveContractUrl(contract: Contract): Promise<string> {
  // 1) Vérifier si c'est une URL HTTP complète (compatibilité descendante)
  const url = contract.fichier_signe_url || contract.signed_storage_path || '';
  if (isHttp(url)) {
    return url;
  }

  // 2) Sinon, traiter comme un chemin Supabase Storage
  if (!url) {
    throw new Error('Fichier de contrat manquant');
  }

  // 3) Tous les contrats sont stockés dans le bucket 'documents'
  // Le chemin complet est stocké tel quel (ex: "contrats/profil_id/fichier.pdf")
  const bucket = 'documents';
  const relativePath = url;

  // 4) Créer une URL signée pour accès sécurisé
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(relativePath, 300); // 5 minutes

  if (error) {
    throw new Error(`Erreur lors de la génération de l'URL: ${error.message}`);
  }

  return data.signedUrl;
}
