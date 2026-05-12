import { useState, useMemo } from 'react';
import {
  Bell, Search, RefreshCw, AlertTriangle, Clock, CheckCircle2,
  FileText, Banknote, MapPin, ChevronLeft, ChevronRight, ExternalLink,
  X, Filter
} from 'lucide-react';
import { useAlertesParc, AlerteParc } from '../hooks/useAlertesParc';

// ========================================================================
// TYPES & CONSTANTES
// ========================================================================

type CategorieFilter = 'all' | 'urgent' | 'paiement' | 'location' | 'document';
type SortBy = 'urgence' | 'date_asc' | 'date_desc';

interface Props {
  onNavigate?: (view: string, params?: any) => void;
}

// Priorité d'urgence : plus le chiffre est petit, plus c'est urgent
const URGENCE_ORDER: Record<string, number> = {
  retard: 0,
  aujourdhui: 1,
  doc_expire: 2,     // documents déjà expirés = urgent
  j3: 3,
  fin_j7: 4,
  doc_bientot: 5,
  fin_j30: 6,
};

const PAGE_SIZE = 50;

// ========================================================================
// COMPOSANT PRINCIPAL
// ========================================================================

export function AlertesParcPage({ onNavigate }: Props) {
  const { loading, alertes, refresh } = useAlertesParc('all');

  const [categorie, setCategorie] = useState<CategorieFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('urgence');
  const [currentPage, setCurrentPage] = useState(1);

  // ----------------------------------------------------------------------
  // KPIs (6 tuiles)
  // ----------------------------------------------------------------------

  const kpis = useMemo(() => {
    const total = alertes.length;
    const urgent = alertes.filter(a =>
      a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire'
    ).length;
    const paiement = alertes.filter(a => a.typeCategorie === 'paiement').length;
    const location = alertes.filter(a => a.typeCategorie === 'location').length;
    const document = alertes.filter(a => a.typeCategorie === 'document').length;
    return { total, urgent, paiement, location, document };
  }, [alertes]);

  // ----------------------------------------------------------------------
  // FILTRAGE + TRI
  // ----------------------------------------------------------------------

  const filteredAlertes = useMemo(() => {
    let result = [...alertes];

    // Filtrage par catégorie
    if (categorie === 'urgent') {
      result = result.filter(a =>
        a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire'
      );
    } else if (categorie === 'paiement') {
      result = result.filter(a => a.typeCategorie === 'paiement');
    } else if (categorie === 'location') {
      result = result.filter(a => a.typeCategorie === 'location');
    } else if (categorie === 'document') {
      result = result.filter(a => a.typeCategorie === 'document');
    }

    // Recherche texte
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.vehicule_immat?.toLowerCase().includes(q) ||
        a.vehicule_marque?.toLowerCase().includes(q) ||
        a.vehicule_modele?.toLowerCase().includes(q) ||
        a.locataire_nom?.toLowerCase().includes(q) ||
        a.locataire_prenom?.toLowerCase().includes(q) ||
        a.reference_contrat?.toLowerCase().includes(q) ||
        a.document_type_label?.toLowerCase().includes(q)
      );
    }

    // Tri
    if (sortBy === 'urgence') {
      result.sort((a, b) => {
        const ua = URGENCE_ORDER[a.type] ?? 99;
        const ub = URGENCE_ORDER[b.type] ?? 99;
        if (ua !== ub) return ua - ub;
        // À urgence égale : plus ancien d'abord pour les retards/expirés, plus proche d'abord pour le futur
        if (a.joursEcart < 0 && b.joursEcart < 0) return a.joursEcart - b.joursEcart;
        return a.joursEcart - b.joursEcart;
      });
    } else if (sortBy === 'date_asc') {
      result.sort((a, b) => a.date_alerte.localeCompare(b.date_alerte));
    } else if (sortBy === 'date_desc') {
      result.sort((a, b) => b.date_alerte.localeCompare(a.date_alerte));
    }

    return result;
  }, [alertes, categorie, search, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAlertes.length / PAGE_SIZE));
  const paginatedAlertes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAlertes.slice(start, start + PAGE_SIZE);
  }, [filteredAlertes, currentPage]);

  // Reset page si filtre change
  useMemo(() => { setCurrentPage(1); }, [categorie, search, sortBy]);

  // ----------------------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------------------

  const handleVoirAlerte = (alerte: AlerteParc) => {
    if (!onNavigate) return;
    if (alerte.typeCategorie === 'paiement') {
      onNavigate('parc/paiements', { focus_location_id: alerte.location_id });
    } else if (alerte.typeCategorie === 'location') {
      onNavigate('parc/locations', { focus_location_id: alerte.location_id });
    } else if (alerte.typeCategorie === 'document' && alerte.vehicle_id) {
      onNavigate('parc/vehicules', { vehicleId: alerte.vehicle_id });
    }
  };

  // ----------------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------------

  const formatDateShort = (d: string | null) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  const getUrgenceConfig = (alerte: AlerteParc) => {
    const { type } = alerte;
    if (type === 'retard') return { bg: 'bg-red-100', text: 'text-red-700', label: 'RETARD', icon: AlertTriangle };
    if (type === 'aujourdhui') return { bg: 'bg-amber-100', text: 'text-amber-700', label: "AUJOURD'HUI", icon: Clock };
    if (type === 'j3') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'J-3', icon: Clock };
    if (type === 'fin_j7') return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'FIN J-7', icon: Clock };
    if (type === 'fin_j30') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'FIN J-30', icon: Clock };
    if (type === 'doc_expire') return { bg: 'bg-red-100', text: 'text-red-700', label: 'EXPIRÉ', icon: AlertTriangle };
    if (type === 'doc_bientot') return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'EXPIRE BIENTÔT', icon: Clock };
    return { bg: 'bg-gray-100', text: 'text-gray-700', label: type, icon: Clock };
  };

  const getCategorieIcon = (typeCategorie: 'paiement' | 'location' | 'document') => {
    if (typeCategorie === 'paiement') return <Banknote className="w-3 h-3 text-emerald-600" />;
    if (typeCategorie === 'location') return <MapPin className="w-3 h-3 text-blue-600" />;
    return <FileText className="w-3 h-3 text-purple-600" />;
  };

  const getCategorieLabel = (alerte: AlerteParc) => {
    if (alerte.typeCategorie === 'paiement') return 'Paiement';
    if (alerte.typeCategorie === 'location') return 'Fin location';
    if (alerte.typeCategorie === 'document') return alerte.document_type_label || 'Document';
    return '—';
  };

  const getDetailText = (alerte: AlerteParc) => {
    if (alerte.typeCategorie === 'paiement') {
      const montant = alerte.montant?.toFixed(2).replace('.', ',') || '0';
      if (alerte.type === 'retard') {
        const j = Math.abs(alerte.joursEcart);
        return `${montant} € en retard de ${j} jour${j > 1 ? 's' : ''}`;
      }
      if (alerte.type === 'aujourdhui') return `${montant} € à pointer aujourd'hui`;
      if (alerte.type === 'j3') return `${montant} € à venir dans 3 jours`;
    }
    if (alerte.typeCategorie === 'location') {
      if (alerte.type === 'fin_j7') return `Fin de location dans ${alerte.joursEcart} jour${alerte.joursEcart > 1 ? 's' : ''} · restitution`;
      if (alerte.type === 'fin_j30') return `Fin de location dans ${alerte.joursEcart} jours · renouvellement`;
    }
    if (alerte.typeCategorie === 'document') {
      if (alerte.type === 'doc_expire') {
        const j = Math.abs(alerte.joursEcart);
        return `Expiré depuis ${j} jour${j > 1 ? 's' : ''}`;
      }
      if (alerte.type === 'doc_bientot') return `Expire dans ${alerte.joursEcart} jour${alerte.joursEcart > 1 ? 's' : ''}`;
    }
    return '—';
  };

  // ----------------------------------------------------------------------
  // RENDU
  // ----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Centre d'alertes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {alertes.length} alerte{alertes.length > 1 ? 's' : ''} active{alertes.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={refresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* KPIs (5 tuiles) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Kpi label="Total" value={String(kpis.total)} icon={Bell} />
        <Kpi label="Urgent" value={String(kpis.urgent)} icon={AlertTriangle} color="red" outline={kpis.urgent > 0} />
        <Kpi label="Paiements" value={String(kpis.paiement)} icon={Banknote} color="emerald" />
        <Kpi label="Locations" value={String(kpis.location)} icon={MapPin} color="blue" />
        <Kpi label="Documents" value={String(kpis.document)} icon={FileText} color="purple" />
      </div>

      {/* FILTRES PAR CATÉGORIE + RECHERCHE */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="inline-flex gap-0.5 bg-white border border-gray-200 rounded-md p-0.5">
          {([
            { key: 'all', label: `Tout (${kpis.total})` },
            { key: 'urgent', label: `Urgent (${kpis.urgent})`, color: 'red' },
            { key: 'paiement', label: `Paiements (${kpis.paiement})`, color: 'emerald' },
            { key: 'location', label: `Locations (${kpis.location})`, color: 'blue' },
            { key: 'document', label: `Documents (${kpis.document})`, color: 'purple' },
          ] as { key: CategorieFilter; label: string; color?: string }[]).map(f => (
            <button key={f.key} onClick={() => setCategorie(f.key)}
              className={'px-3 py-1 text-xs font-medium rounded ' +
                (categorie === f.key ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900')
              }>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Rechercher par véhicule, locataire, type..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white">
          <option value="urgence">Tri : Urgence</option>
          <option value="date_asc">Tri : Date plus ancienne</option>
          <option value="date_desc">Tri : Date plus récente</option>
        </select>
      </div>

      {/* TABLEAU */}
      {paginatedAlertes.length === 0 ? (
        <div className="bg-white rounded-md border border-gray-200 p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium mb-1">Aucune alerte</p>
          <p className="text-xs text-gray-500">
            {alertes.length === 0
              ? 'Tout est à jour, profitez-en !'
              : 'Changez la catégorie ou la recherche'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Urgence</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Détail</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAlertes.map(a => {
                const uc = getUrgenceConfig(a);
                const isUrgent = a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire';
                const bgRow = isUrgent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50';
                return (
                  <tr key={a.dismissKey} className={'cursor-pointer transition-colors ' + bgRow}
                      onClick={() => handleVoirAlerte(a)}>
                    {/* Urgence */}
                    <td className="px-3 py-2">
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ' + uc.bg + ' ' + uc.text}>
                        <uc.icon className="w-2.5 h-2.5" /> {uc.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2">
                      <div className="text-gray-900">{formatDateShort(a.date_alerte)}</div>
                      <div className={'text-[10px] ' + (a.joursEcart < 0 ? 'text-red-600 font-medium' : 'text-gray-500')}>
                        {a.joursEcart > 0 ? '+' : ''}{a.joursEcart}j
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-1 text-gray-700">
                        {getCategorieIcon(a.typeCategorie)}
                        <span>{getCategorieLabel(a)}</span>
                      </div>
                    </td>

                    {/* Véhicule */}
                    <td className="px-3 py-2">
                      <div className="font-mono font-medium text-gray-900">{a.vehicule_immat}</div>
                      <div className="text-[10px] text-gray-500">{a.vehicule_marque} {a.vehicule_modele}</div>
                    </td>

                    {/* Détail */}
                    <td className="px-3 py-2">
                      <span className={isUrgent ? 'text-red-700 font-medium' : 'text-gray-700'}>
                        {getDetailText(a)}
                      </span>
                      {a.reference_contrat && (
                        <span className="ml-1.5 font-mono text-[10px] text-gray-400">{a.reference_contrat}</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-2 text-gray-700">
                      {a.locataire_nom || a.locataire_prenom
                        ? `${a.locataire_prenom} ${a.locataire_nom}`.trim()
                        : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleVoirAlerte(a); }}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition-colors">
                        Voir <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-[11px] text-gray-600">
              {paginatedAlertes.length} sur {filteredAlertes.length} alerte{filteredAlertes.length > 1 ? 's' : ''}
              {filteredAlertes.length < alertes.length && (
                <span className="text-gray-400"> ({alertes.length} au total)</span>
              )}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] px-2">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================================
// SOUS-COMPOSANT KPI
// ========================================================================

function Kpi({ label, value, icon: Icon, color, outline }: {
  label: string;
  value: string;
  icon: any;
  color?: 'emerald' | 'red' | 'blue' | 'purple';
  outline?: boolean;
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-600'
                   : color === 'red' ? 'text-red-600'
                   : color === 'blue' ? 'text-blue-600'
                   : color === 'purple' ? 'text-purple-600'
                   : 'text-gray-900';
  const borderClass = outline ? 'border-red-300' : 'border-gray-200';
  return (
    <div className={'bg-white border ' + borderClass + ' rounded-md p-2.5 flex items-center gap-2'}>
      <Icon className={'w-4 h-4 ' + colorClass} />
      <div>
        <p className="text-[10px] text-gray-500 font-medium">{label}</p>
        <p className={'text-base font-semibold ' + colorClass}>{value}</p>
      </div>
    </div>
  );
}