interface ContractBadgeProps {
  type: 'type' | 'status';
  value?: string;
}

export function ContractBadge({ type, value }: ContractBadgeProps) {
  if (!value) return <span className="text-gray-400 text-sm">-</span>;

  if (type === 'type') {
    const isCDI = value.toLowerCase().includes('cdi');
    const isCDD = value.toLowerCase().includes('cdd');
    const isAvenant = value.toLowerCase().includes('avenant');

    let bgColor = 'bg-gray-100 text-gray-700';
    let label = value;

    if (isCDI) {
      bgColor = 'bg-green-100 text-green-800';
      label = 'CDI';
    } else if (isCDD) {
      bgColor = 'bg-blue-100 text-blue-800';
      label = 'CDD';
    } else if (isAvenant) {
      bgColor = 'bg-orange-100 text-orange-800';
      label = value.includes('2') ? 'Avenant 2' : 'Avenant 1';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
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
