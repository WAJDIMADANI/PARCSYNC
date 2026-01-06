import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import EntriesTab from './accounting/EntriesTab';
import ExitsTab from './accounting/ExitsTab';

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState<'entrees' | 'sorties'>('entrees');

  return (
    <div>
      <div className="bg-white border-b border-gray-200 rounded-t-lg shadow-sm mb-6">
        <div className="flex gap-8 px-6 py-4">
          <button
            onClick={() => setActiveTab('entrees')}
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
            onClick={() => setActiveTab('sorties')}
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
