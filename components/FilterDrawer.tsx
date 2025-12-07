// components/FilterDrawer.tsx
import React, { useState, useEffect } from 'react';
import { Profile, Status, Licenciatura } from '../types';
import Button from './common/Button';
import { Select, Input } from './common/FormElements'; // Usamos los nuevos componentes
import XIcon from './icons/XIcon';
import FunnelIcon from './icons/FunnelIcon';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Profile[];
  statuses: Status[];
  licenciaturas: Licenciatura[];
  currentFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export interface FilterState {
  advisorId: string;
  statusId: string;
  programId: string;
  startDate: string;
  endDate: string;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  advisors,
  statuses,
  licenciaturas,
  currentFilters,
  onApplyFilters,
  onClearFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters = {
        advisorId: 'all',
        statusId: 'all',
        programId: 'all',
        startDate: '',
        endDate: ''
    };
    setLocalFilters(emptyFilters);
    onClearFilters();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-out border-l border-gray-100 dark:border-slate-700 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Moderno (Blanco/Limpio) */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white/80 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2.5 text-brand-primary dark:text-blue-400">
                  <div className="p-2 bg-brand-secondary/10 dark:bg-blue-900/30 rounded-lg text-brand-secondary dark:text-blue-400">
                      <FunnelIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filtros</h2>
              </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-full transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            <div className="space-y-5">
                <Select
                    label="Asesor Asignado"
                    name="advisorId"
                    value={localFilters.advisorId}
                    onChange={handleChange}
                    options={[
                        { value: 'all', label: 'Todos los Asesores' },
                        ...advisors.map(a => ({ value: a.id, label: a.full_name }))
                    ]}
                />

                <Select
                    label="Estado del Lead"
                    name="statusId"
                    value={localFilters.statusId}
                    onChange={handleChange}
                    options={[
                        { value: 'all', label: 'Todos los Estados' },
                        ...statuses.map(s => ({ value: s.id, label: s.name }))
                    ]}
                />

                <Select
                    label="Licenciatura de Interés"
                    name="programId"
                    value={localFilters.programId}
                    onChange={handleChange}
                    options={[
                        { value: 'all', label: 'Todas las Licenciaturas' },
                        ...licenciaturas.map(l => ({ value: l.id, label: l.name }))
                    ]}
                />
            </div>

            <div className="pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Rango de Fechas</h3>
                <div className="space-y-4">
                    <Input
                        label="Desde"
                        type="date"
                        name="startDate"
                        value={localFilters.startDate}
                        onChange={handleChange}
                    />
                    <Input
                        label="Hasta"
                        type="date"
                        name="endDate"
                        value={localFilters.endDate}
                        onChange={handleChange}
                    />
                </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex gap-3">
            <Button 
                variant="ghost"
                onClick={handleClear}
                className="w-1/3"
            >
                Limpiar
            </Button>
            <Button onClick={handleApply} className="w-2/3 shadow-lg shadow-brand-secondary/20">
                Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterDrawer;