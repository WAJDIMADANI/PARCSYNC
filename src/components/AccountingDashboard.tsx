import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { ComptabiliteEntriesTab } from './ComptabiliteEntriesTab';
import { ComptabiliteExitsTab } from './ComptabiliteExitsTab';
import { View } from './Sidebar';

interface AccountingDashboardProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function AccountingDashboard({ currentView, onViewChange }: AccountingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'entrees' | 'sorties'>('entrees');

  useEffect(() => {
    if (currentView === 'compta/entrees') {
      setActiveTab('entrees');
    } else if (currentView === 'compta/sorties') {
      setActiveTab('sorties');
    }
  }, [currentView]);

  const handleTabChange = (tab: 'entrees' | 'sorties') => {
    setActiveTab(tab);
    onViewChange(tab === 'entrees' ? 'compta/entrees' : 'compta/sorties');
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl shadow-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comptabilité</h1>
            <p className="text-gray-600">Gestion des entrées et sorties financières</p>
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
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'entrees' && <ComptabiliteEntriesTab />}
        {activeTab === 'sorties' && <ComptabiliteExitsTab />}
      </div>
    </div>
  );
}
