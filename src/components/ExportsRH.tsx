import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProfilRow {
  id: string;
  matricule_tca: string | null;
  prenom: string;
  nom: string;
  email: string;
  tel: string | null;
  statut: string | null;
  modele_contrat: string | null;
  poste: string | null;
  date_entree: string | null;
  date_sortie: string | null;
  site_id: string | null;
  secteur_id: string | null;
  site: { nom: string } | null;
  secteur: { nom: string } | null;
}

interface OptionRef {
  id: string;
  nom: string;
}

export function ExportsRH() {
  const [salaries, setSalaries] = useState<ProfilRow[]>([]);
  const [sites, setSites] = useState<OptionRef[]>([]);
  const [secteurs, setSecteurs] = useState<OptionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  // Filtres
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterContrat, setFilterContrat] = useState<string>('tous');
  const [filterSecteur, setFilterSecteur] = useState<string>('tous');
  const [filterSite, setFilterSite] = useState<string>('tous');
  const [filterDateDebut, setFilterDateDebut] = useState<string>('');
  const [filterDateFin, setFilterDateFin] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [profilsRes, sitesRes, secteursRes] = await Promise.all([
        supabase
          .from('profil')
          .select(`
            id, matricule_tca, prenom, nom, email, tel, statut,
            modele_contrat, poste, date_entree, date_sortie,
            site_id, secteur_id,
            site:site_id ( nom ),
            secteur:secteur_id ( nom )
          `)
          .is('deleted_at', null)
          .order('nom', { ascending: true }),
        supabase.from('site').select('id, nom').order('nom'),
        supabase.from('secteur').select('id, nom').order('nom'),
      ]);

      if (profilsRes.error) throw profilsRes.error;
      if (sitesRes.error) throw sitesRes.error;
      if (secteursRes.error) throw secteursRes.error;

      setSalaries((profilsRes.data as any) || []);
      setSites(sitesRes.data || []);
      setSecteurs(secteursRes.data || []);
    } catch (err) {
      console.error('Erreur chargement exports RH:', err);
      alert('Erreur lors du chargement des données. Voir la console.');
    } finally {
      setLoading(false);
    }
  }

  // Listes uniques pour les filtres (calculées depuis les données chargées)
  const statutsDisponibles = useMemo(() => {
    const set = new Set<string>();
    salaries.forEach((s) => { if (s.statut) set.add(s.statut); });
    return Array.from(set).sort();
  }, [salaries]);

  const contratsDisponibles = useMemo(() => {
    const set = new Set<string>();
    salaries.forEach((s) => { if (s.modele_contrat) set.add(s.modele_contrat); });
    return Array.from(set).sort();
  }, [salaries]);

  // Données filtrées
  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      if (filterStatut !== 'tous' && s.statut !== filterStatut) return false;
      if (filterContrat !== 'tous' && s.modele_contrat !== filterContrat) return false;
      if (filterSite !== 'tous' && s.site_id !== filterSite) return false;
      if (filterSecteur !== 'tous' && s.secteur_id !== filterSecteur) return false;
      if (filterDateDebut && (!s.date_entree || s.date_entree < filterDateDebut)) return false;
      if (filterDateFin && (!s.date_entree || s.date_entree > filterDateFin)) return false;
      return true;
    });
  }, [salaries, filterStatut, filterContrat, filterSite, filterSecteur, filterDateDebut, filterDateFin]);

  function formatDate(d: string | null): string {
    if (!d) return '';
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch {
      return d;
    }
  }

  function buildExportRows() {
    return filteredSalaries.map((s) => ({
      'Matricule TCA': s.matricule_tca || '',
      'Prénom': s.prenom || '',
      'Nom': s.nom || '',
      'Email': s.email || '',
      'Téléphone': s.tel || '',
      'Type de contrat': s.modele_contrat || '',
      'Poste': s.poste || '',
      "Date d'entrée": formatDate(s.date_entree),
      'Date de sortie': formatDate(s.date_sortie),
      'Statut': s.statut || '',
      'Site': s.site?.nom || '',
      'Secteur': s.secteur?.nom || '',
    }));
  }

  function handleExportCSV() {
    setExporting('csv');
    try {
      const rows = buildExportRows();
      if (rows.length === 0) {
        alert('Aucun salarié à exporter avec les filtres actuels.');
        return;
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(';'),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const val = (row as any)[h] ?? '';
              const str = String(val);
              if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(';')
        ),
      ];

      // BOM UTF-8 pour qu'Excel ouvre correctement les accents
      const csvContent = '\uFEFF' + csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_salaries_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export CSV:', err);
      alert("Erreur lors de l'export CSV. Voir la console.");
    } finally {
      setExporting(null);
    }
  }

  function handleExportXLSX() {
    setExporting('xlsx');
    try {
      const rows = buildExportRows();
      if (rows.length === 0) {
        alert('Aucun salarié à exporter avec les filtres actuels.');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Largeurs de colonnes automatiques (min 10, max 40)
      const headers = Object.keys(rows[0]);
      const colWidths = headers.map((key) => {
        const maxLen = Math.max(
          key.length,
          ...rows.map((r) => String((r as any)[key] ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salariés');

      const filename = `export_salaries_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Erreur export XLSX:', err);
      alert("Erreur lors de l'export Excel. Voir la console.");
    } finally {
      setExporting(null);
    }
  }

  function resetFilters() {
    setFilterStatut('tous');
    setFilterContrat('tous');
    setFilterSecteur('tous');
    setFilterSite('tous');
    setFilterDateDebut('');
    setFilterDateFin('');
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
        <p className="mt-3 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Exports RH</h2>
        <p className="text-gray-600 text-sm">
          Exportez la liste des salariés au format CSV ou Excel, avec filtres personnalisés.
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="tous">Tous ({salaries.length})</option>
              {statutsDisponibles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Type contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
            <select
              value={filterContrat}
              onChange={(e) => setFilterContrat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="tous">Tous</option>
              {contratsDisponibles.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Secteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <select
              value={filterSecteur}
              onChange={(e) => setFilterSecteur(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="tous">Tous</option>
              {secteurs.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="tous">Tous</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>

          {/* Date entrée début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'entrée à partir du
            </label>
            <input
              type="date"
              value={filterDateDebut}
              onChange={(e) => setFilterDateDebut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          {/* Date entrée fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'entrée jusqu'au
            </label>
            <input
              type="date"
              value={filterDateFin}
              onChange={(e) => setFilterDateFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      {/* Compteur + boutons d'export */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">Résultat du filtre</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredSalaries.length} salarié{filteredSalaries.length > 1 ? 's' : ''}
              <span className="text-sm font-normal text-gray-500 ml-2">
                / {salaries.length} au total
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              disabled={exporting !== null || filteredSalaries.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-primary-500 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Exporter en CSV
            </button>

            <button
              onClick={handleExportXLSX}
              disabled={exporting !== null || filteredSalaries.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-lg transition-all font-medium text-sm shadow-soft hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'xlsx' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Exporter en Excel
            </button>
          </div>
        </div>
      </div>

      {/* Aperçu des colonnes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Colonnes incluses dans l'export
        </h4>
        <p className="text-sm text-blue-800">
          Matricule TCA · Prénom · Nom · Email · Téléphone · Type de contrat · Poste ·
          Date d'entrée · Date de sortie · Statut · Site · Secteur
        </p>
      </div>
    </div>
  );
}