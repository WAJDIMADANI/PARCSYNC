import { useState } from 'react';
import { X } from 'lucide-react';

interface CustomVariable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'datetime' | 'number' | 'select' | 'boolean';
  required: boolean;
  default_value?: any;
  options?: string[];
  ordre: number;
}

interface CustomVariableFormProps {
  onAdd: (variable: CustomVariable) => void;
  onCancel: () => void;
  existingNames: string[];
  editingVariable?: { name: string; config: any };
  originalName?: string;
}

export function CustomVariableForm({ onAdd, onCancel, existingNames, editingVariable, originalName }: CustomVariableFormProps) {
  const isEditing = !!editingVariable;
  const [name, setName] = useState(editingVariable?.name || '');
  const [label, setLabel] = useState(editingVariable?.config?.label || '');
  const [type, setType] = useState<CustomVariable['type']>(editingVariable?.config?.type || 'text');
  const [required, setRequired] = useState(editingVariable?.config?.required || false);
  const [options, setOptions] = useState<string[]>(editingVariable?.config?.options || []);
  const [newOption, setNewOption] = useState('');
  const [error, setError] = useState('');

  const validateName = (value: string): boolean => {
    if (!value) {
      setError('Le nom est requis');
      return false;
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
      setError('Le nom ne peut contenir que des lettres minuscules, chiffres et underscores');
      return false;
    }
    // Allow the same name if we're editing and haven't changed the name
    if (existingNames.includes(value) && value !== originalName) {
      setError('Ce nom de variable existe déjà');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (!validateName(name)) return;
    if (!label.trim()) {
      setError('Le label est requis');
      return;
    }

    if (type === 'select' && options.length === 0) {
      setError('Ajoutez au moins une option pour la liste déroulante');
      return;
    }

    const variable: CustomVariable = {
      name,
      label: label.trim(),
      type,
      required,
      options: type === 'select' ? options : undefined,
      ordre: isEditing ? (editingVariable?.config?.ordre || existingNames.length + 1) : (existingNames.length + 1)
    };

    onAdd(variable);
  };

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Modifier la variable personnalisée' : 'Ajouter une variable personnalisée'}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la variable *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setName(value);
                  if (value) validateName(value);
                }}
                placeholder="ex: date_faits"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {name && (
                <div className="mt-1 text-xs text-gray-500 font-mono">
                  Sera utilisée comme: {`{{${name}}}`}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label affiché *
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Date des faits"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-1 text-xs text-gray-500">
                Ce texte sera affiché dans le formulaire de génération
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de champ *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomVariable['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="text">Texte court</option>
                <option value="textarea">Texte long (zone de texte)</option>
                <option value="date">Date</option>
                <option value="time">Heure</option>
                <option value="datetime">Date et heure</option>
                <option value="number">Nombre</option>
                <option value="select">Liste déroulante</option>
                <option value="boolean">Oui/Non</option>
              </select>
            </div>

            {type === 'select' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options de la liste
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    placeholder="Nouvelle option"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                </div>
                {options.length > 0 && (
                  <div className="space-y-1">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">{option}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Champ requis
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Modifier la variable' : 'Ajouter la variable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
