import { useState, useMemo, useEffect } from 'react';
import {
  Bell, Search, RefreshCw, AlertTriangle, Clock, CheckCircle2,
  FileText, Banknote, MapPin, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { useAlertesParc, AlerteParc } from '../hooks/useAlertesParc';

type CategorieFilter = 'all' | 'urgent' | 'paiement' | 'location' | 'carte_ris' | 'controle_technique' | 'assurance';
type SortBy = 'urgence' | 'date_asc' | 'date_desc';

interface Props {
  onNavigate?: (view: string, params?: any) => void;
  viewParams?: any;
}

const URGENCE_ORDER: Record<string, number> = {
  retard: 0,
  aujourdhui: 1,
  doc_expire: 2,
  j3: 3,
  fin_j7: 4,
  doc_bientot: 5,
  fin_j30: 6,
};

const PAGE_SIZE = 50;

export function AlertesParcPage({ onNavigate, viewParams }: Props) {
  const { loading, alertes, refresh } = useAlertesParc('all');

  const [categorie, setCategorie] = useState<CategorieFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('urgence');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtre initial passé depuis le Dashboard
  useEffect(() => {
    if (viewParams?.initialFilter) {
      setCategorie(viewParams.initialFilter as CategorieFilter);
    }
  }, [viewParams]);

  const kpis = useMemo(() => {
    const total = alertes.length;
    const urgent = alertes.filter(a => a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire').length;
    const paiement = alertes.filter(a => a.typeCategorie === 'paiement').length;
    const location = alertes.filter(a => a.typeCategorie === 'location').length;
    const carte_ris = alertes.filter(a => a.typeCategorie === 'document' && a.document_type === 'carte_ris').length;
    const controle_technique = alertes.filter(a => a.typeCategorie === 'document' && a.document_type === 'controle_technique').length;
    const assurance = alertes.filter(a => a.typeCategorie === 'document' && a.document_type === 'assurance').length;
    return { total, urgent, paiement, location, carte_ris, controle_technique, assurance };
  }, [alertes]);

  const filteredAlertes = useMemo(() => {
    let result = [...alertes];
    if (categorie === 'urgent') result = result.filter(a => a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire');
    else if (categorie === 'paiement') result = result.filter(a => a.typeCategorie === 'paiement');
    else if (categorie === 'location') result = result.filter(a => a.typeCategorie === 'location');
    else if (categorie === 'carte_ris') result = result.filter(a => a.typeCategorie === 'document' && a.document_type === 'carte_ris');
    else if (categorie === 'controle_technique') result = result.filter(a => a.typeCategorie === 'document' && a.document_type === 'controle_technique');
    else if (categorie === 'assurance') result = result.filter(a => a.typeCategorie === 'document' && a.document_type === 'assurance');

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

    if (sortBy === 'urgence') {
      result.sort((a, b) => {
        const ua = URGENCE_ORDER[a.type] ?? 99;
        const ub = URGENCE_ORDER[b.type] ?? 99;
        if (ua !== ub) return ua - ub;
        return a.joursEcart - b.joursEcart;
      });
    } else if (sortBy === 'date_asc') {
      result.sort((a, b) => a.date_alerte.localeCompare(b.date_alerte));
    } else if (sortBy === 'date_desc') {
      result.sort((a, b) => b.date_alerte.localeCompare(a.date_alerte));
    }

    return result;
  }, [alertes, categorie, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAlertes.length / PAGE_SIZE));
  const paginatedAlertes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAlertes.slice(start, start + PAGE_SIZE);
  }, [filteredAlertes, currentPage]);

  useMemo(() => { setCurrentPage(1); }, [categorie, search, sortBy]);

  const handleVoirAlerte = (alerte: AlerteParc) => {
    if (!onNavigate) return;
    if (alerte.typeCategorie === 'paiement') onNavigate('parc/paiements', { focus_location_id: alerte.location_id });
    else if (alerte.typeCategorie === 'location') onNavigate('parc/locations', { focus_location_id: alerte.location_id });
    else if (alerte.typeCategorie === 'document' && alerte.vehicle_id) onNavigate('parc/vehicules', { vehicleId: alerte.vehicle_id });
  };

  const formatDateShort = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return d; }
  };

  const getUrgenceConfig = (alerte: AlerteParc) => {
    const { type } = alerte;
    if (type === 'retard') return { bg: 'bg-red-100', text: 'text-red-700', label: 'RETARD' };
    if (type === 'aujourdhui') return { bg: 'bg-amber-100', text: 'text-amber-700', label: "AUJOURD'HUI" };
    if (type === 'j3') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'J-3' };
    if (type === 'fin_j7') return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'FIN J-7' };
    if (type === 'fin_j30') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'FIN J-30' };
    if (type === 'doc_expire') return { bg: 'bg-red-100', text: 'text-red-700', label: 'EXPIRÉ' };
    if (type === 'doc_bientot') return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'EXPIRE BIENTÔT' };
    return { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
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
      const m = alerte.montant?.toFixed(2).replace('.', ',') || '0';
      if (alerte.type === 'retard') return `${m} € en retard de ${Math.abs(alerte.joursEcart)} jour(s)`;
      if (alerte.type === 'aujourdhui') return `${m} € à pointer aujourd'hui`;
      if (alerte.type === 'j3') return `${m} € à venir dans 3 jours`;
    }
    if (alerte.typeCategorie === 'location') {
      if (alerte.type === 'fin_j7') return `Fin location dans ${alerte.joursEcart} jour(s) · restitution`;
      if (alerte.type === 'fin_j30') return `Fin location dans ${alerte.joursEcart} jours · renouvellement`;
    }
    if (alerte.typeCategorie === 'document') {
      if (alerte.type === 'doc_expire') return `Expiré depuis ${Math.abs(alerte.joursEcart)} jour(s)`;
      if (alerte.type === 'doc_bientot') return `Expire dans ${alerte.joursEcart} jour(s)`;
    }
    return '—';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Centre d'alertes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{alertes.length} alerte(s) active(s)</p>
        </div>
        <button onClick={refresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Kpi label="Total" value={String(kpis.total)} icon={Bell} />
        <Kpi label="Urgent" value={String(kpis.urgent)} icon={AlertTriangle} color="red" outline={kpis.urgent > 0} />
        <Kpi label="Paiements" value={String(kpis.paiement)} icon={Banknote} color="emerald" />
        <Kpi label="Locations" value={String(kpis.location)} icon={MapPin} color="blue" />
        <Kpi label="Documents" value={String(kpis.carte_ris + kpis.controle_technique + kpis.assurance)} icon={FileText} color="purple" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="inline-flex flex-wrap gap-0.5 bg-white border border-gray-200 rounded-md p-0.5">
          {([
            { key: 'all', label: `Tout (${kpis.total})` },
            { key: 'urgent', label: `Urgent (${kpis.urgent})` },
            { key: 'paiement', label: `Paiements (${kpis.paiement})` },
            { key: 'location', label: `Contrats (${kpis.location})` },
            { key: 'carte_ris', label: `Carte RIS (${kpis.carte_ris})` },
            { key: 'controle_technique', label: `CT (${kpis.controle_technique})` },
            { key: 'assurance', label: `Assurance (${kpis.assurance})` },
          ] as { key: CategorieFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setCategorie(f.key)}
              className={'px-3 py-1 text-xs font-medium rounded ' + (categorie === f.key ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white">
          <option value="urgence">Tri : Urgence</option>
          <option value="date_asc">Tri : Date ancienne</option>
          <option value="date_desc">Tri : Date récente</option>
        </select>
      </div>

      {paginatedAlertes.length === 0 ? (
        <div className="bg-white rounded-md border border-gray-200 p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">Aucune alerte</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Urgence</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Véhicule</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Détail</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAlertes.map(a => {
                const uc = getUrgenceConfig(a);
                const isUrgent = a.type === 'retard' || a.type === 'aujourdhui' || a.type === 'doc_expire';
                return (
                  <tr key={a.dismissKey} className={'cursor-pointer ' + (isUrgent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50')}
                      onClick={() => handleVoirAlerte(a)}>
                    <td className="px-3 py-2">
                      <span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ' + uc.bg + ' ' + uc.text}>{uc.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-gray-900">{formatDateShort(a.date_alerte)}</div>
                      <div className={'text-[10px] ' + (a.joursEcart < 0 ? 'text-red-600 font-medium' : 'text-gray-500')}>
                        {a.joursEcart > 0 ? '+' : ''}{a.joursEcart}j
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-1 text-gray-700">{getCategorieIcon(a.typeCategorie)}<span>{getCategorieLabel(a)}</span></div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono font-medium text-gray-900">{a.vehicule_immat}</div>
                      <div className="text-[10px] text-gray-500">{a.vehicule_marque} {a.vehicule_modele}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={isUrgent ? 'text-red-700 font-medium' : 'text-gray-700'}>{getDetailText(a)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {a.locataire_nom || a.locataire_prenom ? `${a.locataire_prenom} ${a.locataire_nom}`.trim() : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleVoirAlerte(a); }}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded">
                        Voir <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-[11px] text-gray-600">{paginatedAlertes.length} sur {filteredAlertes.length}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="text-[11px] px-2">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color, outline }: { label: string; value: string; icon: any; color?: string; outline?: boolean }) {
  const colorClass = color === 'emerald' ? 'text-emerald-600' : color === 'red' ? 'text-red-600' : color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : 'text-gray-900';
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
