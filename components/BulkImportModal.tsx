// components/BulkImportModal.tsx
import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements'; // Usamos el nuevo Select
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
  program_id: string;
  advisor_id: string;
  status_id: string;
  source_id: string;
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
        preview: 5, 
        complete: (results) => {
          if (results.meta.fields) {
            setCsvHeaders(results.meta.fields);
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
    const headers = ['Nombre', 'Apellido Paterno', 'Apellido Materno', 'Email', 'Teléfono', 'Licenciatura', 'Asesor', 'Estado', 'Origen'];
    const sampleRow = ['Juan', 'Pérez', 'López', 'juan@ejemplo.com', '5512345678', 'Derecho', 'Nombre Asesor', 'Primer Contacto', 'Facebook'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importacion.csv');
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
      const rowNum = i + 2; 

      const firstName = row[mapping.first_name]?.trim();
      const paternal = row[mapping.paternal_last_name]?.trim();
      const phone = row[mapping.phone]?.replace(/\D/g, '').trim(); 

      if (!firstName || !paternal || !phone) {
        errorLog.push(`Fila ${rowNum}: Falta Nombre, Apellido Paterno o Teléfono.`);
        continue;
      }

      let programId = findIdByName(row[mapping.program_id], licenciaturas) || defaults.program_id;
      let advisorId = findAdvisorByName(row[mapping.advisor_id]) || defaults.advisor_id;
      let statusId = findIdByName(row[mapping.status_id], statuses) || defaults.status_id;
      let sourceId = findIdByName(row[mapping.source_id], sources) || defaults.source_id;

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
        registration_date: new Date().toISOString(),
      });
    }

    const chunkSize = 50;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('leads').insert(chunk);
      if (error) errorLog.push(`Error lote ${i}-${i+chunkSize}: ${error.message}`);
      else successCount += chunk.length;
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
          <div className="space-y-6 py-6">
            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-brand-secondary hover:bg-brand-secondary/5 transition-all group">
              <div className="p-4 bg-gray-100 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <ArrowUpTrayIcon className="w-8 h-8 text-gray-500 group-hover:text-brand-secondary" />
              </div>
              <p className="text-gray-900 font-semibold text-lg mb-1">Sube tu archivo CSV</p>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">Arrastra y suelta tu archivo aquí, o haz clic para buscar en tu ordenador.</p>
              
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              
              <Button as="div" variant="secondary" className="pointer-events-none">
                Seleccionar Archivo
              </Button>
              {file && <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200 animate-fade-in flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4"/> {file.name}
              </div>}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                 <button onClick={handleDownloadSample} className="text-brand-secondary text-sm hover:underline flex items-center gap-1">
                    <ArrowDownTrayIcon className="w-4 h-4"/> Descargar plantilla
                </button>
                <Button disabled={!file} onClick={handleConfirmUpload} className="shadow-lg shadow-brand-secondary/20">Continuar</Button>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-5">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                Confirma qué columna de tu CSV corresponde a cada dato del sistema.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto p-1">
              {DB_FIELDS.map(field => (
                <div key={field.key} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapping[field.key]}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary rounded-lg"
                  >
                    <option value="">-- Ignorar / Automático --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setStep('upload')}>Atrás</Button>
              <Button disabled={!mapping.first_name || !mapping.paternal_last_name || !mapping.phone} onClick={() => setStep('defaults')}>
                Siguiente
              </Button>
            </div>
          </div>
        );

      case 'defaults':
        return (
          <div className="space-y-5">
             <p className="text-sm text-gray-600">Define valores por defecto para los datos que falten en el archivo:</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Select 
                    label="Licenciatura Default"
                    value={defaults.program_id} 
                    onChange={e => setDefaults(p => ({...p, program_id: e.target.value}))}
                    options={licenciaturas.map(l => ({value: l.id, label: l.name}))}
                />
                <Select 
                    label="Asesor Default"
                    value={defaults.advisor_id} 
                    onChange={e => setDefaults(p => ({...p, advisor_id: e.target.value}))}
                    options={advisors.map(a => ({value: a.id, label: a.full_name}))}
                />
                <Select 
                    label="Estado Inicial"
                    value={defaults.status_id} 
                    onChange={e => setDefaults(p => ({...p, status_id: e.target.value}))}
                    options={statuses.map(s => ({value: s.id, label: s.name}))}
                />
                <Select 
                    label="Origen Default"
                    value={defaults.source_id} 
                    onChange={e => setDefaults(p => ({...p, source_id: e.target.value}))}
                    options={sources.map(s => ({value: s.id, label: s.name}))}
                />
             </div>
             
             <div className="flex justify-between pt-6 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setStep('mapping')}>Atrás</Button>
              <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                Comenzar Importación ({csvData.length} leads)
              </Button>
            </div>
          </div>
        );
        
      case 'processing':
        return (
           <div className="flex flex-col items-center justify-center py-16">
               <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-100 border-t-brand-secondary mb-6"></div>
               <p className="text-lg font-bold text-gray-900">Procesando datos...</p>
               <p className="text-sm text-gray-500">Por favor no cierres esta ventana.</p>
           </div>
        );

      case 'results':
        return (
           <div className="space-y-6 py-4">
               <div className="text-center">
                   <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 animate-scale-in">
                       <CheckCircleIcon className="w-10 h-10 text-green-600" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900">¡Importación completada!</h3>
                   <p className="text-gray-600 mt-2">
                       Se han creado <span className="font-bold text-green-600">{results.success}</span> leads nuevos correctamente.
                   </p>
               </div>
               
               {results.errors.length > 0 && (
                   <div className="bg-red-50 p-4 rounded-xl border border-red-100 max-h-48 overflow-y-auto custom-scrollbar">
                       <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                           <ExclamationCircleIcon className="w-4 h-4" /> {results.errors.length} Errores encontrados:
                       </h4>
                       <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-mono">
                           {results.errors.map((err, idx) => (
                               <li key={idx}>{err}</li>
                           ))}
                       </ul>
                   </div>
               )}

               <div className="flex justify-center gap-3 pt-4">
                   {results.errors.length > 0 && (
                       <Button variant="secondary" onClick={reset}>Subir otro archivo</Button>
                   )}
                   <Button onClick={onClose} className="min-w-[120px]">Finalizar</Button>
               </div>
           </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Leads" size="xl">
        {renderStep()}
    </Modal>
  );
};

export default BulkImportModal;