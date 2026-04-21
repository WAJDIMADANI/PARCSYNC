import { useState, useEffect } from 'react';
import { ClipboardList, Download, Loader2, Camera, Check, X, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EDLRecord {
  id: string;
  type_edl: string;
  date_edl: string;
  kilometrage: number | null;
  statut: string;
  pdf_path: string | null;
  created_at: string;
  observations: string | null;
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

interface Props {
  vehicleId: string;
}

export function EDLListVehicle({ vehicleId }: Props) {
  const [edls, setEdls] = useState<EDLRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchEDLs();
  }, [vehicleId]);

  const fetchEDLs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('etat_des_lieux')
        .select(`
          id, type_edl, date_edl, kilometrage, statut, pdf_path, created_at, observations,
          carrosserie_avant, carrosserie_arriere, carrosserie_gauche, carrosserie_droite,
          vitres, retroviseurs, pneus, interieur_siege, interieur_tableau_bord, cric_triangle_gilet,
          profil:profil_id(nom, prenom)
        `)
        .eq('vehicule_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pour chaque EDL, compter les photos
      const edlsWithPhotos: EDLRecord[] = [];
      for (const edl of data || []) {
        const { count } = await supabase
          .from('etat_des_lieux_photos')
          .select('id', { count: 'exact', head: true })
          .eq('edl_id', edl.id);

        edlsWithPhotos.push({
          id: edl.id,
          type_edl: edl.type_edl,
          date_edl: edl.date_edl,
          kilometrage: edl.kilometrage,
          statut: edl.statut,
          pdf_path: edl.pdf_path,
          created_at: edl.created_at,
          observations: edl.observations,
          conducteur_nom: (edl.profil as any)?.nom || null,
          conducteur_prenom: (edl.profil as any)?.prenom || null,
          nb_photos: count || 0,
          carrosserie_avant: edl.carrosserie_avant,
          carrosserie_arriere: edl.carrosserie_arriere,
          carrosserie_gauche: edl.carrosserie_gauche,
          carrosserie_droite: edl.carrosserie_droite,
          vitres: edl.vitres,
          retroviseurs: edl.retroviseurs,
          pneus: edl.pneus,
          interieur_siege: edl.interieur_siege,
          interieur_tableau_bord: edl.interieur_tableau_bord,
          cric_triangle_gilet: edl.cric_triangle_gilet,
        });
      }

      setEdls(edlsWithPhotos);
    } catch (err) {
      console.error('[EDLListVehicle] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

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
      alert('Erreur lors du téléchargement');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'sortie') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">📤 Sortie</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">📥 Retour</span>;
  };

  const getEquipementsSummary = (edl: EDLRecord) => {
    const items = [
      edl.carrosserie_avant, edl.carrosserie_arriere, edl.carrosserie_gauche, edl.carrosserie_droite,
      edl.vitres, edl.retroviseurs, edl.pneus, edl.interieur_siege, edl.interieur_tableau_bord, edl.cric_triangle_gilet
    ];
    const ok = items.filter(Boolean).length;
    return `${ok}/10 conformes`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (edls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Aucun état des lieux enregistré</p>
        <p className="text-gray-400 text-sm mt-1">Les EDL sont créés automatiquement lors des attributions et restitutions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{edls.length} état{edls.length > 1 ? 's' : ''} des lieux</p>
      {edls.map((edl) => {
        const isExpanded = expandedId === edl.id;
        return (
          <div key={edl.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Ligne résumé */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : edl.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(edl.type_edl)}
                  <span className="text-sm font-medium text-gray-900">
                    {edl.conducteur_prenom} {edl.conducteur_nom}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(edl.created_at)} · {edl.kilometrage ? `${edl.kilometrage.toLocaleString()} km` : '—'} · {getEquipementsSummary(edl)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {edl.nb_photos > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Camera className="w-3 h-3" /> {edl.nb_photos}
                  </span>
                )}
                {edl.pdf_path && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadPdf(edl.pdf_path!); }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Télécharger le PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <Eye className={`w-4 h-4 transition-transform ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
            </div>

            {/* Détails (accordéon) */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Type :</span> <strong>{edl.type_edl === 'sortie' ? 'Sortie' : 'Retour'}</strong></div>
                  <div><span className="text-gray-500">Statut :</span> <strong>{edl.statut}</strong></div>
                  <div><span className="text-gray-500">Kilométrage :</span> <strong>{edl.kilometrage?.toLocaleString() || '—'} km</strong></div>
                  <div><span className="text-gray-500">Photos :</span> <strong>{edl.nb_photos}</strong></div>
                </div>

                {/* Équipements détaillés */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Équipements</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}