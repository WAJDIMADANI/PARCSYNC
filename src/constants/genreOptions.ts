export const GENRE_OPTIONS = ['Homme', 'Femme', 'Autre'] as const;

export type Genre = typeof GENRE_OPTIONS[number];

export const GENRE_LABELS: Record<Genre, string> = {
  'Homme': 'Homme',
  'Femme': 'Femme',
  'Autre': 'Autre'
};
