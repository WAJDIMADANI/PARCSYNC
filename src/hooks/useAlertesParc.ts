import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ========================================================================
// TYPES
// ========================================================================

export type AlerteType = 'retard' | 'aujourdhui' | 'j3' | 'fin_j7' | 'fin_j30' | 'doc_expire' | 'doc_bientot';

export interface AlerteParc {
  // Identité unique
  id: string;
  type: AlerteType;
  typeCategorie: 'paiement' | 'location' | 'document';
  dismissKey: string;

  // Contrat / location
  location_id: string;
  reference_contrat: string;
  vehicule_immat: string;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  type_location: string;
  locataire_nom: string;
  locataire_prenom: string;

  // Date affichée + métadonnées tri
  date_alerte: string;
  joursEcart: number;

  // Spécifique paiement
  paiement_id?: string;
  montant?: number;

// Spécifique fin de location
  date_fin?: string;

  // Spécifique document véhicule
  document_id?: string;
  document_type?: 'controle_technique' | 'assurance' | 'carte_ris';
  document_type_label?: string;
  vehicle_id?: string;
  vehicle_statut?: string;
  date_expiration?: string;
}

export interface AlerteGroupe {
  titre: string;
  sousTitre: string;
  couleur: 'red' | 'amber' | 'blue' | 'slate';
  alertes: AlerteParc[];
  date: string;
}

const LS_DISMISSED_KEY = 'parc_sync_notif_dismissed_v1';
const TYPE_LABELS: Record<string, string> = {
  location_pure: 'Loc. pure',
  location_vente_particulier: 'Loc-vente',
  location_vente_societe: 'Loc-vente soc.',
  loa: 'LOA',
};

// Réf utilisée pour calculer aujourd'hui de manière fiable (timezone safe)
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function diffJoursISO(fromISO: string, toISO: string): number {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ========================================================================
// HOOK PRINCIPAL
// ========================================================================

export function useAlertesParc(mode: 'paiement' | 'location' | 'document' | 'all') {
  const [paiements, setPaiements] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_DISMISSED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // ----- Chargement données -----
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Récupère tous les paiements + locations non payés ET les contrats en cours
      const [paiementsRes, locationsRes] = await Promise.all([
        (mode === 'paiement' || mode === 'all')
          ? supabase
              .from('paiements_location')
              .select(`
                id, location_id, mois, montant_attendu_ttc, montant_paye, statut,
                location:location_id(
                  reference_contrat, type_location, statut, jour_paiement,
                  vehicule:vehicule_id(immatriculation, marque, modele),
                  locataire:locataire_id(nom, prenom)
                )
              `)
              .neq('statut', 'paye')
          : Promise.resolve({ data: [], error: null }),
        (mode === 'location' || mode === 'all')
          ? supabase
              .from('locations')
              .select(`
                id, reference_contrat, type_location, statut, date_fin,
                vehicule:vehicule_id(immatriculation, marque, modele),
                locataire:locataire_id(nom, prenom)
              `)
              .eq('statut', 'en_cours')
              .not('date_fin', 'is', null)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (paiementsRes.error) throw paiementsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setPaiements(paiementsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (err) {
      console.error('[useAlertesParc] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { refresh(); }, [refresh]);

  // ----- Helpers dismiss -----
  const dismiss = useCallback((dismissKey: string) => {
    setDismissed(prev => {
      const next = [...prev, dismissKey];
      try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ----- Calcul des alertes (à la volée) -----
  const alertes = useMemo<AlerteParc[]>(() => {
    const result: AlerteParc[] = [];
    const today = todayISO();
    const j3 = addDaysISO(3);
    const j7 = addDaysISO(7);
    const j30 = addDaysISO(30);

    // 1. ALERTES PAIEMENT (retard, aujourd'hui, J-3)
    if (mode === 'paiement' || mode === 'all') {
      paiements.forEach((p: any) => {
        if (!p.location || p.location.statut !== 'en_cours') return;
        if (!p.mois) return;

        const jourPaiement = p.location.jour_paiement || 1;
        const datePrevue = new Date(p.mois);
        datePrevue.setDate(jourPaiement);
        const datePrevueISO = datePrevue.toISOString().split('T')[0];

        const ecart = diffJoursISO(today, datePrevueISO); // négatif = passé, 0 = aujourd'hui, positif = futur

        let type: AlerteType | null = null;
        if (ecart < 0) type = 'retard';
        else if (ecart === 0) type = 'aujourdhui';
        else if (ecart === 3) type = 'j3';

        if (!type) return;

    const dismissKey = `${type}-paiement-${p.id}`;
        const alerte: AlerteParc = {
          id: p.id,
          type,
          typeCategorie: 'paiement',
          dismissKey,
          location_id: p.location_id,
          reference_contrat: p.location.reference_contrat || p.location_id.slice(0, 6).toUpperCase(),
          vehicule_immat: p.location.vehicule?.immatriculation || '—',
          vehicule_marque: p.location.vehicule?.marque || null,
          vehicule_modele: p.location.vehicule?.modele || null,
          type_location: TYPE_LABELS[p.location.type_location || ''] || p.location.type_location || '—',
          locataire_nom: p.location.locataire?.nom || '',
          locataire_prenom: p.location.locataire?.prenom || '',
          date_alerte: datePrevueISO,
          joursEcart: ecart,
          paiement_id: p.id,
          montant: (p.montant_attendu_ttc || 0) - (p.montant_paye || 0),
        };
        result.push(alerte);
      });
    }

    // 2. ALERTES FIN DE LOCATION (J-7, J-30)
    if (mode === 'location' || mode === 'all') {
      locations.forEach((l: any) => {
        if (!l.date_fin) return;
        const ecart = diffJoursISO(today, l.date_fin);

        let type: AlerteType | null = null;
        if (ecart >= 1 && ecart <= 7) type = 'fin_j7';
        else if (ecart >= 8 && ecart <= 30) type = 'fin_j30';

        if (!type) return;

        const dismissKey = `${type}-location-${l.id}`;
        const alerte: AlerteParc = {
          id: l.id,
          type,
          typeCategorie: 'location',
          dismissKey,
          location_id: l.id,
          reference_contrat: l.reference_contrat || l.id.slice(0, 6).toUpperCase(),
          vehicule_immat: l.vehicule?.immatriculation || '—',
          vehicule_marque: l.vehicule?.marque || null,
          vehicule_modele: l.vehicule?.modele || null,
          type_location: TYPE_LABELS[l.type_location || ''] || l.type_location || '—',
          locataire_nom: l.locataire?.nom || '',
          locataire_prenom: l.locataire?.prenom || '',
          date_alerte: l.date_fin,
          joursEcart: ecart,
          date_fin: l.date_fin,
        };
        result.push(alerte);
      });
    }

    // Filtre dismissed (sauf retard et aujourd'hui qui persistent toujours)
    return result.filter(a => {
      if (a.type === 'retard' || a.type === 'aujourdhui') return true;
      return !dismissed.includes(a.dismissKey);
    });
  }, [paiements, locations, mode, dismissed]);

  // ----- Groupement par jour avec libellés contextuels -----
  const groupes = useMemo<AlerteGroupe[]>(() => {
    if (alertes.length === 0) return [];

    // Sépare retards (groupe unique) et le reste (par date)
    const retards = alertes.filter(a => a.type === 'retard').sort((a, b) => a.joursEcart - b.joursEcart);
    const autres = alertes.filter(a => a.type !== 'retard');

    // Groupe les "autres" par date_alerte
    const parDate: Record<string, AlerteParc[]> = {};
    autres.forEach(a => {
      if (!parDate[a.date_alerte]) parDate[a.date_alerte] = [];
      parDate[a.date_alerte].push(a);
    });

    const result: AlerteGroupe[] = [];

    if (retards.length > 0) {
      result.push({
        titre: 'En retard',
        sousTitre: 'actions urgentes',
        couleur: 'red',
        alertes: retards,
        date: 'retard',
      });
    }

    // Tri des dates par ordre croissant
    Object.keys(parDate).sort().forEach(date => {
      const items = parDate[date];
      const premierType = items[0].type;
      const ecart = items[0].joursEcart;

      let titre = '';
      let sousTitre = '';
      let couleur: 'red' | 'amber' | 'blue' | 'slate' = 'blue';

      const dateObj = new Date(date);
      const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const moisLabels = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const dateFormatted = `${joursSemaine[dateObj.getDay()]} ${dateObj.getDate()} ${moisLabels[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

      if (premierType === 'aujourdhui') {
        titre = "Aujourd'hui";
        sousTitre = dateFormatted;
        couleur = 'amber';
      } else if (premierType === 'fin_j7') {
        titre = 'Cette semaine';
        sousTitre = `${dateFormatted} · restitution à préparer`;
        couleur = 'amber';
      } else if (premierType === 'j3') {
        titre = `${joursSemaine[dateObj.getDay()].charAt(0).toUpperCase() + joursSemaine[dateObj.getDay()].slice(1)} prochain`;
        sousTitre = `${dateFormatted} · dans ${ecart} jour${ecart > 1 ? 's' : ''}`;
        couleur = 'blue';
      } else if (premierType === 'fin_j30') {
        titre = 'Le mois prochain';
        sousTitre = `${dateFormatted} · renouvellement à proposer`;
        couleur = 'blue';
      }

      result.push({ titre, sousTitre, couleur, alertes: items, date });
    });

    return result;
  }, [alertes]);

  const nbTotal = alertes.length;

  return { loading, alertes, groupes, nbTotal, dismiss, refresh };
}