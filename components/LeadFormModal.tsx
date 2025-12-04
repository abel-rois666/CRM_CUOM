// components/LeadFormModal.tsx
import React, { useState, useEffect } from 'react';
import { Lead, Profile, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input, Select } from './common/FormElements';

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

  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setEmailError(null);
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
      const defaultAdvisorId = currentUser?.role === 'advisor' ? currentUser.id : ''; 
      const defaultStatus = statuses.find(s => s.name === 'Sin Contactar');
      const defaultStatusId = defaultStatus ? defaultStatus.id : (statuses[0]?.id || '');

      setFormData({
        first_name: '',
        paternal_last_name: '',
        maternal_last_name: '',
        email: '',
        phone: '',
        program_id: '',
        status_id: defaultStatusId,
        advisor_id: defaultAdvisorId,
        source_id: '',
      });
    }
  }, [leadToEdit, isOpen, advisors, statuses, sources, licenciaturas, currentUser]);

  // UTILIDAD: Función para capitalizar palabras (Title Case)
  const toTitleCase = (str: string) => {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  const validateEmailFormat = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Lógica especial: Email siempre minúsculas en tiempo real
    const finalValue = name === 'email' ? value.toLowerCase() : value;

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (name === 'email' && emailError) {
        if (!finalValue || validateEmailFormat(finalValue)) {
            setEmailError(null);
        }
    }
  };

  // NUEVO: Formatear al perder el foco (cuando el usuario termina de escribir)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      // Solo aplicamos formato a campos de texto de nombre
      if (['first_name', 'paternal_last_name', 'maternal_last_name'].includes(name)) {
          setFormData(prev => ({ ...prev, [name]: toTitleCase(value.trim()) }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.email && !validateEmailFormat(formData.email)) {
        setEmailError('Formato inválido.');
        return;
    }

    // Limpieza final antes de enviar (Trim + Formato asegurado)
    const leadPayload = {
        ...formData,
        first_name: toTitleCase(formData.first_name.trim()),
        paternal_last_name: toTitleCase(formData.paternal_last_name.trim()),
        maternal_last_name: formData.maternal_last_name ? toTitleCase(formData.maternal_last_name.trim()) : undefined,
        email: formData.email.trim() || undefined,
    };
    
    onSave(leadPayload, leadToEdit?.id);
    onClose();
  };
  
  const formIsInvalid = !formData.first_name || !formData.paternal_last_name || !formData.phone || !formData.advisor_id || !formData.status_id || !formData.source_id || !formData.program_id || !!emailError;

  const availableAdvisors = currentUser?.role === 'admin' 
    ? advisors 
    : advisors.filter(a => a.id === currentUser?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Editar Lead' : 'Nuevo Lead'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input 
                name="first_name" 
                label="Nombre(s)" 
                value={formData.first_name} 
                onChange={handleChange} 
                onBlur={handleBlur} // Aplicar formato al salir
                required 
                placeholder="Ej. María"
            />
            <Input 
                name="paternal_last_name" 
                label="Apellido Paterno" 
                value={formData.paternal_last_name} 
                onChange={handleChange} 
                onBlur={handleBlur} // Aplicar formato al salir
                required 
                placeholder="Ej. López"
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input 
                name="maternal_last_name" 
                label="Apellido Materno" 
                value={formData.maternal_last_name} 
                onChange={handleChange} 
                onBlur={handleBlur} // Aplicar formato al salir
                placeholder="Opcional"
            />
            <Input 
                name="phone" 
                type="tel"
                label="Teléfono / WhatsApp" 
                value={formData.phone} 
                onChange={handleChange} 
                required 
                placeholder="10 dígitos"
            />
        </div>

        <Input 
            name="email" 
            type="email"
            label="Correo Electrónico" 
            value={formData.email} 
            onChange={handleChange} 
            error={emailError || undefined}
            placeholder="correo@ejemplo.com"
        />

        <div className="border-t border-gray-100 my-4"></div>

        <Select 
            name="program_id"
            label="Licenciatura de Interés"
            value={formData.program_id}
            onChange={handleChange}
            required
            placeholder="Seleccionar Licenciatura..."
            options={licenciaturas.map(l => ({ value: l.id, label: l.name }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select 
                name="source_id"
                label="Origen del Lead"
                value={formData.source_id}
                onChange={handleChange}
                required
                placeholder="Seleccionar origen..."
                options={sources.map(s => ({ value: s.id, label: s.name }))}
            />
            <Select 
                name="status_id"
                label="Estado Inicial"
                value={formData.status_id}
                onChange={handleChange}
                required
                options={statuses.map(s => ({ value: s.id, label: s.name }))}
            />
        </div>

        <Select 
            name="advisor_id"
            label="Asesor Asignado"
            value={formData.advisor_id}
            onChange={handleChange}
            required
            disabled={currentUser?.role === 'advisor'}
            placeholder="Asignar a..."
            options={availableAdvisors.map(a => ({ value: a.id, label: a.full_name }))}
        />

        <div className="pt-6 flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={formIsInvalid} className="shadow-lg shadow-brand-secondary/20">
            {leadToEdit ? 'Guardar Cambios' : 'Crear Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeadFormModal;