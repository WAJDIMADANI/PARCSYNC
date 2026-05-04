import { useState, useEffect, useMemo } from 'react';
import { Banknote, Search, RefreshCw, Filter, X, Check, Loader2, AlertTriangle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaiementRow {
  id: string;
  location_id: string;
  numero_echeance: number;
  mois: string;
  montant_attendu_ht: number | null;
  montant_attendu_ttc: number | null;
  montant_paye: number | null;
  date_paiement: string | null;
  statut: string;
  notes: string | null;
  vehicule_immat: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_ref_tca: string | null;
  locataire_nom: string | null;
  locataire_prenom: string | null;
  type_location: string | null;
  contrat_statut: string | null;
}

const STATUT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  paye:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Payé' },
  impaye:  { bg: 'bg-gray-100',    text: 'text-gray-600',    label: '⬜ À venir' },
  partiel: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: '🟡 Partiel' },
  retard:  { bg: 'bg-red-100',     text: 'text-red-700',     label: '🔴 En retard' },
};

const TYPE_LABELS: Record<string, string> = {
  location_pure: 'Loc. pure',
  location_vente_particulier: 'Loc-vente part.',
  location_vente_societe: 'Loc-vente soc.',
  loa: 'LOA',
};

type PeriodeFilter = 'ce_mois' | 'ce_trimestre' | 'cette_annee' | 'tout';

export function PaiementsManager() {
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periode, setPeriode] = useState<PeriodeFilter>('ce_mois');
  const [showTermines, setShowTermines] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Modal pointage
  const [pointageId, setPointageId] = useState<string | null>(null);
  const [pointageMontant, setPointageMontant] = useState('');
  const [pointageDate, setPointageDate] = useState(new Date().toISOString().split('T')[0]);
const [pointageNotes, setPointageNotes] = useState('');
  const [pointageMode, setPointageMode] = useState('');
  const [pointageCompte, setPointageCompte] = useState('');
  const [pointageReference, setPointageReference] = useState('');
  const [savingPointage, setSavingPointage] = useState(false);
  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paiements_location')
        .select(`
          id, location_id, numero_echeance, mois,
          montant_attendu_ht, montant_attendu_ttc,
          montant_paye, date_paiement, statut, notes,
          location:location_id(
            type_location, statut,
            vehicule:vehicule_id(immatriculation, marque, modele, ref_tca),
            locataire:locataire_id(nom, prenom)
          )
        `)
        .order('mois', { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const rows: PaiementRow[] = (data || []).map((p: any) => {
        let statut = p.statut;
        // Auto-détection retards : impayé + date dépassée
        if (statut === 'impaye' && p.mois < today) statut = 'retard';

        return {
          id: p.id,
          location_id: p.location_id,
          numero_echeance: p.numero_echeance,
          mois: p.mois,
          montant_attendu_ht: p.montant_attendu_ht,
          montant_attendu_ttc: p.montant_attendu_ttc,
          montant_paye: p.montant_paye,
          date_paiement: p.date_paiement,
          statut,
          notes: p.notes,
          vehicule_immat: p.location?.vehicule?.immatriculation || null,
          vehicule_marque: p.location?.vehicule?.marque || null,
          vehicule_modele: p.location?.vehicule?.modele || null,
          vehicule_ref_tca: p.location?.vehicule?.ref_tca || null,
          locataire_nom: p.location?.locataire?.nom || null,
          locataire_prenom: p.location?.locataire?.prenom || null,
          type_location: p.location?.type_location || null,
          contrat_statut: p.location?.statut || null,
        };
      });

      setPaiements(rows);

      // Auto-expand le mois courant
      const currentMonth = new Date().toISOString().slice(0, 7);
      setExpandedMonths(new Set([currentMonth]));
    } catch (err) {
      console.error('[PaiementsManager] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage
  const filtered = useMemo(() => {
    let result = [...paiements];

    // Filtrer les contrats terminés si pas cochés
    if (!showTermines) {
      result = result.filter(p => p.contrat_statut === 'en_cours');
    }

    // Filtre période
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (periode === 'ce_mois') {
      const prefix = now.toISOString().slice(0, 7);
      result = result.filter(p => p.mois?.startsWith(prefix));
    } else if (periode === 'ce_trimestre') {
      const trimestreStart = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1);
      const trimestreEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0);
      result = result.filter(p => {
        if (!p.mois) return false;
        return p.mois >= trimestreStart.toISOString().split('T')[0] && p.mois <= trimestreEnd.toISOString().split('T')[0];
      });
    } else if (periode === 'cette_annee') {
      result = result.filter(p => p.mois?.startsWith(String(currentYear)));
    }

    // Recherche texte
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.vehicule_immat?.toLowerCase().includes(q) ||
        p.vehicule_ref_tca?.toLowerCase().includes(q) ||
        p.locataire_nom?.toLowerCase().includes(q) ||
        p.locataire_prenom?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [paiements, search, periode, showTermines]);

  // Grouper par mois
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, PaiementRow[]> = {};
    filtered.forEach(p => {
      const key = p.mois?.slice(0, 7) || 'inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    // Trier les mois
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Synthèse globale (sur les données filtrées)
  const synthese = useMemo(() => {
    const attendu = filtered.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const encaisse = filtered.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const nbRetards = filtered.filter(p => p.statut === 'retard').length;
    const nbPayes = filtered.filter(p => p.statut === 'paye').length;
    const totalEcheances = filtered.length;
    const totalImpayes = filtered
      .filter(p => p.statut === 'retard' || p.statut === 'partiel')
      .reduce((sum, p) => sum + ((p.montant_attendu_ttc || 0) - (p.montant_paye || 0)), 0);
    const taux = totalEcheances > 0 ? Math.round((nbPayes / totalEcheances) * 100) : 0;

    return { attendu, encaisse, nbRetards, totalImpayes, nbPayes, totalEcheances, taux };
  }, [filtered]);

  const toggleMonth = (monthKey: string) => {
    const next = new Set(expandedMonths);
    if (next.has(monthKey)) next.delete(monthKey);
    else next.add(monthKey);
    setExpandedMonths(next);
  };

  // Pointage
const handleOpenPointage = (p: PaiementRow) => {
    setPointageId(p.id);
    const reste = (p.montant_attendu_ttc || 0) - (p.montant_paye || 0);
    setPointageMontant(String(reste > 0 ? reste : p.montant_attendu_ttc || 0));
    setPointageDate(new Date().toISOString().split('T')[0]);
    setPointageNotes('');
    setPointageMode('');
    setPointageCompte('');
    setPointageReference('');
  };

  const handleValiderPointage = async () => {
    if (!pointageId) return;
    setSavingPointage(true);
    try {
      const montant = parseFloat(pointageMontant) || 0;
      const paiement = paiements.find(p => p.id === pointageId);
      if (!paiement) return;

      const totalPaye = (paiement.montant_paye || 0) + montant;
      const attendu = paiement.montant_attendu_ttc || 0;

      let newStatut = 'paye';
      if (totalPaye <= 0) newStatut = 'impaye';
      else if (totalPaye < attendu) newStatut = 'partiel';

    const { error } = await supabase
        .from('paiements_location')
        .update({
          montant_paye: totalPaye,
          date_paiement: pointageDate,
          statut: newStatut,
          mode_paiement: pointageMode || null,
          compte_rib: pointageCompte || null,
          reference_paiement: pointageReference || null,
          pointe_par: (await supabase.auth.getUser()).data.user?.id || null,
          notes: pointageNotes ? ((paiement.notes || '') + ' | ' + pointageNotes).replace(/^\s*\|\s*/, '') : paiement.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pointageId);

      if (error) throw error;

      // Mettre à jour le compteur dans locations
      const { data: allPaiements } = await supabase
        .from('paiements_location')
        .select('id, statut, montant_paye, montant_attendu_ttc')
        .eq('location_id', paiement.location_id);

      if (allPaiements) {
        const payeesCount = allPaiements.filter(p => p.id === pointageId ? newStatut === 'paye' : p.statut === 'paye').length;
        const totalEncaisse = allPaiements.reduce((sum, p) => {
          if (p.id === pointageId) return sum + totalPaye;
          return sum + (p.montant_paye || 0);
        }, 0);

        const { data: locationData } = await supabase
          .from('locations')
          .select('montant_total_ht, montant_total_ttc')
          .eq('id', paiement.location_id)
          .single();

        if (locationData) {
          await supabase
            .from('locations')
            .update({
              mensualites_payees: payeesCount,
              reste_a_payer_ttc: Math.max(0, (locationData.montant_total_ttc || 0) - totalEncaisse),
              reste_a_payer_ht: Math.max(0, (locationData.montant_total_ht || 0) - (totalEncaisse / 1.2)),
            })
            .eq('id', paiement.location_id);
        }
      }

      setPointageId(null);
      await fetchPaiements();
    } catch (err) {
      console.error('[PaiementsManager] Erreur pointage:', err);
      alert('Erreur lors du pointage');
    } finally {
      setSavingPointage(false);
    }
  };

  const formatMoisLabel = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    } catch { return monthKey; }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
  };

  const periodeLabels: Record<PeriodeFilter, string> = {
    ce_mois: 'Ce mois',
    ce_trimestre: 'Ce trimestre',
    cette_annee: 'Cette année',
    tout: 'Tout',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const paiementPointage = paiements.find(p => p.id === pointageId);
  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-600 mt-1">{filtered.length} échéance{filtered.length > 1 ? 's' : ''} · {groupedByMonth.length} mois</p>
        </div>
        <button onClick={fetchPaiements} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </button>
      </div>

      {/* Onglets période */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(['ce_mois', 'ce_trimestre', 'cette_annee', 'tout'] as PeriodeFilter[]).map(p => (
          <button key={p} onClick={() => setPeriode(p)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              periode === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {periodeLabels[p]}
          </button>
        ))}
      </div>

      {/* Synthèse */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Attendu</p>
          <p className="text-xl font-bold text-gray-900">{synthese.attendu.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">{synthese.totalEcheances} échéance{synthese.totalEcheances > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Encaissé</p>
          <p className="text-xl font-bold text-emerald-600">{synthese.encaisse.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">{synthese.nbPayes} payée{synthese.nbPayes > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Impayés</p>
          <p className="text-xl font-bold text-red-600">{synthese.totalImpayes.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">{synthese.nbRetards} en retard</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Taux encaissement</p>
          <p className="text-xl font-bold text-blue-600">{synthese.taux}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: synthese.taux + '%' }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Reste à encaisser</p>
          <p className="text-xl font-bold text-amber-600">{(synthese.attendu - synthese.encaisse).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Recherche + options */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Rechercher par véhicule, réf TCA ou locataire..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input type="checkbox" checked={showTermines} onChange={(e) => setShowTermines(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm text-gray-700">Contrats terminés</span>
        </label>
      </div>

      {/* Tableau groupé par mois */}
      {groupedByMonth.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Banknote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Aucun paiement pour cette période</p>
          <p className="text-gray-500 text-sm">Changez la période ou cochez "Contrats terminés"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByMonth.map(([monthKey, monthPaiements]) => {
            const isExpanded = expandedMonths.has(monthKey);
            const monthAttendu = monthPaiements.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
            const monthEncaisse = monthPaiements.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
            const monthNbPayes = monthPaiements.filter(p => p.statut === 'paye').length;
            const monthNbRetards = monthPaiements.filter(p => p.statut === 'retard').length;
            const monthNbTotal = monthPaiements.length;

            return (
              <div key={monthKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* En-tête du mois */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleMonth(monthKey)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{formatMoisLabel(monthKey)}</h3>
                      <p className="text-xs text-gray-500">
                        {monthNbTotal} échéance{monthNbTotal > 1 ? 's' : ''}
                        {monthNbPayes > 0 && <span className="text-emerald-600"> · {monthNbPayes} payée{monthNbPayes > 1 ? 's' : ''}</span>}
                        {monthNbRetards > 0 && <span className="text-red-600"> · {monthNbRetards} en retard</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-gray-900">{monthAttendu.toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-emerald-600">{monthEncaisse.toLocaleString('fr-FR')} € encaissé</p>
                    </div>
                    {/* Barre de progression du mois */}
                    <div className="w-24 hidden md:block">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: monthAttendu > 0 ? Math.min(100, (monthEncaisse / monthAttendu) * 100) + '%' : '0%' }} />
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Détails du mois */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Véhicule</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Locataire</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Attendu</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Payé</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Statut</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthPaiements.map((p) => {
                          const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.impaye;
                          return (
                            <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="text-sm font-bold text-gray-900">{p.vehicule_immat}</div>
                                <div className="text-xs text-gray-500">{p.vehicule_marque} {p.vehicule_modele}</div>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-700">
                                {p.locataire_prenom} {p.locataire_nom}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-600">
                                {TYPE_LABELS[p.type_location || ''] || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-900">
                                {(p.montant_attendu_ttc || 0).toFixed(2)} €
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                {p.montant_paye && p.montant_paye > 0 ? (
                                  <span className={p.statut === 'paye' ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>
                                    {p.montant_paye.toFixed(2)} €
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">
                                {formatDate(p.date_paiement)}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {p.statut !== 'paye' && (
                                  <button onClick={() => handleOpenPointage(p)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 border border-emerald-300 rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors">
                                    <Check className="w-3 h-3" /> Pointer
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Sous-total du mois */}
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-700">
                            Total {formatMoisLabel(monthKey)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">{monthAttendu.toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-emerald-700">{monthEncaisse.toFixed(2)} €</td>
                          <td colSpan={3} className="px-4 py-2 text-sm text-right text-gray-500">
                            Reste : <strong className="text-amber-700">{(monthAttendu - monthEncaisse).toFixed(2)} €</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

{/* Modal de pointage */}
      {pointageId && paiementPointage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pointer le paiement</h3>
                <p className="text-sm text-gray-500">
                  {paiementPointage.vehicule_immat} · Éch. n°{paiementPointage.numero_echeance} · {formatMoisLabel(paiementPointage.mois?.slice(0, 7) || '')}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant attendu :</span>
                <span className="font-semibold">{(paiementPointage.montant_attendu_ttc || 0).toFixed(2)} € TTC</span>
              </div>
              {paiementPointage.montant_paye && paiementPointage.montant_paye > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Déjà encaissé :</span>
                  <span className="font-semibold text-emerald-700">{paiementPointage.montant_paye.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Locataire :</span>
                <span className="font-medium">{paiementPointage.locataire_prenom} {paiementPointage.locataire_nom}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant encaissé (€) *</label>
                <input type="number" step="0.01" value={pointageMontant} onChange={(e) => setPointageMontant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'encaissement *</label>
                <input type="date" value={pointageDate} onChange={(e) => setPointageDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
                <select value={pointageMode} onChange={(e) => setPointageMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- Sélectionner --</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="cb">Carte bancaire</option>
                  <option value="prelevement">Prélèvement automatique</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compte / RIB encaissé sur</label>
                <input type="text" value={pointageCompte} onChange={(e) => setPointageCompte(e.target.value)}
                  placeholder="Ex: Compte BNP TCA, CIC Pro..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence paiement</label>
                <input type="text" value={pointageReference} onChange={(e) => setPointageReference(e.target.value)}
                  placeholder="Ex: n° chèque, réf. virement..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input type="text" value={pointageNotes} onChange={(e) => setPointageNotes(e.target.value)}
                  placeholder="Ex: remarques particulières..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              {parseFloat(pointageMontant) > 0 && parseFloat(pointageMontant) < ((paiementPointage.montant_attendu_ttc || 0) - (paiementPointage.montant_paye || 0)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Paiement partiel — il restera {((paiementPointage.montant_attendu_ttc || 0) - (paiementPointage.montant_paye || 0) - parseFloat(pointageMontant)).toFixed(2)} € à encaisser
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setPointageId(null)} disabled={savingPointage}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleValiderPointage} disabled={savingPointage || !pointageMontant || !pointageMode}
                className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2">
                {savingPointage ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>) : (<><Check className="w-4 h-4" /> Valider le pointage</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}