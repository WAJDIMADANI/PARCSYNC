import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getStorageUrl(filePath: string): string {
  if (!filePath) return '';

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
