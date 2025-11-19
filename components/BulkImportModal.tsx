
import React, { useState, useMemo } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { supabase } from '../lib/supabase';
import { Profile, Status, Source, Licenciatura } from '../types';
import Papa from 'papaparse';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advisors: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
}

type Step = 'upload' | 'mapping' | 'defaults' | 'processing' | 'results';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  email: string;
  phone: string;
  program_id: string; // Matches Name, not ID
  advisor_id: string; // Matches Name
  status_id: string; // Matches Name
  source_id: string; // Matches Name
}

const DB_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'first_name', label: 'Nombre(s)', required: true },
  { key: 'paternal_last_name', label: 'Apellido Paterno', required: true },
  { key: 'maternal_last_name', label: 'Apellido Materno', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Teléfono', required: true },
  { key: 'program_id', label: 'Licenciatura (Nombre)', required: false },
  { key: 'advisor_id', label: 'Asesor (Nombre)', required: false },
  { key: 'status_id', label: 'Estado (Nombre)', required: false },
  { key: 'source_id', label: 'Origen (Nombre)', required: false },
];

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  advisors,
  statuses,
  sources,
  licenciaturas,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  
  const [mapping, setMapping] = useState<ColumnMapping>({
    first_name: '', paternal_last_name: '', maternal_last_name: '',
    email: '', phone: '', program_id: '', advisor_id: '', status_id: '', source_id: ''
  });

  const [defaults, setDefaults] = useState({
    program_id: licenciaturas[0]?.id || '',
    advisor_id: advisors[0]?.id || '',
    status_id: statuses.find(s => s.name === 'Primer Contacto (Respuesta Pendiente)')?.id || statuses[0]?.id || '',
    source_id: sources.find(s => s.name === 'Base de Datos')?.id || sources[0]?.id || '',
  });

  const [results, setResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 5, // Read only first few rows to get headers
        complete: (results) => {
          if (results.meta.fields) {
            setCsvHeaders(results.meta.fields);
            // Auto-map matching headers
            const newMapping = { ...mapping };
            results.meta.fields.forEach(header => {
              const lowerHeader = header.toLowerCase().replace(/_/g, '').replace(/ /g, '');
              if (lowerHeader.includes('nombre') && !lowerHeader.includes('lic') && !lowerHeader.includes('aso')) newMapping.first_name = header;
              if (lowerHeader.includes('paterno')) newMapping.paternal_last_name = header;
              if (lowerHeader.includes('materno')) newMapping.maternal_last_name = header;
              if (lowerHeader.includes('email') || lowerHeader.includes('correo')) newMapping.email = header;
              if (lowerHeader.includes('tel') || lowerHeader.includes('cel')) newMapping.phone = header;
              if (lowerHeader.includes('licenciatura') || lowerHeader.includes('carrera')) newMapping.program_id = header;
            });
            setMapping(newMapping);
          }
        }
      });
    }
  };

  const handleConfirmUpload = () => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data as CSVRow[]);
        setStep('mapping');
      }
    });
  };

  const handleDownloadSample = () => {
    const headers = [
      'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Email', 'Teléfono',
      'Licenciatura', 'Asesor', 'Estado', 'Origen'
    ];
    const sampleRow = [
      'Juan', 'Pérez', 'López', 'juan@ejemplo.com', '5512345678',
      'Derecho', 'Nombre Asesor', 'Primer Contacto', 'Facebook'
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importacion_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMappingChange = (dbField: keyof ColumnMapping, csvHeader: string) => {
    setMapping(prev => ({ ...prev, [dbField]: csvHeader }));
  };

  const normalize = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const findIdByName = (name: string, catalog: { id: string; name: string }[]) => {
    if (!name) return null;
    const normalizedName = normalize(name);
    const found = catalog.find(item => normalize(item.name) === normalizedName);
    return found ? found.id : null;
  };
  
  const findAdvisorByName = (name: string) => {
      if(!name) return null;
      const normalizedName = normalize(name);
      const found = advisors.find(a => normalize(a.full_name) === normalizedName);
      return found ? found.id : null;
  }

  const handleImport = async () => {
    setStep('processing');
    let successCount = 0;
    const errorLog: string[] = [];
    const rowsToInsert = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2; // Header is 1

      // 1. Extract Basic Fields
      const firstName = row[mapping.first_name]?.trim();
      const paternal = row[mapping.paternal_last_name]?.trim();
      const phone = row[mapping.phone]?.replace(/\D/g, '').trim(); // Clean phone

      // Validation
      if (!firstName || !paternal || !phone) {
        errorLog.push(`Fila ${rowNum}: Falta Nombre, Apellido Paterno o Teléfono.`);
        continue;
      }

      // 2. Resolve Foreign Keys (or use defaults)
      // Program
      let programId = findIdByName(row[mapping.program_id], licenciaturas);
      if (!programId) programId = defaults.program_id;

      // Advisor
      let advisorId = findAdvisorByName(row[mapping.advisor_id]);
      if (!advisorId) advisorId = defaults.advisor_id;

      // Status
      let statusId = findIdByName(row[mapping.status_id], statuses);
      if (!statusId) statusId = defaults.status_id;
      
      // Source
      let sourceId = findIdByName(row[mapping.source_id], sources);
      if (!sourceId) sourceId = defaults.source_id;

      rowsToInsert.push({
        first_name: firstName,
        paternal_last_name: paternal,
        maternal_last_name: row[mapping.maternal_last_name]?.trim() || null,
        email: row[mapping.email]?.trim() || null,
        phone: phone,
        program_id: programId,
        advisor_id: advisorId,
        status_id: statusId,
        source_id: sourceId,
        registration_date: new Date().toISOString(), // Import date as reg date
      });
    }

    // Batch Insert (Chunks of 50)
    const chunkSize = 50;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('leads').insert(chunk);
      
      if (error) {
        errorLog.push(`Error insertando lote ${i}-${i+chunkSize}: ${error.message}`);
      } else {
        successCount += chunk.length;
        
        // Create initial status history for these leads
        // Note: In a real scenario, we'd need the IDs returned from insert to do this reliably.
        // supabase insert select returns data. We'll skip history for bulk import v1 to verify functionality first
        // or we could fetch the leads back. For now, simple insert is robust.
      }
    }

    setResults({ success: successCount, errors: errorLog });
    setStep('results');
    if (successCount > 0) onSuccess();
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setCsvData([]);
    setResults({ success: 0, errors: [] });
  }

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center hover:border-brand-secondary transition-colors">
              <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-2">Arrastra tu archivo CSV aquí o haz clic para buscar</p>
              <p className="text-xs text-gray-500 mb-4">El archivo debe tener encabezados (ej: Nombre, Correo, Teléfono)</p>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="hidden" 
                id="file-upload" 
              />
              <label htmlFor="file-upload">
                <Button as="span" variant="secondary">Seleccionar Archivo</Button>
              </label>
              {file && <p className="mt-4 text-sm font-semibold text-brand-primary">{file.name}</p>}
            </div>
            
            <div className="flex flex-col items-center gap-4">
                 <Button 
                    variant="ghost" 
                    onClick={handleDownloadSample} 
                    size="sm" 
                    leftIcon={<ArrowDownTrayIcon className="w-4 h-4"/>}
                    className="text-brand-secondary hover:text-brand-primary hover:bg-blue-50"
                >
                    Descargar Plantilla de Muestra (CSV)
                </Button>

                <div className="flex justify-end w-full">
                    <Button disabled={!file} onClick={handleConfirmUpload}>Continuar</Button>
                </div>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">Asocia las columnas de tu archivo CSV con los campos del CRM.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto p-2">
              {DB_FIELDS.map(field => (
                <div key={field.key} className="bg-gray-50 p-3 rounded border border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapping[field.key]}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md"
                  >
                    <option value="">-- Ignorar / Usar Defecto --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('upload')}>Atrás</Button>
              <Button 
                disabled={!mapping.first_name || !mapping.paternal_last_name || !mapping.phone} 
                onClick={() => setStep('defaults')}
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case 'defaults':
        return (
          <div className="space-y-6">
             <p className="text-sm text-gray-600">
               Si el CSV no tiene columnas para estos datos (o están vacías en alguna fila), se usarán estos valores:
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Licenciatura por Defecto</label>
                  <select 
                    value={defaults.program_id} 
                    onChange={e => setDefaults(p => ({...p, program_id: e.target.value}))}
                    className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                  >
                    {licenciaturas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asesor por Defecto</label>
                  <select 
                    value={defaults.advisor_id} 
                    onChange={e => setDefaults(p => ({...p, advisor_id: e.target.value}))}
                    className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                  >
                    {advisors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado Inicial</label>
                  <select 
                    value={defaults.status_id} 
                    onChange={e => setDefaults(p => ({...p, status_id: e.target.value}))}
                    className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                  >
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origen</label>
                  <select 
                    value={defaults.source_id} 
                    onChange={e => setDefaults(p => ({...p, source_id: e.target.value}))}
                    className="mt-1 block w-full text-sm border-gray-300 rounded-md"
                  >
                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
             </div>
             
             <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800">
                Se intentarán importar <strong>{csvData.length}</strong> filas.
             </div>

             <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('mapping')}>Atrás</Button>
              <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                Importar Leads
              </Button>
            </div>
          </div>
        );
        
      case 'processing':
        return (
           <div className="flex flex-col items-center justify-center py-12">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary mb-4"></div>
               <p className="text-lg font-medium text-gray-700">Procesando importación...</p>
               <p className="text-sm text-gray-500">Esto puede tardar unos momentos.</p>
           </div>
        );

      case 'results':
        return (
           <div className="space-y-6">
               <div className="text-center">
                   <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                       <CheckCircleIcon className="w-10 h-10 text-green-600" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900">Proceso Finalizado</h3>
                   <p className="text-gray-600 mt-2">
                       Se importaron correctamente <span className="font-bold text-green-600 text-lg">{results.success}</span> leads.
                   </p>
                   {results.errors.length > 0 && (
                       <p className="text-red-600 mt-1 font-medium">Fallaron {results.errors.length} filas.</p>
                   )}
               </div>
               
               {results.errors.length > 0 && (
                   <div className="bg-red-50 p-4 rounded-md border border-red-100 max-h-40 overflow-y-auto">
                       <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                           <ExclamationCircleIcon className="w-4 h-4" /> Errores Detallados:
                       </h4>
                       <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                           {results.errors.map((err, idx) => (
                               <li key={idx}>{err}</li>
                           ))}
                       </ul>
                   </div>
               )}

               <div className="flex justify-center gap-4">
                   {results.errors.length > 0 && (
                       <Button variant="secondary" onClick={reset}>Importar Otro Archivo</Button>
                   )}
                   <Button onClick={onClose}>Cerrar</Button>
               </div>
           </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Leads (CSV)" size="xl">
        {renderStep()}
    </Modal>
  );
};

export default BulkImportModal;
