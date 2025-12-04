import { useEffect, useRef } from 'react';

interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  postalCode?: string;
  country?: string;
}

interface UseGoogleMapsAutocompleteProps {
  onPlaceSelected: (address: string, components: AddressComponents) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useGoogleMapsAutocomplete({
  onPlaceSelected,
  inputRef,
}: UseGoogleMapsAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const initAutocomplete = () => {
      if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      try {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current!, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();

          if (!place || !place.address_components) {
            return;
          }

          const components: AddressComponents = {};

          for (const component of place.address_components) {
            const componentType = component.types[0];

            switch (componentType) {
              case 'street_number':
                components.streetNumber = component.long_name;
                break;
              case 'route':
                components.route = component.long_name;
                break;
              case 'locality':
                components.locality = component.long_name;
                break;
              case 'postal_code':
                components.postalCode = component.long_name;
                break;
              case 'country':
                components.country = component.long_name;
                break;
            }
          }

          const streetAddress = [components.streetNumber, components.route]
            .filter(Boolean)
            .join(' ');

          onPlaceSelected(streetAddress || place.formatted_address || '', components);
        });
      } catch (error) {
        console.error('Error initializing Google Maps Autocomplete:', error);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [inputRef, onPlaceSelected]);

  return { autocompleteRef };
}
