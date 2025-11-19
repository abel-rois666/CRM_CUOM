
import React, { useState, useEffect } from 'react';
import { Profile, Status, Licenciatura } from '../types';
import Button from './common/Button';
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

  // Sync local state when the drawer opens or currentFilters change externally
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
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity" 
            onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-brand-primary text-white">
            <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Filtros Avanzados</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Advisor Filter */}
            <div>
              <label htmlFor="advisorId" className="block text-sm font-medium text-gray-700 mb-1">Asesor Asignado</label>
              <select
                id="advisorId"
                name="advisorId"
                value={localFilters.advisorId}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
              >
                <option value="all">Todos los Asesores</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="statusId" className="block text-sm font-medium text-gray-700 mb-1">Estado del Lead</label>
              <select
                id="statusId"
                name="statusId"
                value={localFilters.statusId}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
              >
                <option value="all">Todos los Estados</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Program Filter */}
            <div>
              <label htmlFor="programId" className="block text-sm font-medium text-gray-700 mb-1">Licenciatura de Interés</label>
              <select
                id="programId"
                name="programId"
                value={localFilters.programId}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
              >
                <option value="all">Todas las Licenciaturas</option>
                {licenciaturas.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <hr className="border-gray-200" />

            {/* Date Range */}
            <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Fecha de Registro</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="startDate" className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={localFilters.startDate}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={localFilters.endDate}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                        />
                    </div>
                </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button 
                onClick={handleClear}
                className="text-sm text-gray-600 hover:text-red-600 font-medium underline underline-offset-2 decoration-dotted"
            >
                Limpiar todo
            </button>
            <Button onClick={handleApply}>
                Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterDrawer;
