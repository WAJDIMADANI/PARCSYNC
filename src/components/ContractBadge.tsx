interface ContractBadgeProps {
  type: 'type' | 'status';
  value?: string;
  showFullText?: boolean;
}

export function ContractBadge({ type, value, showFullText = false }: ContractBadgeProps) {
  if (!value) return <span className="text-gray-400 text-sm">-</span>;

  if (type === 'type') {
    const lowerValue = value.toLowerCase();
    const isCDI = lowerValue.includes('cdi');
    const isCDD = lowerValue.includes('cdd');
    const isCTT = lowerValue.includes('ctt');
    const isStage = lowerValue.includes('stage');
    const isAlternance = lowerValue.includes('alternance');
    const isAvenant = lowerValue.includes('avenant');

    let bgColor = 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200';
    let label = value;

    if (isCDI) {
      bgColor = 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white border-emerald-400';
      label = showFullText ? value : 'CDI';
    } else if (isCDD) {
      bgColor = 'bg-gradient-to-r from-sky-500 via-blue-500 to-sky-600 text-white border-sky-400';
      label = showFullText ? value : 'CDD';
    } else if (isCTT) {
      bgColor = 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white border-yellow-400';
      label = showFullText ? value : 'CTT';
    } else if (isStage) {
      bgColor = 'bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 text-white border-purple-400';
      label = showFullText ? value : 'Stage';
    } else if (isAlternance) {
      bgColor = 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white border-orange-400';
      label = showFullText ? value : 'Alternance';
    } else if (isAvenant) {
      bgColor = 'bg-gradient-to-r from-slate-400 via-gray-400 to-slate-500 text-white border-gray-400';
      label = value.includes('2') ? 'Avenant 2' : 'Avenant 1';
    }

    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-300 ${bgColor}`}
        title={value}
      >
        {label}
      </span>
    );
  }

  if (type === 'status') {
    const lowerValue = value.toLowerCase();
    const isSigned = lowerValue.includes('sign');
    const isSent = lowerValue.includes('envoye') || lowerValue.includes('envoy');
    const isExpired = lowerValue.includes('expir') || lowerValue === 'expiré';
    const isActif = lowerValue === 'actif';

    let bgColor = 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700';
    let label = value;

    if (isExpired) {
      bgColor = 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white border-2 border-red-400 shadow-md';
      label = 'Expiré';
    } else if (isSigned || isActif) {
      bgColor = 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white shadow-md';
      label = isSigned ? 'Signé' : 'Actif';
    } else if (isSent) {
      bgColor = 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md';
      label = 'Envoyé';
    }

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold hover:shadow-lg transform hover:scale-110 transition-all duration-300 ${bgColor}`}>
        {label}
      </span>
    );
  }

  return <span className="text-gray-700 text-sm">{value}</span>;
}
