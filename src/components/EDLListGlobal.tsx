import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Download, Loader2, Camera, Search, RefreshCw, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EDLGlobal {
  id: string;
  type_edl: string;
  date_edl: string;
  kilometrage: number | null;
  statut: string;
  pdf_path: string | null;
  created_at: string;
  observations: string | null;
  vehicule_immat: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_ref_tca: string | null;
  conducteur_nom: string | null;
  conducteur_prenom: string | null;
  nb_photos: number;
}

export function EDLListGlobal() {
  const [edls, setEdls] = useState<EDLGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEDLs();
  }, []);

  const fetchEDLs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('etat_des_lieux')
        .select(`
          id, type_edl, date_edl, kilometrage, statut, pdf_path, created_at, observations,
          vehicule:vehicule_id(immatriculation, marque, modele, ref_tca),
          profil:profil_id(nom, prenom)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Compter les photos pour chaque EDL
      const edlsFormatted: EDLGlobal[] = [];
      for (const edl of data || []) {
        const { count } = await supabase
          .from('etat_des_lieux_photos')
          .select('id', { count: 'exact', head: true })
          .eq('edl_id', edl.id);

        edlsFormatted.push({
          id: edl.id,
          type_edl: edl.type_edl,
          date_edl: edl.date_edl,
          kilometrage: edl.kilometrage,
          statut: edl.statut,
          pdf_path: edl.pdf_path,
          created_at: edl.created_at,
          observations: edl.observations,
          vehicule_immat: (edl.vehicule as any)?.immatriculation || null,
          vehicule_marque: (edl.vehicule as any)?.marque || null,
          vehicule_modele: (edl.vehicule as any)?.modele || null,
          vehicule_ref_tca: (edl.vehicule as any)?.ref_tca || null,
          conducteur_nom: (edl.profil as any)?.nom || null,
          conducteur_prenom: (edl.profil as any)?.prenom || null,
          nb_photos: count || 0,
        });
      }

      setEdls(edlsFormatted);
    } catch (err) {
      console.error('[EDLListGlobal] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEdls = useMemo(() => {
    let result = [...edls];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.vehicule_immat?.toLowerCase().includes(q) ||
        e.vehicule_ref_tca?.toLowerCase().includes(q) ||
        e.vehicule_marque?.toLowerCase().includes(q) ||
        e.conducteur_nom?.toLowerCase().includes(q) ||
        e.conducteur_prenom?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      result = result.filter(e => e.type_edl === filterType);
    }

    return result;
  }, [edls, search, filterType]);

  const handleDownloadPdf = async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('edl-documents')
        .createSignedUrl(pdfPath, 3600);

      if (error || !data?.signedUrl) {
        alert('PDF non disponible');
        return;
      }
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      console.error('Erreur téléchargement PDF EDL:', e);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">États des lieux</h1>
          <p className="text-gray-600 mt-1">{filteredEdls.length} EDL au total</p>
        </div>
        <button
          onClick={fetchEDLs}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </button>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par immatriculation, réf TCA, conducteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} hover:bg-blue-50 transition-colors font-medium`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'EDL</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Tous</option>
                <option value="sortie">📤 Sortie</option>
                <option value="entree">📥 Retour</option>
              </select>
            </div>
            {(filterType || search) && (
              <button
                onClick={() => { setFilterType(''); setSearch(''); }}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 mr-1" /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      {filteredEdls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Aucun état des lieux trouvé</p>
          <p className="text-gray-500">
            {search || filterType ? 'Essayez de modifier vos critères de recherche' : 'Les EDL sont créés automatiquement lors des attributions et restitutions'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Véhicule</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Conducteur</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Km</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">Photos</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEdls.map((edl, idx) => (
                  <tr key={edl.id} className={`hover:bg-blue-50 transition-colors border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                      {formatDate(edl.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      {edl.type_edl === 'sortie' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">📤 Sortie</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">📥 Retour</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{edl.vehicule_immat || '—'}</div>
                      <div className="text-xs text-gray-500">{edl.vehicule_marque} {edl.vehicule_modele}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
                      {edl.conducteur_prenom} {edl.conducteur_nom}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
                      {edl.kilometrage?.toLocaleString() || '—'}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      {edl.nb_photos > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Camera className="w-3 h-3" /> {edl.nb_photos}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {edl.pdf_path ? (
                        <button
                          onClick={() => handleDownloadPdf(edl.pdf_path!)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}