import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Loueur {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  siret: string | null;
  actif: boolean;
  created_at: string;
}

interface LocataireExterneSelectorProps {
  type: 'personne' | 'entreprise';
  onSelect: (loueur: Loueur | null) => void;
  selectedId?: string | null;
}

export default function LocataireExterneSelector({ type, onSelect, selectedId }: LocataireExterneSelectorProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [loueurs, setLoueurs] = useState<Loueur[]>([]);
  const [selectedLoueur, setSelectedLoueur] = useState<Loueur | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    adresse: '',
    siret: ''
  });

  useEffect(() => {
    if (mode === 'search') {
      searchLoueurs();
    }
  }, [searchTerm, mode]);

  useEffect(() => {
    if (selectedId) {
      loadSelectedLoueur(selectedId);
    }
  }, [selectedId]);

  const loadSelectedLoueur = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('loueur')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedLoueur(data);
        onSelect(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du loueur:', error);
    }
  };

  const searchLoueurs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('loueur')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (searchTerm) {
        query = query.ilike('nom', `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setLoueurs(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLoueur = (loueur: Loueur) => {
    setSelectedLoueur(loueur);
    onSelect(loueur);
  };

  const handleCreateLoueur = async () => {
    if (!formData.nom.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    try {
      setLoading(true);

      const insertData: any = {
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim() || null,
        email: formData.email.trim() || null,
        adresse: formData.adresse.trim() || null,
        actif: true
      };

      if (type === 'entreprise') {
        insertData.contact = formData.contact.trim() || null;
        insertData.siret = formData.siret.trim() || null;
      } else {
        insertData.contact = null;
        insertData.siret = null;
      }

      const { data, error } = await supabase
        .from('loueur')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      setSelectedLoueur(data);
      onSelect(data);
      setMode('search');
      setFormData({ nom: '', contact: '', telephone: '', email: '', adresse: '', siret: '' });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création du loueur');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedLoueur(null);
    onSelect(null);
    setSearchTerm('');
  };

  if (selectedLoueur) {
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
              <span className="font-medium text-green-900">{selectedLoueur.nom}</span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-green-600 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {selectedLoueur.contact && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Contact: {selectedLoueur.contact}</span>
              </div>
            )}
            {selectedLoueur.telephone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>{selectedLoueur.telephone}</span>
              </div>
            )}
            {selectedLoueur.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{selectedLoueur.email}</span>
              </div>
            )}
            {selectedLoueur.adresse && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>{selectedLoueur.adresse}</span>
              </div>
            )}
            {selectedLoueur.siret && (
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>SIRET: {selectedLoueur.siret}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {type === 'personne' ? 'Nouvelle personne externe' : 'Nouvelle entreprise externe'}
          </h3>
          <button
            onClick={() => {
              setMode('search');
              setFormData({ nom: '', contact: '', telephone: '', email: '', adresse: '', siret: '' });
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

          {type === 'entreprise' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom du contact principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                </label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 456 789 00000"
                />
              </div>
            </>
          )}

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

          <button
            onClick={handleCreateLoueur}
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
        <span>Créer {type === 'personne' ? 'une nouvelle personne' : 'une nouvelle entreprise'}</span>
      </button>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Recherche...</div>
      ) : loueurs.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loueurs.map((loueur) => (
            <button
              key={loueur.id}
              onClick={() => handleSelectLoueur(loueur)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {type === 'personne' ? (
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{loueur.nom}</div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    {loueur.contact && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{loueur.contact}</span>
                      </div>
                    )}
                    {loueur.telephone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{loueur.telephone}</span>
                      </div>
                    )}
                    {loueur.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{loueur.email}</span>
                      </div>
                    )}
                    {loueur.siret && (
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">SIRET: {loueur.siret}</span>
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
