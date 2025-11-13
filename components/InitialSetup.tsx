import React, { useState, useRef } from 'react';
import { InitialData } from '../App';
import Button from './common/Button';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';

interface InitialSetupProps {
  onSetupComplete: (data: InitialData) => void;
  demoData: InitialData;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupComplete, demoData }) => {
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUseDemoData = () => {
    onSetupComplete(demoData);
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
        const data = JSON.parse(text);

        // Validate structure
        const requiredKeys: (keyof InitialData)[] = ['advisors', 'statuses', 'sources', 'licenciaturas', 'leads'];
        const missingKeys = requiredKeys.filter(key => !(key in data));
        
        if (missingKeys.length > 0) {
          throw new Error(`El archivo JSON no es válido. Faltan las siguientes claves: ${missingKeys.join(', ')}`);
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
    
    // Reset file input value to allow re-uploading the same file
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
          Parece que es la primera vez que utilizas la aplicación. Para comenzar, puedes cargar un conjunto de datos de demostración o importar tu propia configuración desde un archivo JSON.
        </p>

        <div className="space-y-4">
          <Button onClick={handleUseDemoData} size="lg" className="w-full">
            Cargar Datos de Demostración
          </Button>
          <Button onClick={handleImportClick} size="lg" variant="secondary" className="w-full" leftIcon={<ArrowUpTrayIcon className="w-5 h-5" />}>
            Importar desde Archivo JSON
          </Button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
          aria-hidden="true"
        />

        {error && (
            <div className="mt-6 p-3 bg-red-100 border border-red-200 text-red-800 rounded-md text-sm">
                {error}
            </div>
        )}

        <div className="mt-8 text-xs text-gray-400">
            <p>El archivo JSON debe contener las claves: `advisors`, `statuses`, `sources`, `licenciaturas`, y `leads`.</p>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;
