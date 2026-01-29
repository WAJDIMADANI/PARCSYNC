import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Building2, Calendar, Phone, Mail, MapPin, FileText, X, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LocataireExterne {
  id: string;
  type: 'personne' | 'entreprise';
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

interface LocataireExterneHistory {
  id: string;
  locataire_externe_id: string;
  type: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  changed_at: string;
}

interface LocataireExterneSelectorProps {
  type: 'personne' | 'entreprise';
  onSelect: (locataire: LocataireExterne | null) => void;
  selectedId?: string | null;
}

export default function LocataireExterneSelector({ type, onSelect, selectedId }: LocataireExterneSelectorProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [locataires, setLocataires] = useState<LocataireExterne[]>([]);
  const [selectedLocataire, setSelectedLocataire] = useState<LocataireExterne | null>(null);
  const [history, setHistory] = useState<LocataireExterneHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: ''
  });

  useEffect(() => {
    if (mode === 'search') {
      searchLocataires();
    }
  }, [searchTerm, type, mode]);

  useEffect(() => {
    if (selectedId) {
      loadSelectedLocataire(selectedId);
    }
  }, [selectedId]);

  const loadSelectedLocataire = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('locataire_externe')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedLocataire(data);
        onSelect(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du locataire:', error);
    }
  };

  const searchLocataires = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('locataire_externe')
        .select('*')
        .eq('type', type)
        .eq('actif', true)
        .order('nom');

      if (searchTerm) {
        query = query.ilike('nom', `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setLocataires(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (locataireId: string) => {
    try {
      const { data, error } = await supabase
        .from('locataire_externe_history')
        .select('*')
        .eq('locataire_externe_id', locataireId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const handleSelectLocataire = (locataire: LocataireExterne) => {
    setSelectedLocataire(locataire);
    onSelect(locataire);
  };

  const handleCreateLocataire = async () => {
    if (!formData.nom.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locataire_externe')
        .insert([{
          type,
          nom: formData.nom.trim(),
          telephone: formData.telephone.trim() || null,
          email: formData.email.trim() || null,
          adresse: formData.adresse.trim() || null,
          notes: formData.notes.trim() || null,
          actif: true
        }])
        .select()
        .single();

      if (error) throw error;

      setSelectedLocataire(data);
      onSelect(data);
      setMode('search');
      setFormData({ nom: '', telephone: '', email: '', adresse: '', notes: '' });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création du locataire');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedLocataire(null);
    onSelect(null);
    setSearchTerm('');
  };

  if (selectedLocataire) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {type === 'personne' ? (
                <User className="h-5 w-5 text-green-600" />
              ) : (
                <Building2 className="h-5 w-5 text-green-600" />
              )}
              <span className="font-medium text-green-900">{selectedLocataire.nom}</span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-green-600 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {selectedLocataire.telephone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>{selectedLocataire.telephone}</span>
              </div>
            )}
            {selectedLocataire.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{selectedLocataire.email}</span>
              </div>
            )}
            {selectedLocataire.adresse && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>{selectedLocataire.adresse}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => loadHistory(selectedLocataire.id)}
            className="mt-3 flex items-center space-x-2 text-sm text-green-600 hover:text-green-700"
          >
            <History className="h-4 w-4" />
            <span>Voir l'historique</span>
          </button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Historique des modifications</h4>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-gray-300 pl-3 py-2">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(entry.changed_at).toLocaleString('fr-FR')}
                  </div>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Nom:</span> {entry.nom}</div>
                    {entry.telephone && (
                      <div><span className="font-medium">Tél:</span> {entry.telephone}</div>
                    )}
                    {entry.email && (
                      <div><span className="font-medium">Email:</span> {entry.email}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Nouveau {type === 'personne' ? 'locataire' : 'locataire entreprise'}
          </h3>
          <button
            onClick={() => {
              setMode('search');
              setFormData({ nom: '', telephone: '', email: '', adresse: '', notes: '' });
            }}
            className="text-gray-600 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'personne' ? 'Nom complet' : 'Raison sociale'} *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={type === 'personne' ? 'Jean Dupont' : 'SARL Transport Express'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="06 12 34 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <textarea
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Adresse complète"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes internes..."
            />
          </div>

          <button
            onClick={handleCreateLocataire}
            disabled={loading || !formData.nom.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer et sélectionner'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Rechercher ${type === 'personne' ? 'un locataire' : 'une entreprise'}...`}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={() => setMode('create')}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
      >
        <Plus className="h-5 w-5" />
        <span>Créer nouveau {type === 'personne' ? 'locataire' : 'locataire entreprise'}</span>
      </button>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Recherche...</div>
      ) : locataires.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {locataires.map((locataire) => (
            <button
              key={locataire.id}
              onClick={() => handleSelectLocataire(locataire)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {type === 'personne' ? (
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{locataire.nom}</div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    {locataire.telephone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{locataire.telephone}</span>
                      </div>
                    )}
                    {locataire.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{locataire.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : searchTerm ? (
        <div className="text-center py-4 text-gray-500">
          Aucun résultat trouvé
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          Commencez à taper pour rechercher
        </div>
      )}
    </div>
  );
}
