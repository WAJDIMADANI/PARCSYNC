interface ProprietaireSelectorProps {
  proprietaireMode: 'tca' | 'entreprise';
  proprietaireTcaValue: string;
  proprietaireEntrepriseName: string;
  proprietaireEntreprisePhone: string;
  proprietaireEntrepriseAddress: string;
  onModeChange: (mode: 'tca' | 'entreprise') => void;
  onTcaValueChange: (value: string) => void;
  onEntrepriseNameChange: (value: string) => void;
  onEntreprisePhoneChange: (value: string) => void;
  onEntrepriseAddressChange: (value: string) => void;
  disabled?: boolean;
  showTitle?: boolean;
}

export function ProprietaireSelector({
  proprietaireMode,
  proprietaireTcaValue,
  proprietaireEntrepriseName,
  proprietaireEntreprisePhone,
  proprietaireEntrepriseAddress,
  onModeChange,
  onTcaValueChange,
  onEntrepriseNameChange,
  onEntreprisePhoneChange,
  onEntrepriseAddressChange,
  disabled = false,
  showTitle = true
}: ProprietaireSelectorProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Propriétaire (carte grise)</h3>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de propriétaire
        </label>
        <select
          value={proprietaireMode}
          onChange={(e) => {
            const newMode = e.target.value as 'tca' | 'entreprise';
            onModeChange(newMode);
            if (newMode === 'tca' && !proprietaireTcaValue) {
              onTcaValueChange('TCA TRANSPORT');
            }
          }}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value="tca">TCA / Entreprise interne</option>
          <option value="entreprise">Entreprise externe</option>
        </select>
      </div>

      {proprietaireMode === 'tca' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du propriétaire TCA
          </label>
          <input
            type="text"
            value={proprietaireTcaValue}
            onChange={(e) => onTcaValueChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            placeholder="Ex: TCA TRANSPORT, TCA NIORT..."
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={proprietaireEntrepriseName}
              onChange={(e) => onEntrepriseNameChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Ex: SARL LOGISTIQUE..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="text"
              value={proprietaireEntreprisePhone}
              onChange={(e) => onEntreprisePhoneChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Ex: 01 23 45 67 89"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={proprietaireEntrepriseAddress}
              onChange={(e) => onEntrepriseAddressChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Ex: 123 rue de la Gare, 75001 Paris"
            />
          </div>
        </>
      )}
    </div>
  );
}
