import React, { useState, useRef } from 'react';
import { InitialData } from '../App';
import Button from './common/Button';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import { Advisor, Lead, Licenciatura, Source, Status } from '../types';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface InitialSetupProps {
  onSetupComplete: (data: InitialData) => void;
  demoData: InitialData;
  demoCsvData: string;
}

const colors = [
  'bg-slate-500', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

/**
 * A simple CSV row parser that handles double-quoted fields containing commas.
 * @param rowString The string for a single CSV row.
 * @returns An array of strings representing the cells in the row.
 */
const parseCsvRow = (rowString: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowString.length; i++) {
        const char = rowString[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"')); // Remove surrounding quotes and handle escaped quotes
};


const parseCsvData = (csvString: string): InitialData => {
    const lines = csvString.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) {
        throw new Error("El archivo CSV debe tener una cabecera y al menos una fila de datos.");
    }
    
    const header = parseCsvRow(lines[0]).map(h => h.trim());
    const rows = lines.slice(1);

    const requiredHeaders = ['firstName', 'paternalLastName', 'phone', 'programName', 'statusName', 'advisorName', 'advisorEmail', 'sourceName', 'registrationDate'];
    const missingHeaders = requiredHeaders.filter(h => !header.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas en el CSV: ${missingHeaders.join(', ')}`);
    }

    const advisorsMap = new Map<string, Advisor>();
    const statusesMap = new Map<string, Status>();
    const sourcesMap = new Map<string, Source>();
    const licenciaturasMap = new Map<string, Licenciatura>();
    const leads: Lead[] = [];
    
    let colorIndex = 0;

    for (const row of rows) {
        if (!row.trim()) continue;
        const values = parseCsvRow(row);
        const leadData: { [key: string]: string } = {};
        header.forEach((key, i) => {
            leadData[key] = values[i] || '';
        });

        // 1. Process related entities and get their IDs
        let advisor = advisorsMap.get(leadData.advisorName);
        if (!advisor) {
            advisor = {
                id: `advisor-${Date.now()}-${Math.random()}`,
                name: leadData.advisorName,
                email: leadData.advisorEmail,
            };
            advisorsMap.set(leadData.advisorName, advisor);
        }
        
        let status = statusesMap.get(leadData.statusName);
        if (!status) {
            status = {
                id: `status-${Date.now()}-${Math.random()}`,
                name: leadData.statusName,
                color: colors[colorIndex % colors.length],
            };
            statusesMap.set(leadData.statusName, status);
            colorIndex++;
        }
        
        let source = sourcesMap.get(leadData.sourceName);
        if(!source) {
            source = {
                id: `source-${Date.now()}-${Math.random()}`,
                name: leadData.sourceName
            };
            sourcesMap.set(leadData.sourceName, source);
        }

        let licenciatura = licenciaturasMap.get(leadData.programName);
        if(!licenciatura) {
            licenciatura = {
                id: `lic-${Date.now()}-${Math.random()}`,
                name: leadData.programName
            };
            licenciaturasMap.set(leadData.programName, licenciatura);
        }

        // 2. Create the Lead object
        const newLead: Lead = {
             id: `lead-${Date.now()}-${Math.random()}`,
             firstName: leadData.firstName,
             paternalLastName: leadData.paternalLastName,
             maternalLastName: leadData.maternalLastName || undefined,
             email: leadData.email || undefined,
             phone: leadData.phone,
             programId: licenciatura.id,
             statusId: status.id,
             advisorId: advisor.id,
             sourceId: source.id,
             registrationDate: new Date(leadData.registrationDate).toISOString(),
             followUps: [],
             appointments: [],
             statusHistory: [],
        };
        leads.push(newLead);
    }
    
    return {
        advisors: Array.from(advisorsMap.values()),
        statuses: Array.from(statusesMap.values()),
        sources: Array.from(sourcesMap.values()),
        licenciaturas: Array.from(licenciaturasMap.values()),
        leads,
    };
};

const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupComplete, demoData, demoCsvData }) => {
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUseDemoData = () => {
    onSetupComplete(demoData);
  };
  
  const handleUseDemoCsvData = () => {
      try {
          const data = parseCsvData(demoCsvData);
          onSetupComplete(data);
      } catch (err) {
          if (err instanceof Error) {
            setError(`Error al procesar datos CSV de demostración: ${err.message}`);
        } else {
            setError('Ocurrió un error desconocido.');
        }
      }
  };

  const handleImportClick = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('No se pudo leer el archivo.');
        }

        let data: InitialData;
        if (file.name.endsWith('.json')) {
            data = JSON.parse(text);
            const requiredKeys: (keyof InitialData)[] = ['advisors', 'statuses', 'sources', 'licenciaturas', 'leads'];
            const missingKeys = requiredKeys.filter(key => !(key in data));
            if (missingKeys.length > 0) {
              throw new Error(`El archivo JSON no es válido. Faltan las siguientes claves: ${missingKeys.join(', ')}`);
            }
        } else if (file.name.endsWith('.csv')) {
            data = parseCsvData(text);
        } else {
            throw new Error('Formato de archivo no soportado. Por favor, usa .json o .csv.');
        }

        onSetupComplete(data);
      } catch (err) {
        if (err instanceof Error) {
            setError(`Error al procesar el archivo: ${err.message}`);
        } else {
            setError('Ocurrió un error desconocido.');
        }
      }
    };
    reader.onerror = () => {
      setError('No se pudo leer el archivo.');
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-secondary/10 mb-6">
            <svg className="h-8 w-8 text-brand-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
            </svg>
        </div>
        <h1 className="text-3xl font-bold text-brand-primary mb-3">Bienvenido a CUOM CRM</h1>
        <p className="text-gray-600 mb-8">
          Para comenzar, puedes cargar un conjunto de datos de demostración o importar tu propia configuración desde un archivo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Button onClick={handleUseDemoData} size="lg" variant="secondary" leftIcon={<DocumentTextIcon className="w-5 h-5"/>}>
            Demo (JSON)
          </Button>
          <Button onClick={handleUseDemoCsvData} size="lg" variant="secondary" leftIcon={<DocumentTextIcon className="w-5 h-5"/>}>
            Demo (CSV)
          </Button>
        </div>
        
        <Button onClick={handleImportClick} size="lg" className="w-full" leftIcon={<ArrowUpTrayIcon className="w-5 h-5" />}>
            Importar desde Archivo (JSON o CSV)
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,.csv"
          className="hidden"
          aria-hidden="true"
        />

        {error && (
            <div className="mt-6 p-3 bg-red-100 border border-red-200 text-red-800 rounded-md text-sm">
                {error}
            </div>
        )}

        <div className="mt-8 text-xs text-gray-400">
            <p>El archivo JSON debe contener: `advisors`, `statuses`, `sources`, `licenciaturas`, y `leads`.</p>
            <p className="mt-1">El archivo CSV debe contener las columnas de la plantilla de demostración.</p>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;