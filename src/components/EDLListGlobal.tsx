import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Download, Loader2, Camera, Search, RefreshCw, Filter, X, Check, Eye, ImageIcon } from 'lucide-react';
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
  carrosserie_avant: boolean;
  carrosserie_arriere: boolean;
  carrosserie_gauche: boolean;
  carrosserie_droite: boolean;
  vitres: boolean;
  retroviseurs: boolean;
  pneus: boolean;
  interieur_siege: boolean;
  interieur_tableau_bord: boolean;
  cric_triangle_gilet: boolean;
}

interface PhotoRecord {
  id: string;
  angle: string;
  photo_path: string;
  signedUrl?: string;
}

const ANGLE_LABELS: Record<string, string> = {
  avant: 'Avant',
  arriere: 'Arrière',
  gauche: 'Côté gauche',
  droite: 'Côté droit',
  compteur: 'Compteur',
  interieur: 'Intérieur',
  coffre: 'Coffre',
  libre: 'Photo libre',
};

export function EDLListGlobal() {
  const [edls, setEdls] = useState<EDLGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, PhotoRecord[]>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<string | null>(null);

  useEffect(() => { fetchEDLs(); }, []);

  const fetchEDLs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('etat_des_lieux')
        .select(`
          id, type_edl, date_edl, kilometrage, statut, pdf_path, created_at, observations,
          carrosserie_avant, carrosserie_arriere, carrosserie_gauche, carrosserie_droite,
          vitres, retroviseurs, pneus, interieur_siege, interieur_tableau_bord, cric_triangle_gilet,
          vehicule:vehicule_id(immatriculation, marque, modele, ref_tca),
          profil:profil_id(nom, prenom)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const edlsFormatted: EDLGlobal[] = [];
      for (const edl of data || []) {
        const { count } = await supabase
          .from('etat_des_lieux_photos')
          .select('id', { count: 'exact', head: true })
          .eq('edl_id', edl.id);

        edlsFormatted.push({
          id: edl.id, type_edl: edl.type_edl, date_edl: edl.date_edl, kilometrage: edl.kilometrage,
          statut: edl.statut, pdf_path: edl.pdf_path, created_at: edl.created_at, observations: edl.observations,
          vehicule_immat: (edl.vehicule as any)?.immatriculation || null,
          vehicule_marque: (edl.vehicule as any)?.marque || null,
          vehicule_modele: (edl.vehicule as any)?.modele || null,
          vehicule_ref_tca: (edl.vehicule as any)?.ref_tca || null,
          conducteur_nom: (edl.profil as any)?.nom || null,
          conducteur_prenom: (edl.profil as any)?.prenom || null,
          nb_photos: count || 0,
          carrosserie_avant: edl.carrosserie_avant, carrosserie_arriere: edl.carrosserie_arriere,
          carrosserie_gauche: edl.carrosserie_gauche, carrosserie_droite: edl.carrosserie_droite,
          vitres: edl.vitres, retroviseurs: edl.retroviseurs, pneus: edl.pneus,
          interieur_siege: edl.interieur_siege, interieur_tableau_bord: edl.interieur_tableau_bord,
          cric_triangle_gilet: edl.cric_triangle_gilet,
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
        e.vehicule_immat?.toLowerCase().includes(q) || e.vehicule_ref_tca?.toLowerCase().includes(q) ||
        e.vehicule_marque?.toLowerCase().includes(q) || e.conducteur_nom?.toLowerCase().includes(q) ||
        e.conducteur_prenom?.toLowerCase().includes(q)
      );
    }
    if (filterType) result = result.filter(e => e.type_edl === filterType);
    return result;
  }, [edls, search, filterType]);

  const handleToggleExpand = async (edlId: string) => {
    if (expandedId === edlId) { setExpandedId(null); return; }
    setExpandedId(edlId);

    if (!photos[edlId]) {
      setLoadingPhotos(edlId);
      try {
        const { data, error } = await supabase
          .from('etat_des_lieux_photos')
          .select('id, angle, photo_path')
          .eq('edl_id', edlId)
          .order('created_at', { ascending: true });
        if (error) throw error;

        const photosWithUrls: PhotoRecord[] = [];
        for (const photo of data || []) {
          const { data: signedData } = await supabase.storage
            .from('edl-photos')
            .createSignedUrl(photo.photo_path, 3600);
          photosWithUrls.push({ id: photo.id, angle: photo.angle, photo_path: photo.photo_path, signedUrl: signedData?.signedUrl || undefined });
        }
        setPhotos(prev => ({ ...prev, [edlId]: photosWithUrls }));
      } catch (err) {
        console.error('[EDLListGlobal] Erreur photos:', err);
        setPhotos(prev => ({ ...prev, [edlId]: [] }));
      } finally {
        setLoadingPhotos(null);
      }
    }
  };

  const handleDownloadPdf = async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage.from('edl-documents').createSignedUrl(pdfPath, 3600);
      if (error || !data?.signedUrl) { alert('PDF non disponible'); return; }
      window.open(data.signedUrl, '_blank');
    } catch (e) { console.error('Erreur PDF:', e); }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const getEquipementsSummary = (edl: EDLGlobal) => {
    const items = [edl.carrosserie_avant, edl.carrosserie_arriere, edl.carrosserie_gauche, edl.carrosserie_droite, edl.vitres, edl.retroviseurs, edl.pneus, edl.interieur_siege, edl.interieur_tableau_bord, edl.cric_triangle_gilet];
    return `${items.filter(Boolean).length}/10`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">États des lieux</h1>
          <p className="text-gray-600 mt-1">{filteredEdls.length} EDL au total</p>
        </div>
        <button onClick={fetchEDLs} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Rechercher par immatriculation, réf TCA, conducteur..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center px-4 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} hover:bg-blue-50 transition-colors font-medium`}>
            <Filter className="w-5 h-5 mr-2" /> Filtres
          </button>
        </div>
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'EDL</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Tous</option>
                <option value="sortie">📤 Sortie</option>
                <option value="entree">📥 Retour</option>
              </select>
            </div>
            {(filterType || search) && (
              <button onClick={() => { setFilterType(''); setSearch(''); }} className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 mr-1" /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {filteredEdls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Aucun état des lieux trouvé</p>
          <p className="text-gray-500">{search || filterType ? 'Essayez de modifier vos critères' : 'Les EDL sont créés lors des attributions et restitutions'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEdls.map((edl) => {
            const isExpanded = expandedId === edl.id;
            const edlPhotos = photos[edl.id] || [];
            const isLoadingThisPhotos = loadingPhotos === edl.id;

            return (
              <div key={edl.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Ligne résumé */}
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleToggleExpand(edl.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {edl.type_edl === 'sortie' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">📤 Sortie</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">📥 Retour</span>
                      )}
                      <span className="text-sm font-bold text-gray-900">{edl.vehicule_immat}</span>
                      <span className="text-xs text-gray-500">{edl.vehicule_marque} {edl.vehicule_modele}</span>
                      {edl.vehicule_ref_tca && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">TCA {edl.vehicule_ref_tca}</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(edl.created_at)} · {edl.conducteur_prenom} {edl.conducteur_nom} · {edl.kilometrage?.toLocaleString() || '—'} km · Équip. {getEquipementsSummary(edl)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {edl.nb_photos > 0 && <span className="flex items-center gap-1 text-xs text-gray-500"><Camera className="w-3 h-3" /> {edl.nb_photos}</span>}
                    {edl.pdf_path && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownloadPdf(edl.pdf_path!); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <Eye className={`w-4 h-4 ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </div>

                {/* Détails + Photos */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-gray-500">Type :</span> <strong>{edl.type_edl === 'sortie' ? 'Sortie' : 'Retour'}</strong></div>
                      <div><span className="text-gray-500">Statut :</span> <strong>{edl.statut}</strong></div>
                      <div><span className="text-gray-500">Km :</span> <strong>{edl.kilometrage?.toLocaleString() || '—'}</strong></div>
                      <div><span className="text-gray-500">Photos :</span> <strong>{edl.nb_photos}</strong></div>
                    </div>

                    {/* Équipements */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Équipements</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                        {[
                          { label: 'Carrosserie avant', ok: edl.carrosserie_avant },
                          { label: 'Carrosserie arrière', ok: edl.carrosserie_arriere },
                          { label: 'Carrosserie gauche', ok: edl.carrosserie_gauche },
                          { label: 'Carrosserie droite', ok: edl.carrosserie_droite },
                          { label: 'Vitres', ok: edl.vitres },
                          { label: 'Rétroviseurs', ok: edl.retroviseurs },
                          { label: 'Pneus', ok: edl.pneus },
                          { label: 'Intérieur — Sièges', ok: edl.interieur_siege },
                          { label: 'Intérieur — Tableau de bord', ok: edl.interieur_tableau_bord },
                          { label: 'Cric / Triangle / Gilet', ok: edl.cric_triangle_gilet },
                        ].map((eq) => (
                          <div key={eq.label} className="flex items-center gap-1">
                            {eq.ok ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-red-500" />}
                            <span className={eq.ok ? 'text-gray-700' : 'text-red-600'}>{eq.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {edl.observations && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observations</p>
                        <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{edl.observations}</p>
                      </div>
                    )}

                    {/* Galerie photos */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        <Camera className="w-3 h-3 inline mr-1" /> Photos ({edl.nb_photos})
                      </p>
                      {isLoadingThisPhotos ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</div>
                      ) : edlPhotos.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><ImageIcon className="w-4 h-4" /> Aucune photo</div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {edlPhotos.map((photo) => (
                            <div key={photo.id} className="relative group">
                              {photo.signedUrl ? (
                                <a href={photo.signedUrl} target="_blank" rel="noopener noreferrer" title="Ouvrir en plein écran">
                                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
                                    <img src={photo.signedUrl} alt={ANGLE_LABELS[photo.angle] || photo.angle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  </div>
                                  <p className="text-xs text-gray-500 text-center mt-1 truncate">{ANGLE_LABELS[photo.angle] || photo.angle}</p>
                                </a>
                              ) : (
                                <div className="aspect-square rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}