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

    let bgColor = 'bg-gray-100 text-gray-700 border-gray-300';
    let label = value;

    if (isCDI) {
      bgColor = 'bg-green-100 text-green-800 border-green-300';
      label = showFullText ? value : 'CDI';
    } else if (isCDD) {
      bgColor = 'bg-blue-100 text-blue-800 border-blue-300';
      label = showFullText ? value : 'CDD';
    } else if (isCTT) {
      bgColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      label = showFullText ? value : 'CTT';
    } else if (isStage) {
      bgColor = 'bg-purple-100 text-purple-800 border-purple-300';
      label = showFullText ? value : 'Stage';
    } else if (isAlternance) {
      bgColor = 'bg-orange-100 text-orange-800 border-orange-300';
      label = showFullText ? value : 'Alternance';
    } else if (isAvenant) {
      bgColor = 'bg-gray-100 text-gray-800 border-gray-300';
      label = value.includes('2') ? 'Avenant 2' : 'Avenant 1';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${bgColor}`}
        title={value}
      >
        {label}
      </span>
    );
  }

  if (type === 'status') {
    const isSigned = value.toLowerCase().includes('sign');
    const isSent = value.toLowerCase().includes('envoye') || value.toLowerCase().includes('envoy');

    let bgColor = 'bg-gray-100 text-gray-700';
    let label = value;

    if (isSigned) {
      bgColor = 'bg-green-100 text-green-800';
      label = 'Signé';
    } else if (isSent) {
      bgColor = 'bg-orange-100 text-orange-800';
      label = 'Envoyé';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {label}
      </span>
    );
  }

  return <span className="text-gray-700 text-sm">{value}</span>;
}
