import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import EntriesTab from './accounting/EntriesTab';
import ExitsTab from './accounting/ExitsTab';
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
      <div className="bg-white border-b border-gray-200 rounded-t-lg shadow-sm mb-6">
        <div className="flex gap-8 px-6 py-4">
          <button
            onClick={() => handleTabChange('entrees')}
            className={`py-2 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'entrees'
                ? 'border-blue-500 text-blue-600'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown className="w-5 h-5" />
            Sorties
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'entrees' && <EntriesTab />}
        {activeTab === 'sorties' && <ExitsTab />}
      </div>
    </div>
  );
}
