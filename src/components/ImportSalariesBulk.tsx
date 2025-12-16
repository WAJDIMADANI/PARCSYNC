import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Download, CheckCircle, AlertCircle, AlertTriangle, FileText, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnSelector, ColumnConfig } from './ColumnSelector';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { EmployeeCard } from './EmployeeCard';
import { ContractBadge } from './ContractBadge';

interface ParsedEmployee {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  selected: boolean;
  existing_profile_id?: string;
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
    date_fin_periode_essai?: string | null;
    statut_contrat?: string;
    avenant_1_date_debut?: string;
    avenant_1_date_fin?: string;
    avenant_2_date_debut?: string;
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
  const [contractFilter, setContractFilter] = useState<'all' | 'cdi' | 'cdd' | 'avenant'>('all');
  const [reportExpanded, setReportExpanded] = useState(true);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [mappingWarnings, setMappingWarnings] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<ParsedEmployee | null>(null);
  const tableRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

  const columnConfigs: ColumnConfig[] = [
    { key: 'nom', label: 'Nom', category: 'Identité', defaultVisible: true },
    { key: 'prenom', label: 'Prénom', category: 'Identité', defaultVisible: true },
    { key: 'email', label: 'Email', category: 'Identité', defaultVisible: true },
    { key: 'matricule', label: 'Matricule TCA', category: 'Identité', defaultVisible: false },
    { key: 'genre', label: 'Genre', category: 'Identité', defaultVisible: false },
    { key: 'date_naissance', label: 'Date de naissance', category: 'Identité', defaultVisible: false },
    { key: 'type_contrat', label: 'Type Contrat', category: 'Contrat', defaultVisible: true },
    { key: 'date_debut', label: 'Date début', category: 'Contrat', defaultVisible: true },
    { key: 'date_fin', label: 'Date fin', category: 'Contrat', defaultVisible: false },
    { key: 'statut_contrat', label: 'Statut', category: 'Contrat', defaultVisible: true },
    { key: 'periode_essai', label: 'Période d\'essai', category: 'Contrat', defaultVisible: false },
    { key: 'poste', label: 'Poste', category: 'Contrat', defaultVisible: false },
    { key: 'secteur', label: 'Secteur', category: 'Contrat', defaultVisible: true },
    { key: 'avenant_1_debut', label: 'Avenant 1 Début', category: 'Avenants', defaultVisible: false },
    { key: 'avenant_1_fin', label: 'Avenant 1 Fin', category: 'Avenants', defaultVisible: false },
    { key: 'avenant_2_debut', label: 'Avenant 2 Début', category: 'Avenants', defaultVisible: false },
    { key: 'avenant_2_fin', label: 'Avenant 2 Fin', category: 'Avenants', defaultVisible: false },
    { key: 'tel', label: 'Téléphone', category: 'Coordonnées', defaultVisible: false },
    { key: 'adresse', label: 'Adresse', category: 'Coordonnées', defaultVisible: false },
    { key: 'ville', label: 'Ville', category: 'Coordonnées', defaultVisible: false },
    { key: 'code_postal', label: 'Code postal', category: 'Coordonnées', defaultVisible: false },
    { key: 'type_piece', label: 'Type pièce', category: 'Documents', defaultVisible: false },
    { key: 'visite_medicale', label: 'Visite médicale', category: 'Documents', defaultVisible: false },
  ];

  const getDefaultVisibleColumns = () => {
    const saved = localStorage.getItem('import-visible-columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return columnConfigs.filter(c => c.defaultVisible).map(c => c.key);
      }
    }
    return columnConfigs.filter(c => c.defaultVisible).map(c => c.key);
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>(getDefaultVisibleColumns());

  useEffect(() => {
    localStorage.setItem('import-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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
      'Statut',
      'DATE DE DEBUT - AVEVANT1',
      'DATE DE FIN - AVENANT1',
      'DATE DE DEBUT - AVENANT2',
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
      '',
      'signé',
      '3 mois',
      '',
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

  const normalizeColumnName = (name: string): string => {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  };

  const extractKeywords = (columnName: string): string[] => {
    return columnName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  };

  const verifyKeywords = (targetColumn: string, actualColumn: string): boolean => {
    const keywordRules: { [key: string]: string[][] } = {
      'pays_naissance': [['pays'], ['naissance']],
      'nom_naissance': [['nom'], ['naissance']],
      'lieu_naissance': [['lieu', 'ville'], ['naissance']],
      'date_visite_medicale': [['date', 'debut'], ['visite'], ['medical', 'medicale']],
      'date_fin_visite_medicale': [['date', 'fin'], ['visite'], ['medical', 'medicale']],
      'titre_sejour_fin_validite': [['titre'], ['sejour']],
      'date_debut_contrat': [['date'], ['debut'], ['contrat']],
      'date_fin_contrat': [['date'], ['fin'], ['contrat']],
    };

    const rules = keywordRules[targetColumn];
    if (!rules) return true;

    const actualKeywords = extractKeywords(actualColumn);

    for (const ruleGroup of rules) {
      const hasMatch = ruleGroup.some(keyword =>
        actualKeywords.some(actualWord => actualWord.includes(keyword) || keyword.includes(actualWord))
      );
      if (!hasMatch) {
        return false;
      }
    }

    return true;
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    let matches = 0;
    const range = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    return matches / maxLen;
  };

  const createColumnMapper = (row: any) => {
    const columnMap = new Map<string, string>();
    const unmappedColumns: string[] = [];
    const mappingWarnings: string[] = [];
    const usedActualColumns = new Set<string>();

    const expectedColumns = {
      'matricule_tca': ['MATRICULE TCA', 'matricule tca', 'matricule'],
      'nom': ['Nom', 'nom', 'NOM'],
      'prenom': ['Prénom', 'Prenom', 'prénom', 'prenom', 'PRENOM', 'Pr�nom', 'Pr�Nom', 'Pr�NOM'],
      'email': ['E-mail', 'Email', 'e-mail', 'email', 'EMAIL', 'E�mail'],
      'date_debut_contrat': ['Date de début du contrat (jj/mm/aaaa)', 'date debut contrat', 'date_debut', 'Date de d�but du contrat'],
      'date_fin_contrat': ['Date de fin du contrat (jj/mm/aaaa)', 'date fin contrat', 'date_fin'],
      'numero_securite_sociale': ['Numéro de sécurité sociale', 'numero securite sociale', 'securite sociale', 'Num�ro de s�curit� sociale'],
      'poste': ['Poste', 'poste', 'POSTE'],
      'date_naissance': ['Date de naissance (jj/mm/aaaa)', 'date naissance', 'date_naissance'],
      'lieu_naissance': ['VILLE DE NAISSANCE', 'lieu naissance', 'ville naissance'],
      'nationalite': ['Nationalité', 'Nationalite', 'nationalite', 'NATIONALITE', 'Nationalit�'],
      'genre': ['Genre', 'genre', 'GENRE'],
      'nom_naissance': ['Nom de naissance', 'nom naissance', 'nom_naissance'],
      'adresse': ['Adresse ligne 1', 'adresse', 'ADRESSE'],
      'complement_adresse': ['Adresse ligne 2', 'complement adresse', 'adresse 2', 'compl�ment adresse'],
      'pays_naissance': ['Pays de naissance', 'pays naissance', 'pays_naissance'],
      'ville': ['Ville', 'ville', 'VILLE'],
      'code_postal': ['Code postal', 'code postal', 'code_postal'],
      'tel': ['Téléphone', 'Telephone', 'telephone', 'tel', 'TEL', 'T�l�phone'],
      'iban': ['IBAN', 'iban'],
      'bic': ['BIC', 'bic'],
      'modele_contrat': ['Modeles de contrats', 'modele contrat', 'modele_contrat', 'Mod�les de contrats'],
      'periode_essai': ['Période d\'essai', 'periode essai', 'periode_essai', 'P�riode d\'essai'],
      'statut_contrat': ['Statut', 'statut', 'STATUT', 'Statut contrat', 'statut contrat'],
      'avenant_1_date_debut': ['DATE DE DEBUT - AVEVANT1', 'avenant 1 debut', 'avenant1_debut', 'DATE DE D�BUT - AVEVANT1'],
      'avenant_1_date_fin': ['DATE DE FIN - AVENANT1', 'avenant 1 fin', 'avenant1_fin'],
      'avenant_2_date_debut': ['DATE DE DEBUT - AVENANT2', 'avenant 2 debut', 'avenant2_debut', 'DATE DE D�BUT - AVENANT2'],
      'avenant_2_date_fin': ['DATE DE FIN - AVENANT2', 'avenant 2 fin', 'avenant2_fin'],
      'secteur': ['SECTEUR', 'Secteur', 'secteur'],
      'type_piece_identite': ['Type de pièce d\'identité', 'type piece identite', 'piece identite', 'Type de pi�ce d\'identit�'],
      'titre_sejour_fin_validite': ['TITRE DE SEJOUR - FIN DE VALIDITE', 'titre sejour validite', 'TITRE DE S�JOUR - FIN DE VALIDITE'],
      'date_visite_medicale': ['DATE DE DEBUT - VISITE MEDICAL', 'visite medicale debut', 'DATE DE D�BUT - VISITE MEDICAL'],
      'date_fin_visite_medicale': ['DATE DE FIN - VISITE MEDICAL', 'visite medicale fin', 'DATE DE FIN - VISITE M�DICAL'],
    };

    const actualColumns = Object.keys(row);
    console.log('🔍 Starting column mapping process...');
    console.log('📋 Available columns in file:', actualColumns);

    for (const [targetColumn, variants] of Object.entries(expectedColumns)) {
      let found = false;

      for (const variant of variants) {
        const normalizedVariant = normalizeColumnName(variant);

        for (const actualColumn of actualColumns) {
          if (usedActualColumns.has(actualColumn)) continue;

          const normalizedActual = normalizeColumnName(actualColumn);

          if (normalizedActual === normalizedVariant || actualColumn === variant) {
            columnMap.set(targetColumn, actualColumn);
            usedActualColumns.add(actualColumn);
            console.log(`✅ Exact match: "${targetColumn}" -> "${actualColumn}"`);
            found = true;
            break;
          }
        }

        if (found) break;
      }

      if (!found) {
        let bestMatch: { column: string; similarity: number } | null = null;

        for (const actualColumn of actualColumns) {
          if (usedActualColumns.has(actualColumn)) continue;

          const similarity = calculateSimilarity(
            normalizeColumnName(variants[0]),
            normalizeColumnName(actualColumn)
          );

          const keywordsValid = verifyKeywords(targetColumn, actualColumn);

          console.log(`🔍 Checking "${targetColumn}" vs "${actualColumn}": similarity=${Math.round(similarity * 100)}%, keywords=${keywordsValid}`);

          if (similarity > 0.85 && keywordsValid) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = { column: actualColumn, similarity };
            }
          }
        }

        if (bestMatch) {
          columnMap.set(targetColumn, bestMatch.column);
          usedActualColumns.add(bestMatch.column);
          mappingWarnings.push(`Colonne "${targetColumn}" mappée à "${bestMatch.column}" (similarité: ${Math.round(bestMatch.similarity * 100)}%)`);
          console.log(`⚠️ Approximate match: "${targetColumn}" -> "${bestMatch.column}" (${Math.round(bestMatch.similarity * 100)}%)`);
          found = true;
        }
      }

      if (!found && ['nom', 'prenom', 'email', 'matricule_tca'].includes(targetColumn)) {
        unmappedColumns.push(targetColumn);
        console.error(`❌ Failed to map critical column: "${targetColumn}"`);
      }

      if (!found && targetColumn === 'modele_contrat') {
        console.warn(`⚠️ Column "modele_contrat" not found. Contract type information will not be displayed.`);
        console.warn('💡 Expected column names: "Modeles de contrats", "modele contrat", "modele_contrat"');
      }
    }

    if (unmappedColumns.length > 0) {
      console.warn('⚠️ Colonnes importantes non mappées:', unmappedColumns);
      console.warn('📋 Colonnes disponibles dans le fichier:', actualColumns);
    }

    if (mappingWarnings.length > 0) {
      console.info('ℹ️ Mappings approximatifs:', mappingWarnings);
    }

    if (!columnMap.has('modele_contrat')) {
      console.warn('📝 Tip: Make sure your CSV file has a column for contract models (e.g., "Modeles de contrats")');
    }

    console.log('✅ Mapping complete. Used columns:', Array.from(usedActualColumns));

    return { columnMap, unmappedColumns, mappingWarnings };
  };

  const getColumnValue = (row: any, columnMap: Map<string, string>, targetColumn: string): string => {
    const actualColumn = columnMap.get(targetColumn);
    return actualColumn ? (row[actualColumn]?.toString().trim() || '') : '';
  };

  const parseDate = (dateStr: string | Date | any, fieldName?: string): string | null => {
    // Accepter les dates vides - retourner null au lieu de undefined
    if (!dateStr || dateStr === '' || dateStr === 'undefined' || dateStr === 'null') {
      return null;
    }

    try {
      if (dateStr instanceof Date) {
        if (isNaN(dateStr.getTime())) {
          console.warn(`⚠️ Date invalide pour ${fieldName || 'champ inconnu'}: objet Date invalide`);
          return null;
        }
        const year = dateStr.getFullYear();

        // Vérifier que l'année est dans une plage raisonnable
        if (year < 1900 || year > 2100) {
          console.warn(`⚠️ Année hors limites pour ${fieldName || 'champ inconnu'}: ${year} (doit être entre 1900-2100)`);
          return null;
        }

        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      const cleaned = String(dateStr).trim();
      if (cleaned === '' || cleaned === 'undefined' || cleaned === 'null') {
        return null;
      }

      const parts = cleaned.split('/');
      if (parts.length !== 3) {
        console.warn(`⚠️ Format de date incorrect pour ${fieldName || 'champ inconnu'}: "${dateStr}" - Format attendu: JJ/MM/AAAA`);
        return null;
      }

      const dayNum = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      let yearNum = parseInt(parts[2], 10);

      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        console.warn(`⚠️ Date contient des valeurs non-numériques pour ${fieldName || 'champ inconnu'}: "${dateStr}"`);
        return null;
      }

      // Gérer les années à 2 chiffres
      if (yearNum < 100) {
        if (yearNum >= 0 && yearNum <= 50) {
          yearNum += 2000;
        } else {
          yearNum += 1900;
        }
        console.log(`ℹ️ Année à 2 chiffres convertie pour ${fieldName || 'champ inconnu'}: ${parts[2]} → ${yearNum}`);
      }

      // Vérifier que l'année est dans une plage raisonnable pour PostgreSQL
      if (yearNum < 1900 || yearNum > 2100) {
        console.warn(`⚠️ Année hors limites pour ${fieldName || 'champ inconnu'}: ${yearNum} dans "${dateStr}" (doit être entre 1900-2100)`);
        return null;
      }

      if (monthNum < 1 || monthNum > 12) {
        console.warn(`⚠️ Mois invalide pour ${fieldName || 'champ inconnu'}: ${monthNum} dans "${dateStr}"`);
        return null;
      }

      if (dayNum < 1 || dayNum > 31) {
        console.warn(`⚠️ Jour invalide pour ${fieldName || 'champ inconnu'}: ${dayNum} dans "${dateStr}"`);
        return null;
      }

      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      if (dayNum > daysInMonth) {
        console.warn(`⚠️ Jour invalide pour ${fieldName || 'champ inconnu'}: ${dayNum} pour le mois ${monthNum}/${yearNum} (ce mois a ${daysInMonth} jours)`);
        return null;
      }

      const day = String(dayNum).padStart(2, '0');
      const month = String(monthNum).padStart(2, '0');
      const year = String(yearNum);

      const isoDate = `${year}-${month}-${day}`;

      const testDate = new Date(isoDate);
      if (isNaN(testDate.getTime())) {
        console.warn(`⚠️ Date invalide après conversion pour ${fieldName || 'champ inconnu'}: "${dateStr}" → "${isoDate}"`);
        return null;
      }

      return isoDate;
    } catch (error) {
      console.warn(`⚠️ Erreur lors du parsing de la date pour ${fieldName || 'champ inconnu'}: "${dateStr}"`, error);
      return null;
    }
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();

    try {
      let rows: any[] = [];

      if (fileExtension === 'csv') {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
          reader.readAsText(uploadedFile, 'UTF-8');
        });
        const result = Papa.parse(text, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true,
        });
        rows = result.data;
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, {
          type: 'array',
          codepage: 65001,
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: 'dd/mm/yyyy',
          defval: ''
        });
      }

      if (rows.length > 0) {
        console.log('🔍 DEBUG: First row keys:', Object.keys(rows[0]));
        console.log('🔍 DEBUG: First row data:', rows[0]);

        const { columnMap, unmappedColumns: unmapped, mappingWarnings: warnings } = createColumnMapper(rows[0]);
        console.log('🔍 DEBUG: Column mapping:');
        columnMap.forEach((actualCol, targetCol) => {
          console.log(`  ${targetCol} -> "${actualCol}"`);
        });

        if (unmapped.length > 0) {
          console.error('❌ COLONNES NON MAPPÉES:', unmapped);
          setUnmappedColumns(unmapped);
        }

        if (warnings.length > 0) {
          console.warn('⚠️ MAPPINGS APPROXIMATIFS:', warnings);
          setMappingWarnings(warnings);
        }
      }

      await parseAndValidateRows(rows);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Erreur lors de la lecture du fichier. Vérifiez le format.');
    }
  };

  // Fonction helper pour nettoyer les données avant insertion
  // Supprime tous les champs undefined pour éviter les erreurs PostgreSQL
  const cleanDataForInsert = (data: any): any => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  const parseAndValidateRows = async (rows: any[]) => {
    if (rows.length === 0) return;

    const { columnMap, unmappedColumns } = createColumnMapper(rows[0]);

    const { data: secteurs } = await supabase.from('secteur').select('id, nom');
    const secteurMap = new Map(secteurs?.map((s) => [s.nom.toLowerCase(), s.id]) || []);

    // Vérifier les emails existants
    const emailsToCheck = rows
      .map((r) => getColumnValue(r, columnMap, 'email'))
      .filter((e) => e);

    const { data: existingEmails } = await supabase
      .from('profil')
      .select('email')
      .in('email', emailsToCheck);

    const existingEmailSet = new Set(existingEmails?.map((e) => e.email.toLowerCase()) || []);

    // Vérifier les matricules TCA existants
    const matriculesToCheck = rows
      .map((r) => getColumnValue(r, columnMap, 'matricule_tca'))
      .filter((m) => m);

    const { data: existingMatricules } = await supabase
      .from('profil')
      .select('id, matricule_tca, nom, prenom, email')
      .in('matricule_tca', matriculesToCheck);

    const existingMatriculeMap = new Map(
      existingMatricules?.map((p) => [p.matricule_tca, { id: p.id, nom: p.nom, prenom: p.prenom, email: p.email }]) || []
    );

    const parsed: ParsedEmployee[] = rows.map((row, index) => {
      const nom = getColumnValue(row, columnMap, 'nom');
      const prenom = getColumnValue(row, columnMap, 'prenom');
      const email = getColumnValue(row, columnMap, 'email');
      const matricule = getColumnValue(row, columnMap, 'matricule_tca');
      const secteurNom = getColumnValue(row, columnMap, 'secteur');

      const dateDebutRaw = getColumnValue(row, columnMap, 'date_debut_contrat');
      const dateFinRaw = getColumnValue(row, columnMap, 'date_fin_contrat');
      const dateNaissanceRaw = getColumnValue(row, columnMap, 'date_naissance');
      const avenant1DateDebutRaw = getColumnValue(row, columnMap, 'avenant_1_date_debut');
      const avenant1DateFinRaw = getColumnValue(row, columnMap, 'avenant_1_date_fin');
      const avenant2DateDebutRaw = getColumnValue(row, columnMap, 'avenant_2_date_debut');
      const avenant2DateFinRaw = getColumnValue(row, columnMap, 'avenant_2_date_fin');
      const titreSejourFinRaw = getColumnValue(row, columnMap, 'titre_sejour_fin_validite');
      const dateVisiteMedicaleRaw = getColumnValue(row, columnMap, 'date_visite_medicale');
      const dateFinVisiteMedicaleRaw = getColumnValue(row, columnMap, 'date_fin_visite_medicale');

      // Récupérer "Période d'essai" et détecter automatiquement si c'est une date
      const periodeEssaiRaw = getColumnValue(row, columnMap, 'periode_essai');
      let periodeEssaiText: string | undefined = undefined;
      let periodeEssaiDate: string | null = null;
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

      if (periodeEssaiRaw) {
        // Détecter si la valeur ressemble à une date (format JJ/MM/AAAA ou DD/MM/YYYY)
        if (datePattern.test(periodeEssaiRaw.trim())) {
          // C'est une date, on la parse
          periodeEssaiDate = parseDate(periodeEssaiRaw, 'Fin période d\'essai');
          if (index === 0) {
            console.log('🔍 DEBUG Période d\'essai détectée comme DATE:', periodeEssaiRaw, '→', periodeEssaiDate);
          }
        } else {
          // C'est du texte (ex: "3 mois", "6 mois")
          periodeEssaiText = periodeEssaiRaw;
          if (index === 0) {
            console.log('🔍 DEBUG Période d\'essai détectée comme TEXTE:', periodeEssaiRaw);
          }
        }
      }

      const dateDebutContrat = parseDate(dateDebutRaw, 'Date début contrat');
      const dateFinContrat = parseDate(dateFinRaw, 'Date fin contrat');
      const dateNaissance = parseDate(dateNaissanceRaw, 'Date de naissance');
      const avenant1DateDebut = parseDate(avenant1DateDebutRaw, 'Avenant 1 - Date début');
      const avenant1DateFin = parseDate(avenant1DateFinRaw, 'Avenant 1 - Date fin');
      const avenant2DateDebut = parseDate(avenant2DateDebutRaw, 'Avenant 2 - Date début');
      const avenant2DateFin = parseDate(avenant2DateFinRaw, 'Avenant 2 - Date fin');
      const titreSejourFin = parseDate(titreSejourFinRaw, 'Titre de séjour - Fin validité');
      const dateVisiteMedicale = parseDate(dateVisiteMedicaleRaw, 'Date visite médicale');
      const dateFinVisiteMedicale = parseDate(dateFinVisiteMedicaleRaw, 'Date fin visite médicale');

      const hasDateDebutButInvalid = dateDebutRaw && !dateDebutContrat;
      const hasDateFinButInvalid = dateFinRaw && !dateFinContrat;
      const hasDateNaissanceButInvalid = dateNaissanceRaw && !dateNaissance;
      const hasAvenant1DebutButInvalid = avenant1DateDebutRaw && !avenant1DateDebut;
      const hasAvenant1FinButInvalid = avenant1DateFinRaw && !avenant1DateFin;
      const hasAvenant2DebutButInvalid = avenant2DateDebutRaw && !avenant2DateDebut;
      const hasAvenant2FinButInvalid = avenant2DateFinRaw && !avenant2DateFin;
      const hasTitreSejourFinButInvalid = titreSejourFinRaw && !titreSejourFin;
      const hasVisiteMedicaleButInvalid = dateVisiteMedicaleRaw && !dateVisiteMedicale;
      const hasFinVisiteMedicaleButInvalid = dateFinVisiteMedicaleRaw && !dateFinVisiteMedicale;
      const hasPeriodeEssaiDateButInvalid = periodeEssaiRaw && datePattern.test(periodeEssaiRaw.trim()) && !periodeEssaiDate;

      if (index === 0) {
        console.log('🔍 DEBUG Row data:', { nom, prenom, email, matricule, secteurNom });
        console.log('🔍 DEBUG Raw row:', row);
        console.log('🔍 DEBUG Date début brute:', dateDebutRaw, typeof dateDebutRaw);
        console.log('🔍 DEBUG Date début parsée:', dateDebutContrat);
      }

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Prêt à importer';
      let selected = true;

      // Collecter toutes les dates invalides
      const invalidDates: string[] = [];
      if (hasDateDebutButInvalid) invalidDates.push(`Début contrat: "${dateDebutRaw}"`);
      if (hasDateFinButInvalid) invalidDates.push(`Fin contrat: "${dateFinRaw}"`);
      if (hasDateNaissanceButInvalid) invalidDates.push(`Naissance: "${dateNaissanceRaw}"`);
      if (hasAvenant1DebutButInvalid) invalidDates.push(`Avenant 1 début: "${avenant1DateDebutRaw}"`);
      if (hasAvenant1FinButInvalid) invalidDates.push(`Avenant 1 fin: "${avenant1DateFinRaw}"`);
      if (hasAvenant2DebutButInvalid) invalidDates.push(`Avenant 2 début: "${avenant2DateDebutRaw}"`);
      if (hasAvenant2FinButInvalid) invalidDates.push(`Avenant 2 fin: "${avenant2DateFinRaw}"`);
      if (hasTitreSejourFinButInvalid) invalidDates.push(`Titre séjour fin: "${titreSejourFinRaw}"`);
      if (hasVisiteMedicaleButInvalid) invalidDates.push(`Visite médicale: "${dateVisiteMedicaleRaw}"`);
      if (hasFinVisiteMedicaleButInvalid) invalidDates.push(`Fin visite médicale: "${dateFinVisiteMedicaleRaw}"`);
      if (hasPeriodeEssaiDateButInvalid) invalidDates.push(`Fin période d'essai: "${periodeEssaiRaw}"`);

      if (!nom && !prenom && !email) {
        status = 'error';
        statusMessage = 'Champs obligatoires manquants: Nom, Prénom ou Email';
        selected = false;
      } else if (invalidDates.length > 0) {
        status = 'warning';
        statusMessage = `Date(s) invalide(s) (seront ignorées): ${invalidDates.join(', ')}. Format attendu: JJ/MM/AAAA (année entre 1900-2100)`;
        // On garde selected à true pour permettre l'import
      } else if (email && existingEmailSet.has(email.toLowerCase())) {
        status = 'warning';
        statusMessage = `Email "${email}" existe déjà - Sera mis à jour`;
      } else if (matricule && existingMatriculeMap.has(matricule)) {
        const existing = existingMatriculeMap.get(matricule);
        status = 'warning';
        statusMessage = `Matricule "${matricule}" existe (${existing?.prenom} ${existing?.nom}) - Sera mis à jour`;
      } else if (secteurNom && !secteurMap.has(secteurNom.toLowerCase())) {
        status = 'warning';
        statusMessage = `Secteur "${secteurNom}" introuvable - Salarié sera créé sans secteur`;
      }

      const secteurId = secteurNom ? secteurMap.get(secteurNom.toLowerCase()) : undefined;

      // Déterminer si un profil existant doit être mis à jour
      let existingProfileId: string | undefined = undefined;
      if (matricule && existingMatriculeMap.has(matricule)) {
        existingProfileId = existingMatriculeMap.get(matricule)?.id;
      } else if (email && existingEmailSet.has(email.toLowerCase())) {
        // Si doublon par email, on pourrait aussi chercher l'ID ici si nécessaire
        // Pour l'instant, on laisse undefined et on créera un nouveau profil
      }

      return {
        rowNumber: index + 2,
        status,
        statusMessage,
        selected,
        existing_profile_id: existingProfileId,
        data: {
          matricule_tca: getColumnValue(row, columnMap, 'matricule_tca') || undefined,
          nom,
          prenom,
          email: email || undefined,
          date_debut_contrat: dateDebutContrat,
          date_fin_contrat: dateFinContrat,
          numero_securite_sociale: getColumnValue(row, columnMap, 'numero_securite_sociale') || undefined,
          poste: getColumnValue(row, columnMap, 'poste') || undefined,
          date_naissance: dateNaissance,
          lieu_naissance: getColumnValue(row, columnMap, 'lieu_naissance') || undefined,
          nationalite: getColumnValue(row, columnMap, 'nationalite') || undefined,
          genre: getColumnValue(row, columnMap, 'genre') || undefined,
          nom_naissance: getColumnValue(row, columnMap, 'nom_naissance') || undefined,
          adresse: getColumnValue(row, columnMap, 'adresse') || undefined,
          complement_adresse: getColumnValue(row, columnMap, 'complement_adresse') || undefined,
          pays_naissance: getColumnValue(row, columnMap, 'pays_naissance') || undefined,
          ville: getColumnValue(row, columnMap, 'ville') || undefined,
          code_postal: getColumnValue(row, columnMap, 'code_postal') || undefined,
          tel: getColumnValue(row, columnMap, 'tel') || undefined,
          iban: getColumnValue(row, columnMap, 'iban') || undefined,
          bic: getColumnValue(row, columnMap, 'bic') || undefined,
          modele_contrat: getColumnValue(row, columnMap, 'modele_contrat') || undefined,
          periode_essai: periodeEssaiText || undefined,
          date_fin_periode_essai: periodeEssaiDate,
          statut_contrat: getColumnValue(row, columnMap, 'statut_contrat') || undefined,
          avenant_1_date_debut: avenant1DateDebut,
          avenant_1_date_fin: avenant1DateFin,
          avenant_2_date_debut: avenant2DateDebut,
          avenant_2_date_fin: avenant2DateFin,
          secteur_nom: secteurNom || undefined,
          secteur_id: secteurId,
          type_piece_identite: getColumnValue(row, columnMap, 'type_piece_identite') || undefined,
          titre_sejour_fin_validite: titreSejourFin,
          date_visite_medicale: dateVisiteMedicale,
          date_fin_visite_medicale: dateFinVisiteMedicale,
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
        let profil: any;
        let profilError: any;

        // Si un profil existant a été trouvé, le mettre à jour au lieu de créer un nouveau
        if (emp.existing_profile_id) {
          const updateData: any = {
            // Mettre à jour les champs avec les nouvelles valeurs (sauf si elles sont undefined)
            nom: emp.data.nom || 'N/A',
            prenom: emp.data.prenom || 'N/A',
          };

          // Ajouter les champs optionnels seulement s'ils ont une valeur
          if (emp.data.email) updateData.email = emp.data.email;
          if (emp.data.tel) updateData.tel = emp.data.tel;
          if (emp.data.genre) updateData.genre = emp.data.genre;
          if (emp.data.date_naissance) updateData.date_naissance = emp.data.date_naissance;
          if (emp.data.lieu_naissance) updateData.lieu_naissance = emp.data.lieu_naissance;
          if (emp.data.pays_naissance) updateData.pays_naissance = emp.data.pays_naissance;
          if (emp.data.nationalite) updateData.nationalite = emp.data.nationalite;
          if (emp.data.nom_naissance) updateData.nom_naissance = emp.data.nom_naissance;
          if (emp.data.adresse) updateData.adresse = emp.data.adresse;
          if (emp.data.complement_adresse) updateData.complement_adresse = emp.data.complement_adresse;
          if (emp.data.ville) updateData.ville = emp.data.ville;
          if (emp.data.code_postal) updateData.code_postal = emp.data.code_postal;
          if (emp.data.numero_securite_sociale) updateData.nir = emp.data.numero_securite_sociale;
          if (emp.data.iban) updateData.iban = emp.data.iban;
          if (emp.data.bic) updateData.bic = emp.data.bic;
          if (emp.data.poste) updateData.poste = emp.data.poste;
          if (emp.data.type_piece_identite) updateData.type_piece_identite = emp.data.type_piece_identite;
          if (emp.data.titre_sejour_fin_validite) updateData.titre_sejour_fin_validite = emp.data.titre_sejour_fin_validite;
          if (emp.data.date_visite_medicale) updateData.date_visite_medicale = emp.data.date_visite_medicale;
          if (emp.data.date_fin_visite_medicale) updateData.date_fin_visite_medicale = emp.data.date_fin_visite_medicale;
          if (emp.data.periode_essai) updateData.periode_essai = emp.data.periode_essai;
          if (emp.data.date_fin_periode_essai) updateData.date_fin_periode_essai = emp.data.date_fin_periode_essai;
          if (emp.data.modele_contrat) updateData.modele_contrat = emp.data.modele_contrat;
          if (emp.data.secteur_id) updateData.secteur_id = emp.data.secteur_id;
          if (emp.data.date_debut_contrat) updateData.date_entree = emp.data.date_debut_contrat;
          if (emp.data.avenant_1_date_debut) updateData.avenant_1_date_debut = emp.data.avenant_1_date_debut;
          if (emp.data.avenant_1_date_fin) updateData.avenant_1_date_fin = emp.data.avenant_1_date_fin;
          if (emp.data.avenant_2_date_debut) updateData.avenant_2_date_debut = emp.data.avenant_2_date_debut;
          if (emp.data.avenant_2_date_fin) updateData.avenant_2_date_fin = emp.data.avenant_2_date_fin;

          const result = await supabase
            .from('profil')
            .update(updateData)
            .eq('id', emp.existing_profile_id)
            .select()
            .single();

          profil = result.data;
          profilError = result.error;

          if (profilError) throw profilError;

          console.log(`✅ Profil mis à jour: ${profil.prenom} ${profil.nom} (${profil.matricule_tca})`);
        } else {
          // Créer un nouveau profil
          const profilData = cleanDataForInsert({
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
            nir: emp.data.numero_securite_sociale,
            iban: emp.data.iban,
            bic: emp.data.bic,
            poste: emp.data.poste,
            type_piece_identite: emp.data.type_piece_identite,
            titre_sejour_fin_validite: emp.data.titre_sejour_fin_validite,
            date_visite_medicale: emp.data.date_visite_medicale,
            date_fin_visite_medicale: emp.data.date_fin_visite_medicale,
            avenant_1_date_debut: emp.data.avenant_1_date_debut,
            avenant_1_date_fin: emp.data.avenant_1_date_fin,
            avenant_2_date_debut: emp.data.avenant_2_date_debut,
            avenant_2_date_fin: emp.data.avenant_2_date_fin,
            periode_essai: emp.data.periode_essai,
            date_fin_periode_essai: emp.data.date_fin_periode_essai,
            modele_contrat: emp.data.modele_contrat,
            secteur_id: emp.data.secteur_id,
            date_entree: emp.data.date_debut_contrat,
            statut: 'actif',
            role: 'salarie',
          });

          console.log(`�� Ligne ${emp.rowNumber}: Insertion profil avec données:`, profilData);

          // LOG DÉTAILLÉ : Afficher toutes les dates avec leurs types
          console.log(`📅 DATES AVANT INSERTION (ligne ${emp.rowNumber}):`);
          console.log(`  - date_naissance: "${emp.data.date_naissance}" (type: ${typeof emp.data.date_naissance})`);
          console.log(`  - date_entree: "${emp.data.date_debut_contrat}" (type: ${typeof emp.data.date_debut_contrat})`);
          console.log(`  - date_visite_medicale: "${emp.data.date_visite_medicale}" (type: ${typeof emp.data.date_visite_medicale})`);
          console.log(`  - date_fin_visite_medicale: "${emp.data.date_fin_visite_medicale}" (type: ${typeof emp.data.date_fin_visite_medicale})`);
          console.log(`  - titre_sejour_fin_validite: "${emp.data.titre_sejour_fin_validite}" (type: ${typeof emp.data.titre_sejour_fin_validite})`);
          console.log(`  - avenant_1_date_debut: "${emp.data.avenant_1_date_debut}" (type: ${typeof emp.data.avenant_1_date_debut})`);
          console.log(`  - avenant_1_date_fin: "${emp.data.avenant_1_date_fin}" (type: ${typeof emp.data.avenant_1_date_fin})`);
          console.log(`  - avenant_2_date_debut: "${emp.data.avenant_2_date_debut}" (type: ${typeof emp.data.avenant_2_date_debut})`);
          console.log(`  - avenant_2_date_fin: "${emp.data.avenant_2_date_fin}" (type: ${typeof emp.data.avenant_2_date_fin})`);
          console.log(`  - periode_essai (texte): "${emp.data.periode_essai}" (type: ${typeof emp.data.periode_essai})`);
          console.log(`  - date_fin_periode_essai: "${emp.data.date_fin_periode_essai}" (type: ${typeof emp.data.date_fin_periode_essai})`);

          const insertResult = await supabase
            .from('profil')
            .insert(profilData)
            .select()
            .single();

          profil = insertResult.data;
          profilError = insertResult.error;

          if (profilError) throw profilError;

          console.log(`✅ Nouveau profil créé: ${profil.prenom} ${profil.nom} (${profil.matricule_tca})`);
        }

        if (emp.data.date_debut_contrat) {
          const isContractSigned = emp.data.statut_contrat?.toLowerCase().includes('sign');
          const modeleContrat = emp.data.modele_contrat?.toLowerCase() || '';

          // Déterminer le type de contrat en analysant modele_contrat
          let contractType: 'cdi' | 'cdd' | null = null;

          // Si modele_contrat contient uniquement "Avenant" (sans CDI/CDD), ne pas créer de contrat principal
          if (modeleContrat.includes('avenant') && !modeleContrat.includes('cdi') && !modeleContrat.includes('cdd')) {
            console.log(`⏭️  Ligne ${emp.rowNumber}: Pas de contrat principal (uniquement avenants dans modele_contrat: "${emp.data.modele_contrat}")`);
            contractType = null;
          } else if (modeleContrat.includes('cdi')) {
            contractType = 'cdi';
          } else if (modeleContrat.includes('cdd') || emp.data.date_fin_contrat) {
            contractType = 'cdd';
          } else {
            // ✅ FIX: Si pas de date_fin et pas d'indication claire, c'est un CDI (contrat sans terme)
            contractType = 'cdi';
            console.log(`📋 Ligne ${emp.rowNumber}: Contrat sans date_fin détecté → CDI par défaut`);
          }

          // Créer le contrat principal uniquement si un type a été déterminé
          if (contractType) {
            const contratData = cleanDataForInsert({
              profil_id: profil.id,
              type: contractType,
              date_debut: emp.data.date_debut_contrat,
              date_fin: emp.data.date_fin_contrat,
              esign: 'signed',
              statut: isContractSigned ? 'signe' : 'envoye',
              date_signature: isContractSigned ? emp.data.date_debut_contrat : null,
              variables: emp.data.modele_contrat ? { type_contrat: emp.data.modele_contrat } : {},
              source: 'import',
            });

            console.log(`📝 Ligne ${emp.rowNumber}: Insertion contrat avec données:`, contratData);
            await supabase.from('contrat').insert(contratData);
          }
        }

        if (emp.data.avenant_1_date_debut) {
          const isContractSigned = emp.data.statut_contrat?.toLowerCase().includes('sign');

          const avenantData = cleanDataForInsert({
            profil_id: profil.id,
            type: 'avenant',
            date_debut: emp.data.avenant_1_date_debut,
            date_fin: emp.data.avenant_1_date_fin,
            esign: 'signed',
            statut: isContractSigned ? 'signe' : 'envoye',
            date_signature: isContractSigned ? emp.data.avenant_1_date_debut : null,
            variables: { type_contrat: 'Avenant 1' },
            source: 'import',
          });

          console.log(`📝 Ligne ${emp.rowNumber}: Insertion avenant 1 avec données:`, avenantData);
          await supabase.from('contrat').insert(avenantData);
        }

        if (emp.data.avenant_2_date_debut || emp.data.avenant_2_date_fin) {
          const isContractSigned = emp.data.statut_contrat?.toLowerCase().includes('sign');

          const avenant2Data = cleanDataForInsert({
            profil_id: profil.id,
            type: 'avenant',
            date_debut: emp.data.avenant_2_date_debut,
            date_fin: emp.data.avenant_2_date_fin,
            esign: 'signed',
            statut: isContractSigned ? 'signe' : 'envoye',
            date_signature: isContractSigned ? emp.data.avenant_2_date_debut : null,
            variables: { type_contrat: 'Avenant 2' },
            source: 'import',
          });

          console.log(`📝 Ligne ${emp.rowNumber}: Insertion avenant 2 avec données:`, avenant2Data);
          await supabase.from('contrat').insert(avenant2Data);
        }

        result.success++;
        result.details.push({
          type: 'success',
          rowNumber: emp.rowNumber,
          name: `${emp.data.prenom} ${emp.data.nom}`,
          message: 'Importé avec succès',
        });
      } catch (error: any) {
        console.error(`❌ Erreur lors de l'import de ${emp.data.prenom} ${emp.data.nom}:`, error);
        console.error(`❌ Détails complets de l'erreur:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        let errorMessage = error.message || 'Erreur inconnue';

        if (errorMessage.includes('date/time field value out of range') || errorMessage.includes('out of range')) {
          const dateFields = [];
          const allDates: any = {
            'Début contrat': emp.data.date_debut_contrat,
            'Fin contrat': emp.data.date_fin_contrat,
            'Naissance': emp.data.date_naissance,
            'Entrée': emp.data.date_entree,
            'Avenant 1 début': emp.data.avenant_1_date_debut,
            'Avenant 1 fin': emp.data.avenant_1_date_fin,
            'Avenant 2 début': emp.data.avenant_2_date_debut,
            'Avenant 2 fin': emp.data.avenant_2_date_fin,
            'Fin titre séjour': emp.data.titre_sejour_fin_validite,
            'Visite médicale': emp.data.date_visite_medicale,
            'Fin visite médicale': emp.data.date_fin_visite_medicale,
            'Fin période d\'essai': emp.data.date_fin_periode_essai,
          };

          // Parser error.details et error.hint pour plus d'informations
          if (error.details) {
            console.error(`📋 error.details:`, error.details);
          }
          if (error.hint) {
            console.error(`💡 error.hint:`, error.hint);
          }

          // Trouver quelle date pose problème
          let problematicDate = 'inconnue';
          let problematicDates: string[] = [];

          for (const [label, value] of Object.entries(allDates)) {
            if (value) {
              // Vérifier le type et le format de la valeur
              const valueStr = String(value);
              const valueType = typeof value;

              console.error(`🔍 Vérification ${label}: valeur="${valueStr}", type=${valueType}`);

              dateFields.push(`${label}: ${valueStr}`);

              // Vérifier si c'est une chaîne de caractères au format date
              if (typeof value === 'string' && value.includes('-')) {
                const parts = value.split('-');
                if (parts.length === 3) {
                  const year = parseInt(parts[0]);
                  if (year < 1900 || year > 2100 || isNaN(year)) {
                    problematicDates.push(`${label} (${valueStr}, année ${year})`);
                    if (problematicDate === 'inconnue') {
                      problematicDate = `${label} (${valueStr})`;
                    }
                  }
                } else {
                  problematicDates.push(`${label} (format invalide: ${valueStr})`);
                }
              } else if (value instanceof Date) {
                // Si c'est un objet Date JavaScript
                problematicDates.push(`${label} (objet Date non converti: ${value.toString()})`);
              } else if (valueType !== 'string') {
                // Autre type inattendu
                problematicDates.push(`${label} (type inattendu: ${valueType})`);
              }
            }
          }

          console.error(`❌ Dates de la ligne ${emp.rowNumber}:`, allDates);
          console.error(`❌ Dates problématiques détectées:`, problematicDates);

          if (problematicDates.length > 0) {
            errorMessage = `Date(s) problématique(s): ${problematicDates.join('; ')}. PostgreSQL accepte les années entre 1900-2100 au format YYYY-MM-DD`;
          } else {
            errorMessage = `Date hors limites PostgreSQL: ${problematicDate}. Les années doivent être entre 1900-2100. Dates présentes: ${dateFields.join(', ')}`;
          }
        } else if (errorMessage.includes('invalid input syntax for type date')) {
          // Extraire le nom de la colonne si possible
          const colMatch = errorMessage.match(/column "([^"]+)"/);
          const columnInfo = colMatch ? ` pour le champ "${colMatch[1]}"` : '';
          errorMessage = `Format de date incorrect${columnInfo}. Vérifiez que toutes les dates utilisent le format JJ/MM/AAAA`;
        } else if (errorMessage.includes('null value in column')) {
          const match = errorMessage.match(/null value in column "([^"]+)"/);
          const columnName = match ? match[1] : 'inconnu';
          errorMessage = `Le champ obligatoire "${columnName}" est manquant ou vide`;
        }

        result.errors++;
        result.details.push({
          type: 'error',
          rowNumber: emp.rowNumber,
          name: `${emp.data.prenom} ${emp.data.nom}`,
          message: errorMessage,
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
    setUnmappedColumns([]);
    setMappingWarnings([]);
  };

  const exportErrorsToCSV = () => {
    if (!importResult) return;

    // Filtrer uniquement les erreurs
    const errors = importResult.details.filter(detail => detail.type === 'error');

    if (errors.length === 0) {
      alert('Aucune erreur à exporter');
      return;
    }

    // Créer le contenu CSV
    const headers = ['Ligne', 'Nom', 'Message d\'erreur'];
    const csvRows = [headers.join(',')];

    errors.forEach(error => {
      const row = [
        error.rowNumber,
        `"${error.name}"`,
        `"${error.message.replace(/"/g, '""')}"` // Échapper les guillemets
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `erreurs_import_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getContractType = (emp: ParsedEmployee): 'cdi' | 'cdd' | 'avenant' | 'unknown' => {
    if (emp.data.avenant_1_date_debut || emp.data.avenant_2_date_debut) return 'avenant';
    if (emp.data.modele_contrat?.toLowerCase().includes('avenant')) return 'avenant';
    if (emp.data.date_fin_contrat) return 'cdd';
    if (emp.data.modele_contrat?.toLowerCase().includes('cdd')) return 'cdd';
    if (emp.data.modele_contrat?.toLowerCase().includes('cdi')) return 'cdi';
    if (!emp.data.date_fin_contrat && emp.data.date_debut_contrat) return 'cdi';
    return 'unknown';
  };

  const filteredData = parsedData.filter((emp) => {
    if (filter !== 'all' && emp.status !== filter) return false;
    if (contractFilter !== 'all') {
      const contractType = getContractType(emp);
      if (contractType !== contractFilter) return false;
    }
    return true;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const counts = {
    valid: parsedData.filter((e) => e.status === 'valid').length,
    warning: parsedData.filter((e) => e.status === 'warning').length,
    error: parsedData.filter((e) => e.status === 'error').length,
    selected: parsedData.filter((e) => e.selected).length,
    cdi: parsedData.filter((e) => getContractType(e) === 'cdi').length,
    cdd: parsedData.filter((e) => getContractType(e) === 'cdd').length,
    avenant: parsedData.filter((e) => getContractType(e) === 'avenant').length,
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
          {importResult.errors > 0 && (
            <button
              onClick={exportErrorsToCSV}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exporter les erreurs ({importResult.errors})
            </button>
          )}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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

          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Filtrer par statut</div>
            <div className="flex flex-wrap gap-2">
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

          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Filtrer par type de contrat</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setContractFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contractFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({parsedData.length})
              </button>
              <button
                onClick={() => setContractFilter('cdi')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contractFilter === 'cdi'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                CDI ({counts.cdi})
              </button>
              <button
                onClick={() => setContractFilter('cdd')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contractFilter === 'cdd'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                CDD ({counts.cdd})
              </button>
              <button
                onClick={() => setContractFilter('avenant')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contractFilter === 'avenant'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                Avenants ({counts.avenant})
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <ColumnSelector
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
            />
          </div>
        </div>

        {unmappedColumns.length > 0 && (
          <div className="p-6 border-b border-gray-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  Colonnes importantes non détectées
                </h3>
                <p className="text-red-800 mb-3">
                  Les colonnes suivantes n'ont pas pu être détectées dans votre fichier. Cela peut être dû à un problème d'encodage des caractères (ex: "é" devient "�").
                </p>
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <ul className="list-disc list-inside space-y-1 text-red-900">
                    {unmappedColumns.map((col) => (
                      <li key={col} className="font-medium">
                        {col === 'prenom' && 'Prénom'}
                        {col === 'nom' && 'Nom'}
                        {col === 'email' && 'Email'}
                        {col === 'matricule_tca' && 'Matricule TCA'}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 bg-red-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-900 mb-2">Solutions possibles :</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-red-800">
                    <li>Téléchargez et utilisez le modèle CSV fourni (recommandé)</li>
                    <li>Vérifiez que votre fichier Excel est bien encodé en UTF-8</li>
                    <li>Réenregistrez votre fichier Excel en format "CSV UTF-8"</li>
                    <li>Vérifiez que les noms de colonnes sont exactement comme dans le modèle</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {mappingWarnings.length > 0 && (
          <div className="p-6 border-b border-gray-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 mb-2">
                  Mappings approximatifs détectés
                </h3>
                <p className="text-orange-800 mb-3">
                  Certaines colonnes ont été détectées par similarité. Veuillez vérifier que les données sont correctes.
                </p>
                <div className="bg-white rounded-lg border border-orange-200 p-4">
                  <ul className="list-disc list-inside space-y-1 text-orange-900 text-sm">
                    {mappingWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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

        <div className="hidden md:block max-h-96 overflow-x-auto overflow-y-auto">
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
                {visibleColumns.includes('nom') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '120px' }}>
                    Nom
                  </th>
                )}
                {visibleColumns.includes('prenom') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '120px' }}>
                    Prénom
                  </th>
                )}
                {visibleColumns.includes('email') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '180px' }}>
                    Email
                  </th>
                )}
                {visibleColumns.includes('matricule') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Matricule
                  </th>
                )}
                {visibleColumns.includes('type_contrat') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type Contrat
                  </th>
                )}
                {visibleColumns.includes('date_debut') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date Début
                  </th>
                )}
                {visibleColumns.includes('date_fin') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date Fin
                  </th>
                )}
                {visibleColumns.includes('statut_contrat') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut Contrat
                  </th>
                )}
                {visibleColumns.includes('periode_essai') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Période Essai
                  </th>
                )}
                {visibleColumns.includes('poste') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poste
                  </th>
                )}
                {visibleColumns.includes('secteur') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Secteur
                  </th>
                )}
                {visibleColumns.includes('avenant_1_debut') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Av. 1 Début
                  </th>
                )}
                {visibleColumns.includes('avenant_1_fin') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Av. 1 Fin
                  </th>
                )}
                {visibleColumns.includes('avenant_2_debut') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Av. 2 Début
                  </th>
                )}
                {visibleColumns.includes('avenant_2_fin') && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Av. 2 Fin
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
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
                  {visibleColumns.includes('nom') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.nom || '-'}</td>
                  )}
                  {visibleColumns.includes('prenom') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.prenom || '-'}</td>
                  )}
                  {visibleColumns.includes('email') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.email || '-'}</td>
                  )}
                  {visibleColumns.includes('matricule') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.matricule_tca || '-'}</td>
                  )}
                  {visibleColumns.includes('type_contrat') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <ContractBadge type="type" value={emp.data.modele_contrat} />
                    </td>
                  )}
                  {visibleColumns.includes('date_debut') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.date_debut_contrat)}</td>
                  )}
                  {visibleColumns.includes('date_fin') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.date_fin_contrat)}</td>
                  )}
                  {visibleColumns.includes('statut_contrat') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <ContractBadge type="status" value={emp.data.statut_contrat} />
                    </td>
                  )}
                  {visibleColumns.includes('periode_essai') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.periode_essai || '-'}</td>
                  )}
                  {visibleColumns.includes('poste') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.poste || '-'}</td>
                  )}
                  {visibleColumns.includes('secteur') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{emp.data.secteur_nom || '-'}</td>
                  )}
                  {visibleColumns.includes('avenant_1_debut') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.avenant_1_date_debut)}</td>
                  )}
                  {visibleColumns.includes('avenant_1_fin') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.avenant_1_date_fin)}</td>
                  )}
                  {visibleColumns.includes('avenant_2_debut') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.avenant_2_date_debut)}</td>
                  )}
                  {visibleColumns.includes('avenant_2_fin') && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(emp.data.avenant_2_date_fin)}</td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-4 max-h-96 overflow-y-auto">
          {filteredData.map((emp) => (
            <EmployeeCard
              key={emp.rowNumber}
              employee={emp}
              onSelect={(rowNumber, selected) => {
                setParsedData(
                  parsedData.map((p) =>
                    p.rowNumber === rowNumber ? { ...p, selected } : p
                  )
                );
              }}
              onViewDetails={(employee) => setSelectedEmployee(employee)}
            />
          ))}
        </div>

        {selectedEmployee && (
          <EmployeeDetailModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        )}

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
