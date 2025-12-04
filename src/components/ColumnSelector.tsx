import { useState, useEffect, useRef } from 'react';
import { Columns, ChevronDown, ChevronUp } from 'lucide-react';

export interface ColumnConfig {
  key: string;
  label: string;
  category: string;
  defaultVisible: boolean;
}

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function ColumnSelector({ columns, visibleColumns, onColumnsChange }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Identité', 'Contrat']));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(new Set(columns.map(col => col.category)));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleColumn = (columnKey: string) => {
    const newVisible = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(k => k !== columnKey)
      : [...visibleColumns, columnKey];
    onColumnsChange(newVisible);
  };

  const selectAll = () => {
    onColumnsChange(columns.map(col => col.key));
  };

  const deselectAll = () => {
    onColumnsChange(columns.filter(col => col.key === 'nom' || col.key === 'prenom').map(col => col.key));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Columns className="w-4 h-4" />
        <span>Colonnes ({visibleColumns.length})</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Tout sélectionner
              </button>
              <button
                onClick={deselectAll}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div className="p-2">
            {categories.map(category => {
              const categoryColumns = columns.filter(col => col.category === category);
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900">{category}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-2 mt-1 space-y-1">
                      {categoryColumns.map(col => (
                        <label
                          key={col.key}
                          className="flex items-center px-3 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                          />
                          <span className="text-sm text-gray-700">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
