import { useState, useEffect, useMemo } from 'react';
import { Banknote, Search, RefreshCw, Filter, X, Check, Loader2, AlertTriangle, Calendar, Car, User } from 'lucide-react';
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
  locataire_nom: string | null;
  locataire_prenom: string | null;
  type_location: string | null;
}

const STATUT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  paye:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Payé' },
  impaye:  { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Impayé' },
  partiel: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Partiel' },
  retard:  { bg: 'bg-red-100',     text: 'text-red-700',     label: 'En retard' },
};

const TYPE_LABELS: Record<string, string> = {
  location_pure: 'Location pure',
  location_vente_particulier: 'Loc-vente particulier',
  location_vente_societe: 'Loc-vente société',
  loa: 'LOA',
};

export function PaiementsManager() {
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal pointage
  const [pointageId, setPointageId] = useState<string | null>(null);
  const [pointageMontant, setPointageMontant] = useState('');
  const [pointageDate, setPointageDate] = useState(new Date().toISOString().split('T')[0]);
  const [pointageNotes, setPointageNotes] = useState('');
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
            type_location,
            vehicule:vehicule_id(immatriculation, marque, modele),
            locataire:locataire_id(nom, prenom)
          )
        `)
        .order('mois', { ascending: true });

      if (error) throw error;

      const rows: PaiementRow[] = (data || []).map((p: any) => ({
        id: p.id,
        location_id: p.location_id,
        numero_echeance: p.numero_echeance,
        mois: p.mois,
        montant_attendu_ht: p.montant_attendu_ht,
        montant_attendu_ttc: p.montant_attendu_ttc,
        montant_paye: p.montant_paye,
        date_paiement: p.date_paiement,
        statut: p.statut,
        notes: p.notes,
        vehicule_immat: p.location?.vehicule?.immatriculation || null,
        vehicule_marque: p.location?.vehicule?.marque || null,
        vehicule_modele: p.location?.vehicule?.modele || null,
        locataire_nom: p.location?.locataire?.nom || null,
        locataire_prenom: p.location?.locataire?.prenom || null,
        type_location: p.location?.type_location || null,
      }));

      // Auto-détection retards : impayé + date dépassée
      const today = new Date().toISOString().split('T')[0];
      const updated = rows.map(r => {
        if (r.statut === 'impaye' && r.mois < today) {
          return { ...r, statut: 'retard' };
        }
        return r;
      });

      setPaiements(updated);
    } catch (err) {
      console.error('[PaiementsManager] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage
  const filtered = useMemo(() => {
    let result = [...paiements];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.vehicule_immat?.toLowerCase().includes(q) ||
        p.locataire_nom?.toLowerCase().includes(q) ||
        p.locataire_prenom?.toLowerCase().includes(q)
      );
    }

    if (filterStatut) {
      result = result.filter(p => p.statut === filterStatut);
    }

    if (filterMois) {
      result = result.filter(p => p.mois?.startsWith(filterMois));
    }

    return result;
  }, [paiements, search, filterStatut, filterMois]);

  // Synthèse
  const synthese = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const ceMois = paiements.filter(p => p.mois?.startsWith(currentMonth));

    const attenduMois = ceMois.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const encaisseMois = ceMois.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const nbRetards = paiements.filter(p => p.statut === 'retard').length;
    const totalImpayes = paiements.filter(p => p.statut === 'retard' || p.statut === 'impaye').reduce((sum, p) => sum + ((p.montant_attendu_ttc || 0) - (p.montant_paye || 0)), 0);

    return { attenduMois, encaisseMois, nbRetards, totalImpayes };
  }, [paiements]);

  // Pointage
  const handleOpenPointage = (p: PaiementRow) => {
    setPointageId(p.id);
    setPointageMontant(String(p.montant_attendu_ttc || 0));
    setPointageDate(new Date().toISOString().split('T')[0]);
    setPointageNotes('');
  };

  const handleValiderPointage = async () => {
    if (!pointageId) return;
    setSavingPointage(true);
    try {
      const montant = parseFloat(pointageMontant) || 0;
      const paiement = paiements.find(p => p.id === pointageId);
      const attendu = paiement?.montant_attendu_ttc || 0;

      let newStatut = 'paye';
      if (montant <= 0) newStatut = 'impaye';
      else if (montant < attendu) newStatut = 'partiel';

      const { error } = await supabase
        .from('paiements_location')
        .update({
          montant_paye: montant,
          date_paiement: pointageDate,
          statut: newStatut,
          notes: pointageNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pointageId);

      if (error) throw error;

      // Mettre à jour le compteur dans locations
      if (paiement) {
        const { data: allPaiements } = await supabase
          .from('paiements_location')
          .select('statut, montant_paye')
          .eq('location_id', paiement.location_id);

        if (allPaiements) {
          const nbPayees = allPaiements.filter(p => p.statut === 'paye').length + (newStatut === 'paye' ? 0 : 0);
          const totalPaye = allPaiements.reduce((sum, p) => sum + (p.montant_paye || 0), 0) - (paiement.montant_paye || 0) + montant;

          const { data: locationData } = await supabase
            .from('locations')
            .select('montant_total_ht, montant_total_ttc')
            .eq('id', paiement.location_id)
            .single();

          const payeesCount = allPaiements.filter(p => p.id === pointageId ? newStatut === 'paye' : p.statut === 'paye').length;

          await supabase
            .from('locations')
            .update({
              mensualites_payees: payeesCount,
              reste_a_payer_ttc: (locationData?.montant_total_ttc || 0) - totalPaye,
              reste_a_payer_ht: (locationData?.montant_total_ht || 0) - (totalPaye / 1.2),
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

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
  };

  const formatMois = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const paiementPointage = paiements.find(p => p.id === pointageId);

  return (
    <div>
      {/* Synthèse */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Attendu ce mois</p>
          <p className="text-2xl font-bold text-gray-900">{synthese.attenduMois.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Encaissé ce mois</p>
          <p className="text-2xl font-bold text-emerald-600">{synthese.encaisseMois.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total impayés</p>
          <p className="text-2xl font-bold text-red-600">{synthese.totalImpayes.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Retards</p>
          <p className="text-2xl font-bold text-amber-600">{synthese.nbRetards}</p>
        </div>
      </div>

      {/* Barre recherche + filtres */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Rechercher par véhicule ou locataire..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center px-4 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} font-medium`}>
            <Filter className="w-5 h-5 mr-2" /> Filtres
          </button>
          <button onClick={fetchPaiements} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Tous</option>
                <option value="paye">Payé</option>
                <option value="impaye">Impayé</option>
                <option value="partiel">Partiel</option>
                <option value="retard">En retard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <input type="month" value={filterMois} onChange={(e) => setFilterMois(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            {(filterStatut || filterMois || search) && (
              <button onClick={() => { setFilterStatut(''); setFilterMois(''); setSearch(''); }} className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 mr-1" /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Banknote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Aucun paiement trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Échéance</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Véhicule</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Locataire</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Attendu</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Payé</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Date paiement</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Statut</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.impaye;
                  return (
                    <tr key={p.id} className={`hover:bg-blue-50 transition-colors border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 text-sm border-r border-gray-200">
                        <div className="font-medium text-gray-900">{formatMois(p.mois)}</div>
                        <div className="text-xs text-gray-500">Éch. n°{p.numero_echeance}</div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-sm font-bold text-gray-900">{p.vehicule_immat || '—'}</div>
                        <div className="text-xs text-gray-500">{p.vehicule_marque} {p.vehicule_modele}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
                        {p.locataire_prenom} {p.locataire_nom}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 border-r border-gray-200">
                        {TYPE_LABELS[p.type_location || ''] || p.type_location}
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-gray-900 border-r border-gray-200">
                        {(p.montant_attendu_ttc || 0).toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-sm text-right border-r border-gray-200">
                        {p.statut === 'paye' ? (
                          <span className="font-medium text-emerald-700">{(p.montant_paye || 0).toFixed(2)} €</span>
                        ) : p.statut === 'partiel' ? (
                          <span className="font-medium text-amber-700">{(p.montant_paye || 0).toFixed(2)} €</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
                        {formatDate(p.date_paiement)}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.statut !== 'paye' && (
                          <button
                            onClick={() => handleOpenPointage(p)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Pointer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de pointage */}
      {pointageId && paiementPointage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pointer le paiement</h3>
                <p className="text-sm text-gray-500">
                  {paiementPointage.vehicule_immat} · Éch. n°{paiementPointage.numero_echeance} · {formatMois(paiementPointage.mois)}
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
                  <span className="text-gray-500">Déjà payé :</span>
                  <span className="font-semibold text-amber-700">{paiementPointage.montant_paye.toFixed(2)} €</span>
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
                <input type="number" step="0.01" value={pointageMontant} onChange={(e) => setPointageMontant(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'encaissement *</label>
                <input type="date" value={pointageDate} onChange={(e) => setPointageDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input type="text" value={pointageNotes} onChange={(e) => setPointageNotes(e.target.value)} placeholder="Ex: virement reçu, chèque n°..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>

              {parseFloat(pointageMontant) > 0 && parseFloat(pointageMontant) < (paiementPointage.montant_attendu_ttc || 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-700">Paiement partiel — il restera {((paiementPointage.montant_attendu_ttc || 0) - parseFloat(pointageMontant)).toFixed(2)} € à encaisser</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setPointageId(null)} disabled={savingPointage} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleValiderPointage} disabled={savingPointage || !pointageMontant} className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2">
                {savingPointage ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>) : (<><Check className="w-4 h-4" /> Valider le pointage</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}