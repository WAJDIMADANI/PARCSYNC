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
