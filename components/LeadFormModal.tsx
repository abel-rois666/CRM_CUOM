
import React, { useState, useEffect } from 'react';
import { Lead, Profile, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Omit<Lead, 'id' | 'registration_date' | 'status_history'>, leadIdToEdit?: string) => void;
  leadToEdit: Lead | null;
  advisors: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  currentUser: Profile | null;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({ isOpen, onClose, onSave, leadToEdit, advisors, statuses, sources, licenciaturas, currentUser }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    paternal_last_name: '',
    maternal_last_name: '',
    email: '',
    phone: '',
    program_id: '',
    status_id: '',
    advisor_id: '',
    source_id: '',
  });

  useEffect(() => {
    if (leadToEdit) {
      setFormData({
        first_name: leadToEdit.first_name,
        paternal_last_name: leadToEdit.paternal_last_name,
        maternal_last_name: leadToEdit.maternal_last_name || '',
        email: leadToEdit.email || '',
        phone: leadToEdit.phone,
        program_id: leadToEdit.program_id,
        status_id: leadToEdit.status_id,
        advisor_id: leadToEdit.advisor_id,
        source_id: leadToEdit.source_id,
      });
    } else {
      // Default advisor logic: If advisor, default to self. If admin, default to first in list.
      const defaultAdvisorId = currentUser?.role === 'advisor' 
        ? currentUser.id 
        : (advisors[0]?.id || '');

      setFormData({
        first_name: '',
        paternal_last_name: '',
        maternal_last_name: '',
        email: '',
        phone: '',
        program_id: licenciaturas[0]?.id || '',
        status_id: statuses[0]?.id || '',
        advisor_id: defaultAdvisorId,
        source_id: sources[0]?.id || '',
      });
    }
  }, [leadToEdit, isOpen, advisors, statuses, sources, licenciaturas, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const leadPayload = {
        ...formData,
        email: formData.email || undefined,
        maternal_last_name: formData.maternal_last_name || undefined,
    };
    
    onSave(leadPayload, leadToEdit?.id);
    onClose();
  };
  
  const formIsInvalid = !formData.first_name || !formData.paternal_last_name || !formData.phone || !formData.advisor_id || !formData.status_id || !formData.source_id || !formData.program_id;

  // Filter advisors available for selection
  const availableAdvisors = currentUser?.role === 'admin' 
    ? advisors 
    : advisors.filter(a => a.id === currentUser?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Editar Lead' : 'Añadir Nuevo Lead'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">Nombre(s)</label>
              <input type="text" name="first_name" id="first_name" value={formData.first_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="paternal_last_name" className="block text-sm font-medium text-gray-700">Apellido Paterno</label>
              <input type="text" name="paternal_last_name" id="paternal_last_name" value={formData.paternal_last_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
            </div>
        </div>
        <div>
          <label htmlFor="maternal_last_name" className="block text-sm font-medium text-gray-700">Apellido Materno (Opcional)</label>
          <input type="text" name="maternal_last_name" id="maternal_last_name" value={formData.maternal_last_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico (Opcional)</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="program_id" className="block text-sm font-medium text-gray-700">Licenciatura de Interés</label>
          <select name="program_id" id="program_id" value={formData.program_id} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {licenciaturas.map(lic => <option key={lic.id} value={lic.id}>{lic.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="source_id" className="block text-sm font-medium text-gray-700">Origen del Lead</label>
          <select name="source_id" id="source_id" value={formData.source_id} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="advisor_id" className="block text-sm font-medium text-gray-700">Asesor Asignado</label>
          <select 
            name="advisor_id" 
            id="advisor_id" 
            value={formData.advisor_id} 
            onChange={handleChange} 
            required 
            disabled={currentUser?.role === 'advisor'}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md ${currentUser?.role === 'advisor' ? 'bg-gray-100 text-gray-500' : ''}`}
          >
            {availableAdvisors.map(advisor => <option key={advisor.id} value={advisor.id}>{advisor.full_name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status_id" className="block text-sm font-medium text-gray-700">Estado</label>
          <select name="status_id" id="status_id" value={formData.status_id} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {statuses.map(status => <option key={status.id} value={status.id}>{status.name}</option>)}
          </select>
        </div>
        <div className="pt-4 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={formIsInvalid}>
            {leadToEdit ? 'Guardar Cambios' : 'Crear Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeadFormModal;
