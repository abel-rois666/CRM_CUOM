// components/LeadFormModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lead, Profile, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input, Select } from './common/FormElements';
import { supabase } from '../lib/supabase';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';

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

  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Referencia para el temporizador de búsqueda (Debounce)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setErrors({});
    setDuplicateWarning(null);
    
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
      // VALORES POR DEFECTO PARA NUEVOS LEADS
      
      // Estado Inicial: Mantenemos un default lógico (generalmente 'Sin Contactar'), 
      // pero si quieres que también sea elegible obligatoriamente, cámbialo a ''.
      const defaultStatus = statuses.find(s => s.name === 'Sin Contactar') || statuses.find(s => s.category === 'active');
      const defaultStatusId = defaultStatus ? defaultStatus.id : (statuses[0]?.id || '');
      
      // CAMBIO IMPORTANTE: Iniciamos estos campos vacíos para forzar selección y mostrar placeholder
      // El asesor se pre-selecciona solo si es un 'advisor' creando su propio lead, si es admin queda vacío.
      const defaultAdvisorId = currentUser?.role === 'advisor' ? currentUser.id : '';

      setFormData({
        first_name: '',
        paternal_last_name: '',
        maternal_last_name: '',
        email: '',
        phone: '',
        program_id: '', // Vacío para mostrar "Seleccionar Licenciatura..."
        status_id: defaultStatusId,
        advisor_id: defaultAdvisorId, // Vacío si es admin
        source_id: '', // Vacío para mostrar "Seleccionar origen..."
      });
    }
  }, [leadToEdit, isOpen, advisors, statuses, sources, licenciaturas, currentUser]);

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  const validateEmailFormat = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Verificación de duplicados en el servidor
  const checkDuplicate = useCallback(async (field: 'email' | 'phone', value: string) => {
    if (!value || leadToEdit) return;

    setIsChecking(true);
    const { data, error } = await supabase.rpc('check_duplicate_lead', {
        check_email: field === 'email' ? value : null,
        check_phone: field === 'phone' ? value : null
    });

    if (!error && data && data.length > 0) {
        const existing = data[0];
        setDuplicateWarning(`⚠️ Este ${field === 'email' ? 'correo' : 'teléfono'} ya existe (Asesor: ${existing.advisor_name || 'Sin asignar'}).`);
    } else {
        setDuplicateWarning(prev => {
            if (prev && prev.includes('correo') && field === 'email') return null;
            if (prev && prev.includes('teléfono') && field === 'phone') return null;
            return prev;
        });
    }
    setIsChecking(false);
  }, [leadToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const finalValue = name === 'email' ? value.toLowerCase() : value;

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (name === 'email') {
        if (value && !validateEmailFormat(value)) {
            setErrors(prev => ({ ...prev, email: 'Formato inválido' }));
        } else {
            setErrors(prev => ({ ...prev, email: undefined }));
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => checkDuplicate('email', finalValue), 800);
        }
    }
    
    if (name === 'phone') {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => checkDuplicate('phone', finalValue), 800);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (['first_name', 'paternal_last_name', 'maternal_last_name'].includes(name)) {
          setFormData(prev => ({ ...prev, [name]: toTitleCase(value.trim()) }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.email && !validateEmailFormat(formData.email)) {
        setErrors(prev => ({ ...prev, email: 'Email inválido' }));
        return;
    }
    
    if (duplicateWarning && !leadToEdit) {
        if (!confirm(`${duplicateWarning}\n¿Deseas registrarlo de todos modos?`)) return;
    }

    setIsSubmitting(true);

    const leadPayload = {
        ...formData,
        first_name: toTitleCase(formData.first_name.trim()),
        paternal_last_name: toTitleCase(formData.paternal_last_name.trim()),
        maternal_last_name: formData.maternal_last_name ? toTitleCase(formData.maternal_last_name.trim()) : undefined,
        email: formData.email.trim() || undefined,
    };
    
    await new Promise(r => setTimeout(r, 500));
    
    onSave(leadPayload, leadToEdit?.id);
    setIsSubmitting(false);
    onClose();
  };
  
  const formIsInvalid = 
      !formData.first_name || 
      !formData.paternal_last_name || 
      !formData.phone || 
      !formData.advisor_id || 
      !formData.status_id || 
      !formData.source_id || 
      !formData.program_id || 
      !!errors.email;

  const availableAdvisors = currentUser?.role === 'admin' || currentUser?.role === 'moderator'
    ? advisors 
    : advisors.filter(a => a.id === currentUser?.id);

  // CAMBIO: Aumentamos size a "2xl" para que los campos tengan más espacio
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Editar Lead' : 'Nuevo Lead'} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {duplicateWarning && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md animate-fade-in">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-amber-700 font-bold">{duplicateWarning}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
           <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Datos Personales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <Input 
                    name="first_name" 
                    label="Nombre(s)" 
                    value={formData.first_name} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    required 
                    placeholder="Ej. María"
                />
                <Input 
                    name="paternal_last_name" 
                    label="Apellido Paterno" 
                    value={formData.paternal_last_name} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    required 
                    placeholder="Ej. López"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input 
                    name="maternal_last_name" 
                    label="Apellido Materno" 
                    value={formData.maternal_last_name} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    placeholder="Opcional"
                />
                <Select 
                    name="program_id"
                    label="Licenciatura de Interés"
                    value={formData.program_id}
                    onChange={handleChange}
                    required
                    // Agregamos el placeholder explícito
                    placeholder="-- Seleccionar Licenciatura --"
                    options={licenciaturas.map(l => ({ value: l.id, label: l.name }))}
                />
            </div>
        </div>
        
        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50">
          <h4 className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wider mb-4">Contacto</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative">
                    <Input 
                        name="phone" 
                        type="tel"
                        label="Teléfono / WhatsApp" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        required 
                        placeholder="10 dígitos"
                        className={duplicateWarning?.includes('teléfono') ? 'border-amber-400 ring-1 ring-amber-400' : ''}
                    />
                    {isChecking && <span className="absolute right-3 top-9 text-xs text-gray-400">Verificando...</span>}
                </div>
                <div className="relative">
                    <Input 
                        name="email" 
                        type="email"
                        label="Correo Electrónico" 
                        value={formData.email} 
                        onChange={handleChange} 
                        error={errors.email}
                        placeholder="correo@ejemplo.com"
                        className={duplicateWarning?.includes('correo') ? 'border-amber-400 ring-1 ring-amber-400' : ''}
                    />
                </div>
            </div>
        </div>

        {/* Ajuste de Grid para la última fila: Espacio más amplio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Select 
                name="source_id"
                label="Origen"
                value={formData.source_id}
                onChange={handleChange}
                required
                placeholder="-- Seleccionar --"
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
            <Select 
                name="advisor_id"
                label="Asignar a"
                value={formData.advisor_id}
                onChange={handleChange}
                required
                disabled={currentUser?.role === 'advisor'}
                placeholder="-- Seleccionar --"
                options={availableAdvisors.map(a => ({ value: a.id, label: a.full_name }))}
            />
        </div>

        <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100 dark:border-slate-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={formIsInvalid || isSubmitting} className="shadow-lg shadow-brand-secondary/20 min-w-[140px]">
            {isSubmitting ? 'Guardando...' : (leadToEdit ? 'Actualizar Lead' : 'Crear Lead')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeadFormModal;