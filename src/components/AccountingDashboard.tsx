import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, CreditCard, MapPin, FileText, HeartHandshake, Clock, Banknote } from 'lucide-react';
import { ComptabiliteEntriesTab } from './ComptabiliteEntriesTab';
import { ComptabiliteExitsTab } from './ComptabiliteExitsTab';
import { ComptabiliteRibTab } from './ComptabiliteRibTab';
import { ComptabiliteAdresseTab } from './ComptabiliteAdresseTab';
import { ComptabiliteAvenantTab } from './ComptabiliteAvenantTab';
import { ComptabiliteMutuelleTab } from './ComptabiliteMutuelleTab';
import ComptabiliteARTab from './ComptabiliteARTab';
import ComptabiliteAvanceFraisTab from './ComptabiliteAvanceFraisTab';
import { View } from './Sidebar';

interface AccountingDashboardProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function AccountingDashboard({ currentView, onViewChange }: AccountingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'entrees' | 'sorties' | 'rib' | 'adresse' | 'avenants' | 'mutuelle' | 'ar' | 'avance-frais'>('entrees');

  useEffect(() => {
    if (currentView === 'compta/entrees') {
      setActiveTab('entrees');
    } else if (currentView === 'compta/sorties') {
      setActiveTab('sorties');
    } else if (currentView === 'compta/rib') {
      setActiveTab('rib');
    } else if (currentView === 'compta/adresse') {
      setActiveTab('adresse');
    } else if (currentView === 'compta/avenants') {
      setActiveTab('avenants');
    } else if (currentView === 'compta/mutuelle') {
      setActiveTab('mutuelle');
    } else if (currentView === 'compta/ar') {
      setActiveTab('ar');
    } else if (currentView === 'compta/avance-frais') {
      setActiveTab('avance-frais');
    }
  }, [currentView]);

  const handleTabChange = (tab: 'entrees' | 'sorties' | 'rib' | 'adresse' | 'avenants' | 'mutuelle' | 'ar' | 'avance-frais') => {
    setActiveTab(tab);
    onViewChange(
      tab === 'entrees' ? 'compta/entrees' :
      tab === 'sorties' ? 'compta/sorties' :
      tab === 'rib' ? 'compta/rib' :
      tab === 'adresse' ? 'compta/adresse' :
      tab === 'avenants' ? 'compta/avenants' :
      tab === 'mutuelle' ? 'compta/mutuelle' :
      tab === 'ar' ? 'compta/ar' :
      'compta/avance-frais'
    );
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comptabilité</h1>
            <p className="text-gray-600">Suivi des entrées et sorties de personnel</p>
          </div>
        </div>

        <div className="bg-white border-b border-gray-200 rounded-lg shadow-sm">
          <div className="flex gap-8 px-6 py-4">
            <button
              onClick={() => handleTabChange('entrees')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'entrees'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Entrées
            </button>
            <button
              onClick={() => handleTabChange('sorties')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'sorties'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              Sorties
            </button>
            <button
              onClick={() => handleTabChange('rib')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'rib'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              RIB
            </button>
            <button
              onClick={() => handleTabChange('adresse')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'adresse'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Adresse
            </button>
            <button
              onClick={() => handleTabChange('avenants')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'avenants'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              Avenants
            </button>
            <button
              onClick={() => handleTabChange('mutuelle')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'mutuelle'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
              Mutuelle
            </button>
            <button
              onClick={() => handleTabChange('ar')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'ar'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-5 h-5" />
              A&R
            </button>
            <button
              onClick={() => handleTabChange('avance-frais')}
              className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'avance-frais'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Banknote className="w-5 h-5" />
              Avance de frais
            </button>
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'entrees' && <ComptabiliteEntriesTab />}
        {activeTab === 'sorties' && <ComptabiliteExitsTab />}
        {activeTab === 'rib' && <ComptabiliteRibTab />}
        {activeTab === 'adresse' && <ComptabiliteAdresseTab />}
        {activeTab === 'avenants' && <ComptabiliteAvenantTab />}
        {activeTab === 'mutuelle' && <ComptabiliteMutuelleTab />}
        {activeTab === 'ar' && <ComptabiliteARTab />}
        {activeTab === 'avance-frais' && <ComptabiliteAvanceFraisTab />}
      </div>
    </div>
  );
}
