import React, { useState, useEffect } from 'react';
import { Lead, Advisor, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  leadToEdit: Lead | null;
  advisors: Advisor[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({ isOpen, onClose, onSave, leadToEdit, advisors, statuses, sources, licenciaturas }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    email: '',
    phone: '',
    programId: '',
    statusId: '',
    advisorId: '',
    sourceId: '',
  });

  useEffect(() => {
    if (leadToEdit) {
      setFormData({
        firstName: leadToEdit.firstName,
        paternalLastName: leadToEdit.paternalLastName,
        maternalLastName: leadToEdit.maternalLastName || '',
        email: leadToEdit.email || '',
        phone: leadToEdit.phone,
        programId: leadToEdit.programId,
        statusId: leadToEdit.statusId,
        advisorId: leadToEdit.advisorId,
        sourceId: leadToEdit.sourceId,
      });
    } else {
      setFormData({
        firstName: '',
        paternalLastName: '',
        maternalLastName: '',
        email: '',
        phone: '',
        programId: licenciaturas[0]?.id || '',
        statusId: statuses[0]?.id || '',
        advisorId: advisors[0]?.id || '',
        sourceId: sources[0]?.id || '',
      });
    }
  }, [leadToEdit, isOpen, advisors, statuses, sources, licenciaturas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const registrationDate = leadToEdit ? leadToEdit.registrationDate : new Date().toISOString();
    const newLead: Lead = {
      id: leadToEdit ? leadToEdit.id : registrationDate,
      ...formData,
      email: formData.email || undefined,
      maternalLastName: formData.maternalLastName || undefined,
      registrationDate,
      followUps: leadToEdit ? leadToEdit.followUps : [],
      appointments: leadToEdit ? leadToEdit.appointments : [],
      // FIX: Added statusHistory to satisfy the Lead type.
      statusHistory: leadToEdit?.statusHistory || [],
    };
    onSave(newLead);
    onClose();
  };
  
  const formIsInvalid = !formData.firstName || !formData.paternalLastName || !formData.phone || !formData.advisorId || !formData.statusId || !formData.sourceId || !formData.programId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Editar Lead' : 'Añadir Nuevo Lead'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Nombre(s)</label>
              <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="paternalLastName" className="block text-sm font-medium text-gray-700">Apellido Paterno</label>
              <input type="text" name="paternalLastName" id="paternalLastName" value={formData.paternalLastName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
            </div>
        </div>
        <div>
          <label htmlFor="maternalLastName" className="block text-sm font-medium text-gray-700">Apellido Materno (Opcional)</label>
          <input type="text" name="maternalLastName" id="maternalLastName" value={formData.maternalLastName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" />
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
          <label htmlFor="programId" className="block text-sm font-medium text-gray-700">Licenciatura de Interés</label>
          <select name="programId" id="programId" value={formData.programId} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {licenciaturas.map(lic => <option key={lic.id} value={lic.id}>{lic.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sourceId" className="block text-sm font-medium text-gray-700">Origen del Lead</label>
          <select name="sourceId" id="sourceId" value={formData.sourceId} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="advisorId" className="block text-sm font-medium text-gray-700">Asesor Asignado</label>
          <select name="advisorId" id="advisorId" value={formData.advisorId} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            {advisors.map(advisor => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="statusId" className="block text-sm font-medium text-gray-700">Estado</label>
          <select name="statusId" id="statusId" value={formData.statusId} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
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