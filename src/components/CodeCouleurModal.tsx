import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CodeCouleurModalProps {
  isOpen: boolean;
  currentValue: string | null;
  candidateName: string;
  currentNote?: string | null;
  onClose: () => void;
  onSave: (codeCouleur: string | null, noteInterne: string) => Promise<void>;
}

const CODE_COULEUR_OPTIONS = [
  { value: '', label: 'Aucun code', color: 'bg-gray-100 text-gray-800' },
  { value: 'vert', label: 'Vert - Excellent candidat', color: 'bg-green-100 text-green-800' },
  { value: 'orange', label: 'Orange - À surveiller', color: 'bg-orange-100 text-orange-800' },
  { value: 'rouge', label: 'Rouge - Ne pas recontacter', color: 'bg-red-100 text-red-800' },
  { value: 'bleu', label: 'Bleu - Candidat prioritaire', color: 'bg-blue-100 text-blue-800' },
  { value: 'jaune', label: 'Jaune - En attente', color: 'bg-yellow-100 text-yellow-800' }
];

export default function CodeCouleurModal({
  isOpen,
  currentValue,
  candidateName,
  currentNote,
  onClose,
  onSave
}: CodeCouleurModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>(currentValue || '');
  const [noteInterne, setNoteInterne] = useState<string>(currentNote || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedCode || null, noteInterne);
      onClose();
    } catch (error) {
      console.error('Error saving code couleur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Code couleur - {candidateName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code couleur RH
            </label>
            <div className="space-y-2">
              {CODE_COULEUR_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="code_couleur"
                    value={option.value}
                    checked={selectedCode === option.value}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="mr-3"
                  />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note interne RH
            </label>
            <textarea
              value={noteInterne}
              onChange={(e) => setNoteInterne(e.target.value)}
              placeholder="Ajoutez une note interne sur ce candidat (optionnel)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cette note est uniquement visible par l'équipe RH
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
