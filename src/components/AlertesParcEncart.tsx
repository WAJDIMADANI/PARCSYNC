import { useState } from 'react';
import { Bell, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAlertesParc, AlerteParc, AlerteGroupe } from '../hooks/useAlertesParc';

interface Props {
  mode: 'paiement' | 'location' | 'all';
  onVoirContrat: (locationId: string, typeCategorie: 'paiement' | 'location') => void;
  onPointer?: (paiementId: string) => void; // Optionnel : si pas fourni, bouton caché
  refreshTrigger?: number; // Incrémenter pour forcer le refresh
}

export function AlertesParcEncart({ mode, onVoirContrat, onPointer, refreshTrigger }: Props) {
  const { loading, groupes, nbTotal, dismiss, refresh } = useAlertesParc(mode);
  const [reduit, setReduit] = useState(false);

  // Refresh externe
  if (refreshTrigger !== undefined) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useStateForceRefresh(refreshTrigger, refresh);
  }

  if (loading) return null; // Discret : pas de spinner pour ne pas polluer le haut de page
  if (nbTotal === 0) return null; // Aucune alerte : on n'affiche rien du tout

  const headerInfo = mode === 'paiement'
    ? { icon: 'text-amber-600', titre: 'Alertes paiements' }
    : mode === 'location'
    ? { icon: 'text-blue-600', titre: 'Fins de location à anticiper' }
    : { icon: 'text-amber-600', titre: 'Alertes du parc' };

  const badgeBg = mode === 'paiement' ? 'bg-red-100 text-red-700'
                : mode === 'location' ? 'bg-blue-100 text-blue-700'
                : 'bg-red-100 text-red-700';

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-4">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className={'w-4 h-4 ' + headerInfo.icon} />
          <span className="font-medium text-sm text-gray-900">{headerInfo.titre}</span>
          <span className={'text-[11px] px-2 py-0.5 rounded-full font-medium ' + badgeBg}>{nbTotal}</span>
        </div>
        <button onClick={() => setReduit(!reduit)}
          className="text-[11px] text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
          {reduit ? <>Déplier <ChevronDown className="w-3 h-3" /></> : <>Réduire <ChevronUp className="w-3 h-3" /></>}
        </button>
      </div>

      {/* Corps (caché si réduit) */}
      {!reduit && (
        <div>
          {groupes.map((groupe, idx) => (
            <GroupeAlertes
              key={groupe.date + idx}
              groupe={groupe}
              onVoirContrat={onVoirContrat}
              onPointer={onPointer}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================================================
// SOUS-COMPOSANT : groupe par jour
// ========================================================================

function GroupeAlertes({ groupe, onVoirContrat, onPointer, onDismiss }: {
  groupe: AlerteGroupe;
  onVoirContrat: (locationId: string, typeCategorie: 'paiement' | 'location') => void;
  onPointer?: (paiementId: string) => void;
  onDismiss: (key: string) => void;
}) {
  const { couleur, titre, sousTitre, alertes } = groupe;

  // Couleurs Tailwind par groupe
  const headerBg = couleur === 'red'   ? 'bg-gradient-to-r from-red-50 to-transparent'
                 : couleur === 'amber' ? 'bg-gradient-to-r from-amber-50 to-transparent'
                 : couleur === 'blue'  ? 'bg-gradient-to-r from-blue-50 to-transparent'
                 : 'bg-gradient-to-r from-slate-50 to-transparent';

  const headerText = couleur === 'red'   ? 'text-red-700'
                   : couleur === 'amber' ? 'text-amber-700'
                   : couleur === 'blue'  ? 'text-blue-700'
                   : 'text-slate-700';

  return (
    <>
      {/* Bandeau du groupe */}
      <div className={'px-3.5 py-1.5 flex items-center gap-2 border-b border-gray-100 ' + headerBg}>
        <span className={'text-[11px] font-semibold uppercase tracking-wider ' + headerText}>
          {titre}
        </span>
        <span className="text-[10px] text-gray-400">— {sousTitre}</span>
        <span className="ml-auto text-[10px] text-gray-400">
          {alertes.length} alerte{alertes.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Lignes d'alerte */}
      {alertes.map(a => (
        <LigneAlerte
          key={a.dismissKey}
          alerte={a}
          couleur={couleur}
          onVoirContrat={onVoirContrat}
          onPointer={onPointer}
          onDismiss={onDismiss}
        />
      ))}
    </>
  );
}

// ========================================================================
// SOUS-COMPOSANT : une ligne d'alerte
// ========================================================================

function LigneAlerte({ alerte, couleur, onVoirContrat, onPointer, onDismiss }: {
  alerte: AlerteParc;
  couleur: 'red' | 'amber' | 'blue' | 'slate';
  onVoirContrat: (locationId: string, typeCategorie: 'paiement' | 'location') => void;
  onPointer?: (paiementId: string) => void;
  onDismiss: (key: string) => void;
}) {
  const dateObj = new Date(alerte.date_alerte);
  const moisAbrev = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  const jourLabel = String(dateObj.getDate()).padStart(2, '0');
  const moisLabel = moisAbrev[dateObj.getMonth()];
  const anneeLabel = String(dateObj.getFullYear()).slice(2);

  const pavetBg = couleur === 'red'   ? 'bg-red-100 text-red-700'
                : couleur === 'amber' ? 'bg-amber-100 text-amber-700'
                : couleur === 'blue'  ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-700';

  // Texte descriptif selon type
  let description = '';
  if (alerte.type === 'retard') {
    const j = Math.abs(alerte.joursEcart);
    description = `${(alerte.montant || 0).toFixed(2).replace('.', ',')} € dû depuis ${j} jour${j > 1 ? 's' : ''}`;
  } else if (alerte.type === 'aujourdhui') {
    description = `${(alerte.montant || 0).toFixed(2).replace('.', ',')} € à pointer`;
  } else if (alerte.type === 'j3') {
    description = `${(alerte.montant || 0).toFixed(2).replace('.', ',')} € à venir`;
  } else if (alerte.type === 'fin_j7') {
    description = `Fin dans ${alerte.joursEcart} jour${alerte.joursEcart > 1 ? 's' : ''}`;
  } else if (alerte.type === 'fin_j30') {
    description = `Fin dans ${alerte.joursEcart} jours`;
  }

  // Indique si la croix est disponible
  const dismissable = alerte.type !== 'retard' && alerte.type !== 'aujourdhui';
  const showPointer = onPointer && (alerte.type === 'retard' || alerte.type === 'aujourdhui') && alerte.paiement_id;

  return (
    <div className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* Pavet date */}
      <div className={'flex flex-col items-center justify-center min-w-[44px] px-1.5 py-1 rounded-md flex-shrink-0 ' + pavetBg}>
        <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{moisLabel}</span>
        <span className="text-lg font-semibold leading-tight">{jourLabel}</span>
        <span className="text-[9px] leading-none opacity-70">{anneeLabel}</span>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm font-mono">{alerte.vehicule_immat}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{alerte.type_location}</span>
          <span className="font-mono text-[10px] text-gray-400">{alerte.reference_contrat}</span>
        </div>
        <p className="text-xs text-gray-600 truncate">
          {alerte.type === 'retard' && <strong className="text-red-700">{description}</strong>}
          {alerte.type !== 'retard' && <strong>{description}</strong>}
          {' · '}{alerte.locataire_prenom} {alerte.locataire_nom}
          {alerte.vehicule_marque && <> · {alerte.vehicule_marque} {alerte.vehicule_modele}</>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-shrink-0">
        {showPointer && (
          <button onClick={() => onPointer!(alerte.paiement_id!)}
            className="text-[11px] px-2.5 py-1 text-emerald-700 border border-emerald-300 rounded hover:bg-emerald-50 inline-flex items-center gap-1">
            <Check className="w-3 h-3" />Pointer
          </button>
        )}
        <button onClick={() => onVoirContrat(alerte.location_id)}
          className="text-[11px] px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50">
          Voir contrat
        </button>
        {dismissable && (
          <button onClick={() => onDismiss(alerte.dismissKey)}
            title="Ne plus afficher"
            className="text-[11px] px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Petit hook utilitaire pour forcer le refresh externe
function useStateForceRefresh(trigger: number, refresh: () => void) {
  const [prev, setPrev] = useState(trigger);
  if (trigger !== prev) {
    setPrev(trigger);
    refresh();
  }
}