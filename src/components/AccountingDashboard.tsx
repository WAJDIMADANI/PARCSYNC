import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, CreditCard, MapPin } from 'lucide-react';
import { ComptabiliteEntriesTab } from './ComptabiliteEntriesTab';
import { ComptabiliteExitsTab } from './ComptabiliteExitsTab';
import { ComptabiliteRibTab } from './ComptabiliteRibTab';
import { ComptabiliteAdresseTab } from './ComptabiliteAdresseTab';
import { View } from './Sidebar';

interface AccountingDashboardProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function AccountingDashboard({ currentView, onViewChange }: AccountingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'entrees' | 'sorties' | 'rib' | 'adresse'>('entrees');

  useEffect(() => {
    if (currentView === 'compta/entrees') {
      setActiveTab('entrees');
    } else if (currentView === 'compta/sorties') {
      setActiveTab('sorties');
    } else if (currentView === 'compta/rib') {
      setActiveTab('rib');
    } else if (currentView === 'compta/adresse') {
      setActiveTab('adresse');
    }
  }, [currentView]);

  const handleTabChange = (tab: 'entrees' | 'sorties' | 'rib' | 'adresse') => {
    setActiveTab(tab);
    onViewChange(
      tab === 'entrees' ? 'compta/entrees' :
      tab === 'sorties' ? 'compta/sorties' :
      tab === 'rib' ? 'compta/rib' :
      'compta/adresse'
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
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'entrees' && <ComptabiliteEntriesTab />}
        {activeTab === 'sorties' && <ComptabiliteExitsTab />}
        {activeTab === 'rib' && <ComptabiliteRibTab />}
        {activeTab === 'adresse' && <ComptabiliteAdresseTab />}
      </div>
    </div>
  );
}
