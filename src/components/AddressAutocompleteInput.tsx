import { useRef } from 'react';
import { useGoogleMapsAutocomplete } from '../hooks/useGoogleMapsAutocomplete';

interface AddressData {
  adresse: string;
  code_postal: string;
  ville: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (data: AddressData) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
  id?: string;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Tapez votre adresse...',
  required = false,
  className = '',
  label,
  id = 'address-autocomplete',
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useGoogleMapsAutocomplete({
    inputRef,
    onPlaceSelected: (address, components) => {
      const addressData: AddressData = {
        adresse: address,
        code_postal: components.postalCode || '',
        ville: components.locality || '',
      };
      onAddressSelect(addressData);
    },
  });

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={
          className ||
          'w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white font-medium'
        }
        autoComplete="off"
      />
    </div>
  );
}
