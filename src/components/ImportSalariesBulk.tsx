import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Download, CheckCircle, AlertCircle, AlertTriangle, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ParsedEmployee {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  selected: boolean;
  data: {
    matricule_tca?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    date_debut_contrat?: string;
    date_fin_contrat?: string;
    numero_securite_sociale?: string;
    poste?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    nationalite?: string;
    genre?: string;
    nom_naissance?: string;
    adresse?: string;
    complement_adresse?: string;
    pays_naissance?: string;
    ville?: string;
    code_postal?: string;
    tel?: string;
    iban?: string;
    bic?: string;
    modele_contrat?: string;
    periode_essai?: string;
    avenant_1_date_debut?: string;
    avenant_1_date_fin?: string;
    avenant_2_date_fin?: string;
    secteur_nom?: string;
    secteur_id?: string;
    type_piece_identite?: string;
    titre_sejour_fin_validite?: string;
    date_visite_medicale?: string;
    date_fin_visite_medicale?: string;
  };
}

interface ImportResult {
  success: number;
  duplicates: number;
  errors: number;
  details: {
    type: 'success' | 'duplicate' | 'error';
    rowNumber: number;
    name: string;
    message: string;
  }[];
}

export function ImportSalariesBulk() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [reportExpanded, setReportExpanded] = useState(true);
  const tableRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

  const downloadTemplate = () => {
    const headers = [
      'MATRICULE TCA',
      'Nom',
      'Prénom',
      'E-mail',
      'Date de début du contrat (jj/mm/aaaa)',
      'Date de fin du contrat (jj/mm/aaaa)',
      'Numéro de sécurité sociale',
      'Poste',
      'Date de naissance (jj/mm/aaaa)',
      'VILLE DE NAISSANCE',
      'Nationalité',
      'Genre',
      'Nom de naissance',
      'Adresse ligne 1',
      'Adresse ligne 2',
      'Pays de naissance',
      'Ville',
      'Code postal',
      'Téléphone',
      'IBAN',
      'BIC',
      'Modeles de contrats',
      'Période d\'essai',
      'DATE DE DEBUT - AVEVANT1',
      'DATE DE FIN - AVENANT1',
      'DATE DE FIN - AVENANT2',
      'SECTEUR',
      'Type de pièce d\'identité',
      'TITRE DE SEJOUR - FIN DE VALIDITE',
      'DATE DE DEBUT - VISITE MEDICAL',
      'DATE DE FIN - VISITE MEDICAL',
    ];

    const exampleRow = [
      '12345',
      'Dupont',
      'Jean',
      'jean.dupont@example.com',
      '01/01/2024',
      '',
      '1 85 03 75 116 001 23',
      'Agent de sécurité',
      '15/03/1985',
      'Paris',
      'Française',
      'Homme',
      'Dupont',
      '123 Rue de la République',
      'Bâtiment B',
      'France',
      'Paris',
      '75001',
      '0612345678',
      'FR7612345678901234567890123',
      'BNPAFRPPXXX',
      'CDI Standard',
      '3 mois',
      '',
      '',
      '',
      'Niort',
      'CNI',
      '',
      '01/01/2024',
      '01/01/2026',
    ];

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + exampleRow.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_salaries.csv';
    link.click();
  };

  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.trim() === '') return undefined;

    const cleaned = dateStr.trim();
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    return undefined;
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();

    try {
      let rows: any[] = [];

      if (fileExtension === 'csv') {
        const text = await uploadedFile.text();
        const result = Papa.parse(text, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true,
        });
        rows = result.data;
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet);
      }

      console.log('🔍 DEBUG: First row keys:', rows[0] ? Object.keys(rows[0]) : 'No rows');
      console.log('🔍 DEBUG: First row data:', rows[0]);

      await parseAndValidateRows(rows);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Erreur lors de la lecture du fichier. Vérifiez le format.');
    }
  };

  const parseAndValidateRows = async (rows: any[]) => {
    const { data: secteurs } = await supabase.from('secteur').select('id, nom');
    const secteurMap = new Map(secteurs?.map((s) => [s.nom.toLowerCase(), s.id]) || []);

    const { data: existingEmails } = await supabase
      .from('profil')
      .select('email')
      .in('email', rows.map((r) => r['E-mail'] || '').filter((e) => e));

    const existingEmailSet = new Set(existingEmails?.map((e) => e.email.toLowerCase()) || []);

    const parsed: ParsedEmployee[] = rows.map((row, index) => {
      const nom = row['Nom']?.trim() || '';
      const prenom = row['Prénom']?.trim() || '';
      const email = row['E-mail']?.trim() || '';
      const secteurNom = row['SECTEUR']?.trim() || '';

      if (index === 0) {
        console.log('🔍 DEBUG Row data:', { nom, prenom, email, secteurNom });
        console.log('🔍 DEBUG Raw row:', row);
      }

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Prêt à importer';
      let selected = true;

      if (!nom && !prenom && !email) {
        status = 'error';
        statusMessage = 'Champs obligatoires manquants: Nom, Prénom ou Email';
        selected = false;
      } else if (email && existingEmailSet.has(email.toLowerCase())) {
        status = 'error';
        statusMessage = `Email "${email}" déjà existant dans la base - Vérifiez le fichier source`;
        selected = false;
      } else if (secteurNom && !secteurMap.has(secteurNom.toLowerCase())) {
        status = 'warning';
        statusMessage = `Secteur "${secteurNom}" introuvable - Salarié sera créé sans secteur`;
      }

      const secteurId = secteurNom ? secteurMap.get(secteurNom.toLowerCase()) : undefined;

      return {
        rowNumber: index + 2,
        status,
        statusMessage,
        selected,
        data: {
          matricule_tca: row['MATRICULE TCA']?.trim() || undefined,
          nom,
          prenom,
          email: email || undefined,
          date_debut_contrat: parseDate(row['Date de début du contrat (jj/mm/aaaa)']),
          date_fin_contrat: parseDate(row['Date de fin du contrat (jj/mm/aaaa)']),
          numero_securite_sociale: row['Numéro de sécurité sociale']?.trim() || undefined,
          poste: row['Poste']?.trim() || undefined,
          date_naissance: parseDate(row['Date de naissance (jj/mm/aaaa)']),
          lieu_naissance: row['VILLE DE NAISSANCE']?.trim() || undefined,
          nationalite: row['Nationalité']?.trim() || undefined,
          genre: row['Genre']?.trim() || undefined,
          nom_naissance: row['Nom de naissance']?.trim() || undefined,
          adresse: row['Adresse ligne 1']?.trim() || undefined,
          complement_adresse: row['Adresse ligne 2']?.trim() || undefined,
          pays_naissance: row['Pays de naissance']?.trim() || undefined,
          ville: row['Ville']?.trim() || undefined,
          code_postal: row['Code postal']?.trim() || undefined,
          tel: row['Téléphone']?.trim() || undefined,
          iban: row['IBAN']?.trim() || undefined,
          bic: row['BIC']?.trim() || undefined,
          modele_contrat: row['Modeles de contrats']?.trim() || undefined,
          periode_essai: row['Période d\'essai']?.trim() || undefined,
          avenant_1_date_debut: parseDate(row['DATE DE DEBUT - AVEVANT1']),
          avenant_1_date_fin: parseDate(row['DATE DE FIN - AVENANT1']),
          avenant_2_date_fin: parseDate(row['DATE DE FIN - AVENANT2']),
          secteur_nom: secteurNom || undefined,
          secteur_id: secteurId,
          type_piece_identite: row['Type de pièce d\'identité']?.trim() || undefined,
          titre_sejour_fin_validite: parseDate(row['TITRE DE SEJOUR - FIN DE VALIDITE']),
          date_visite_medicale: parseDate(row['DATE DE DEBUT - VISITE MEDICAL']),
          date_fin_visite_medicale: parseDate(row['DATE DE FIN - VISITE MEDICAL']),
        },
      };
    });

    console.log('🔍 DEBUG Parsed data (first 3):', parsed.slice(0, 3));
    console.log('🔍 DEBUG First employee prenom:', parsed[0]?.data?.prenom);

    setParsedData(parsed);
  };

  const handleImport = async () => {
    const toImport = parsedData.filter((p) => p.selected);
    setImporting(true);
    setImportProgress({ current: 0, total: toImport.length });

    const result: ImportResult = {
      success: 0,
      duplicates: 0,
      errors: 0,
      details: [],
    };

    for (let i = 0; i < toImport.length; i++) {
      const emp = toImport[i];
      setImportProgress({ current: i + 1, total: toImport.length });

      try {
        const { data: profil, error: profilError } = await supabase
          .from('profil')
          .insert({
            matricule_tca: emp.data.matricule_tca,
            nom: emp.data.nom || 'N/A',
            prenom: emp.data.prenom || 'N/A',
            email: emp.data.email || `noemail_${Date.now()}_${i}@temp.com`,
            tel: emp.data.tel,
            genre: emp.data.genre,
            date_naissance: emp.data.date_naissance,
            lieu_naissance: emp.data.lieu_naissance,
            pays_naissance: emp.data.pays_naissance,
            nationalite: emp.data.nationalite,
            nom_naissance: emp.data.nom_naissance,
            adresse: emp.data.adresse,
            complement_adresse: emp.data.complement_adresse,
            ville: emp.data.ville,
            code_postal: emp.data.code_postal,
            numero_securite_sociale: emp.data.numero_securite_sociale,
            iban: emp.data.iban,
            bic: emp.data.bic,
            poste: emp.data.poste,
            type_piece_identite: emp.data.type_piece_identite,
            titre_sejour_fin_validite: emp.data.titre_sejour_fin_validite,
            date_visite_medicale: emp.data.date_visite_medicale,
            date_fin_visite_medicale: emp.data.date_fin_visite_medicale,
            periode_essai: emp.data.periode_essai,
            modele_contrat: emp.data.modele_contrat,
            secteur_id: emp.data.secteur_id,
            date_entree: emp.data.date_debut_contrat || new Date().toISOString().split('T')[0],
            statut: 'actif',
            role: 'salarie',
          })
          .select()
          .single();

        if (profilError) throw profilError;

        if (emp.data.date_debut_contrat) {
          await supabase.from('contrat').insert({
            profil_id: profil.id,
            type: emp.data.date_fin_contrat ? 'cdd' : 'cdi',
            date_debut: emp.data.date_debut_contrat,
            date_fin: emp.data.date_fin_contrat,
            esign: 'signed',
          });
        }

        if (emp.data.avenant_1_date_debut) {
          await supabase.from('contrat').insert({
            profil_id: profil.id,
            type: 'avenant',
            date_debut: emp.data.avenant_1_date_debut,
            date_fin: emp.data.avenant_1_date_fin,
            esign: 'signed',
          });
        }

        result.success++;
        result.details.push({
          type: 'success',
          rowNumber: emp.rowNumber,
          name: `${emp.data.prenom} ${emp.data.nom}`,
          message: 'Importé avec succès',
        });
      } catch (error: any) {
        result.errors++;
        result.details.push({
          type: 'error',
          rowNumber: emp.rowNumber,
          name: `${emp.data.prenom} ${emp.data.nom}`,
          message: error.message || 'Erreur inconnue',
        });
      }
    }

    setImporting(false);
    setImportResult(result);
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
  };

  const scrollToRow = (rowNumber: number) => {
    const element = tableRefs.current[rowNumber];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-blue-100');
      setTimeout(() => {
        element.classList.remove('bg-blue-100');
      }, 2000);
    }
  };

  const exportProblemsCSV = (type: 'error' | 'warning') => {
    const problems = parsedData.filter((emp) => emp.status === type);

    if (problems.length === 0) {
      alert(`Aucun ${type === 'error' ? 'erreur' : 'avertissement'} à exporter`);
      return;
    }

    const headers = [
      'Numéro de ligne',
      'Nom',
      'Prénom',
      'Email',
      'Secteur demandé',
      'Type de problème',
      'Message détaillé'
    ];

    const rows = problems.map((emp) => [
      emp.rowNumber,
      emp.data.nom || '',
      emp.data.prenom || '',
      emp.data.email || '',
      emp.data.secteur_nom || '',
      type === 'error' ? 'Erreur' : 'Avertissement',
      emp.statusMessage
    ]);

    const csvContent = '\uFEFF' +
      headers.join(';') + '\n' +
      rows.map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type === 'error' ? 'erreurs' : 'avertissements'}_import_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredData = parsedData.filter((emp) => {
    if (filter === 'all') return true;
    return emp.status === filter;
  });

  const counts = {
    valid: parsedData.filter((e) => e.status === 'valid').length,
    warning: parsedData.filter((e) => e.status === 'warning').length,
    error: parsedData.filter((e) => e.status === 'error').length,
    selected: parsedData.filter((e) => e.selected).length,
  };

  const groupProblemsByType = (type: 'error' | 'warning') => {
    const problems = parsedData.filter((emp) => emp.status === type);
    const grouped = new Map<string, number[]>();

    problems.forEach((emp) => {
      let problemType = '';

      if (type === 'error') {
        if (emp.statusMessage.includes('Champs obligatoires manquants')) {
          problemType = 'Lignes vides ou données manquantes';
        } else if (emp.statusMessage.includes('Email')) {
          problemType = `Email déjà existant - ${emp.data.email}`;
        }
      } else {
        if (emp.statusMessage.includes('Secteur')) {
          const secteur = emp.data.secteur_nom || 'inconnu';
          problemType = `Secteur "${secteur}" non trouvé`;
        }
      }

      if (!grouped.has(problemType)) {
        grouped.set(problemType, []);
      }
      grouped.get(problemType)?.push(emp.rowNumber);
    });

    return Array.from(grouped.entries()).map(([type, rows]) => ({
      type,
      count: rows.length,
      rows: rows.sort((a, b) => a - b)
    }));
  };

  if (importResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import terminé</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{importResult.success}</div>
            <div className="text-sm text-green-600">Succès</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{importResult.errors}</div>
            <div className="text-sm text-red-600">Erreurs</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{importResult.success + importResult.errors}</div>
            <div className="text-sm text-blue-600">Total traité</div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto mb-6">
          {importResult.details.map((detail, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 mb-2 rounded-lg ${
                detail.type === 'success' ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              {detail.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Ligne {detail.rowNumber}: {detail.name}
                </div>
                <div className="text-sm text-gray-600">{detail.message}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={reset}
            className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Importer un autre fichier
          </button>
        </div>
      </div>
    );
  }

  if (importing) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import en cours...</h2>
        <p className="text-gray-600 mb-4">
          {importProgress.current} / {importProgress.total} salariés traités
        </p>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-4 rounded-full transition-all"
            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  }

  if (parsedData.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Prévisualisation de l'import</h2>
              <p className="text-gray-600 mt-1">{file?.name}</p>
            </div>
            <button
              onClick={reset}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{counts.valid}</div>
              <div className="text-xs text-green-600">Valides</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{counts.warning}</div>
              <div className="text-xs text-orange-600">Avertissements</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{counts.error}</div>
              <div className="text-xs text-red-600">Erreurs</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{counts.selected}</div>
              <div className="text-xs text-blue-600">Sélectionnés</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tout afficher
            </button>
            <button
              onClick={() => setFilter('valid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'valid'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Valides
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'warning'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              Avertissements
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Erreurs
            </button>
          </div>
        </div>

        {(counts.error > 0 || counts.warning > 0) && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Rapport de validation
                </h3>
                <span className="text-sm text-gray-600">
                  ({counts.error + counts.warning} problème{counts.error + counts.warning > 1 ? 's' : ''} détecté{counts.error + counts.warning > 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {reportExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Masquer
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Afficher
                  </>
                )}
              </button>
            </div>

            {reportExpanded && (
              <div className="space-y-6">
                {counts.error > 0 && (
                  <div className="bg-white rounded-lg border border-red-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-900">
                          Erreurs trouvées ({counts.error})
                        </h4>
                      </div>
                      <button
                        onClick={() => exportProblemsCSV('error')}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Exporter (CSV)
                      </button>
                    </div>
                    <div className="space-y-3">
                      {groupProblemsByType('error').map((group, idx) => (
                        <div key={idx} className="bg-red-50 rounded p-3">
                          <div className="font-medium text-red-900 mb-2">
                            {group.type} ({group.count} ligne{group.count > 1 ? 's' : ''})
                          </div>
                          <div className="text-sm text-red-700">
                            <span className="font-medium">Lignes concernées:</span>{' '}
                            {group.rows.slice(0, 15).map((row, i) => (
                              <span key={row}>
                                <button
                                  onClick={() => scrollToRow(row)}
                                  className="hover:underline text-red-600 font-medium"
                                >
                                  {row}
                                </button>
                                {i < Math.min(14, group.rows.length - 1) && ', '}
                              </span>
                            ))}
                            {group.rows.length > 15 && (
                              <span className="text-red-600">... et {group.rows.length - 15} autre{group.rows.length - 15 > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {counts.warning > 0 && (
                  <div className="bg-white rounded-lg border border-orange-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h4 className="font-semibold text-orange-900">
                          Avertissements trouvés ({counts.warning})
                        </h4>
                      </div>
                      <button
                        onClick={() => exportProblemsCSV('warning')}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Exporter (CSV)
                      </button>
                    </div>
                    <div className="space-y-3">
                      {groupProblemsByType('warning').map((group, idx) => (
                        <div key={idx} className="bg-orange-50 rounded p-3">
                          <div className="font-medium text-orange-900 mb-2">
                            {group.type} ({group.count} ligne{group.count > 1 ? 's' : ''})
                          </div>
                          <div className="text-sm text-orange-700">
                            <span className="font-medium">Lignes concernées:</span>{' '}
                            {group.rows.slice(0, 15).map((row, i) => (
                              <span key={row}>
                                <button
                                  onClick={() => scrollToRow(row)}
                                  className="hover:underline text-orange-600 font-medium"
                                >
                                  {row}
                                </button>
                                {i < Math.min(14, group.rows.length - 1) && ', '}
                              </span>
                            ))}
                            {group.rows.length > 15 && (
                              <span className="text-orange-600">... et {group.rows.length - 15} autre{group.rows.length - 15 > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="max-h-96 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={parsedData.every((e) => e.selected || e.status === 'error')}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setParsedData(
                        parsedData.map((emp) =>
                          emp.status !== 'error' ? { ...emp, selected: checked } : emp
                        )
                      );
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '25%', minWidth: '200px' }}>
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ligne
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '120px' }}>
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '120px' }}>
                  Prénom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '180px' }}>
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Secteur
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((emp) => (
                <tr
                  key={emp.rowNumber}
                  ref={(el) => (tableRefs.current[emp.rowNumber] = el)}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={emp.selected}
                      disabled={emp.status === 'error'}
                      onChange={(e) => {
                        setParsedData(
                          parsedData.map((p) =>
                            p.rowNumber === emp.rowNumber
                              ? { ...p, selected: e.target.checked }
                              : p
                          )
                        );
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {emp.status === 'valid' && (
                      <CheckCircle className="w-5 h-5 text-green-600" title={emp.statusMessage} />
                    )}
                    {emp.status === 'warning' && (
                      <AlertTriangle className="w-5 h-5 text-orange-600" title={emp.statusMessage} />
                    )}
                    {emp.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600" title={emp.statusMessage} />
                    )}
                  </td>
                  <td className={`px-4 py-3 text-sm ${
                    emp.status === 'error'
                      ? 'bg-red-50 text-red-900 font-bold'
                      : emp.status === 'warning'
                      ? 'bg-orange-50 text-orange-900'
                      : 'text-gray-700'
                  }`}>
                    {emp.statusMessage}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{emp.rowNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.nom || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.prenom || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.secteur_nom || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleImport}
            disabled={counts.selected === 0}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Importer {counts.selected} salarié{counts.selected > 1 ? 's' : ''} sélectionné{counts.selected > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary-500" />
          <h2 className="text-2xl font-bold text-gray-900">Import en masse de salariés</h2>
        </div>
        <p className="text-gray-600 mt-2">
          Importez plusieurs salariés à la fois depuis un fichier CSV ou Excel
        </p>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Télécharger le modèle CSV
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Utilisez ce modèle pour préparer vos données au bon format
          </p>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) handleFileUpload(droppedFile);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Glissez-déposez votre fichier ici
          </h3>
          <p className="text-gray-600 mb-4">ou cliquez pour parcourir</p>
          <p className="text-sm text-gray-500">Formats acceptés: CSV, XLSX, XLS</p>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const uploadedFile = e.target.files?.[0];
              if (uploadedFile) handleFileUpload(uploadedFile);
            }}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
