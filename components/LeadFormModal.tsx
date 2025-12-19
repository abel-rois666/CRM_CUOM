// components/LeadFormModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // [NEW] Hook Form
import { zodResolver } from '@hookform/resolvers/zod'; // [NEW] Resolver
import { Lead, Profile, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input, Select } from './common/FormElements';
import { supabase } from '../lib/supabase';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import { leadSchema, LeadFormData } from '../utils/schemas'; // [NEW] Schema

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

const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen, onClose, onSave, leadToEdit, advisors, statuses, sources, licenciaturas, currentUser
}) => {
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook Form Initialization
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid }
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      first_name: '',
      paternal_last_name: '',
      maternal_last_name: '',
      email: '',
      phone: '',
      program_id: '',
      status_id: '',
      advisor_id: '',
      source_id: '',
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Form State
  useEffect(() => {
    setDuplicateWarning(null);

    if (isOpen) {
      if (leadToEdit) {
        reset({
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
        const defaultStatus = statuses.find(s => s.name === 'Sin Contactar') || statuses.find(s => s.category === 'active');
        const defaultStatusId = defaultStatus ? defaultStatus.id : (statuses[0]?.id || '');
        const defaultAdvisorId = currentUser?.role === 'advisor' ? currentUser.id : '';

        reset({
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
    }
  }, [isOpen, leadToEdit, statuses, currentUser, reset]);

  // Utility to Title Case
  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  // Watch fields for duplicate check
  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');

  // Duplicate Check API logic
  const checkDuplicate = useCallback(async (field: 'email' | 'phone', value: string) => {
    if (!value || leadToEdit) return;

    // Don't check invalid formats (let Zod handle that first)
    if (field === 'phone' && value.length !== 10) return;
    if (field === 'email' && !value.includes('@')) return;

    setIsChecking(true);
    const { data, error } = await (supabase.rpc as any)('check_duplicate_lead', {
      check_email: field === 'email' ? value : null,
      check_phone: field === 'phone' ? value : null
    });

    const results = data as { id: string; advisor_name: string }[] | null;

    if (!error && results && results.length > 0) {
      const existing = results[0];
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

  // Trigger Duplicate Check on debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (watchedEmail) {
      timerRef.current = setTimeout(() => checkDuplicate('email', watchedEmail), 800);
    }
    // Cleanup on unmount or change
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [watchedEmail, checkDuplicate]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (watchedPhone) {
      timerRef.current = setTimeout(() => checkDuplicate('phone', watchedPhone), 800);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [watchedPhone, checkDuplicate]);


  const onSubmit: SubmitHandler<LeadFormData> = async (data) => {
    if (duplicateWarning && !leadToEdit) {
      if (!confirm(`${duplicateWarning}\n¿Deseas registrarlo de todos modos?`)) return;
    }

    setIsSubmitting(true);

    const leadPayload = {
      ...data,
      first_name: toTitleCase(data.first_name.trim()),
      paternal_last_name: toTitleCase(data.paternal_last_name.trim()),
      maternal_last_name: data.maternal_last_name ? toTitleCase(data.maternal_last_name.trim()) : undefined,
      email: data.email?.trim() || undefined,
    };

    await new Promise(r => setTimeout(r, 500));
    onSave(leadPayload, leadToEdit?.id);
    setIsSubmitting(false);
    onClose();
  };

  const availableAdvisors = currentUser?.role === 'admin' || currentUser?.role === 'moderator'
    ? advisors
    : advisors.filter(a => a.id === currentUser?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Editar Lead' : 'Nuevo Lead'} size="2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

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
              label="Nombre(s)"
              {...register('first_name')}
              error={errors.first_name?.message}
              placeholder="Ej. María"
              // Keep TitleCase behavior on Blur
              onBlur={(e) => {
                setValue('first_name', toTitleCase(e.target.value.trim()));
              }}
            />
            <Input
              label="Apellido Paterno"
              {...register('paternal_last_name')}
              error={errors.paternal_last_name?.message}
              placeholder="Ej. López"
              onBlur={(e) => {
                setValue('paternal_last_name', toTitleCase(e.target.value.trim()));
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Apellido Materno"
              {...register('maternal_last_name')}
              error={errors.maternal_last_name?.message}
              placeholder="Opcional"
              onBlur={(e) => {
                setValue('maternal_last_name', toTitleCase(e.target.value.trim()));
              }}
            />
            <Select
              label="Licenciatura de Interés"
              {...register('program_id')}
              // Convert error to string safely or rely on helper logic if Select accepts string
              // Assuming Select props: name, value undefined (handled by register), onChange (handled), error (string)
              // To hook Select properly with register, we need to pass the props spread.
              // Note: Our custom Select component might need 'error' prop.
              // If 'register' returns ref, name, onChange, onBlur.
              error={errors.program_id?.message}
              options={licenciaturas.map(l => ({ value: l.id, label: l.name }))}
              placeholder="-- Seleccionar Licenciatura --"
            />
          </div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50">
          <h4 className="text-xs font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wider mb-4">Contacto</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative">
              <Input
                label="Teléfono / WhatsApp"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="10 dígitos"
                maxLength={10} // HTML Constraint
                className={duplicateWarning?.includes('teléfono') ? 'border-amber-400 ring-1 ring-amber-400' : ''}
              />
              {isChecking && <span className="absolute right-3 top-9 text-xs text-gray-400">Verificando...</span>}
            </div>
            <div className="relative">
              <Input
                label="Correo Electrónico"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="correo@ejemplo.com"
                className={duplicateWarning?.includes('correo') ? 'border-amber-400 ring-1 ring-amber-400' : ''}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Select
            label="Origen"
            {...register('source_id')}
            error={errors.source_id?.message}
            options={sources.map(s => ({ value: s.id, label: s.name }))}
            placeholder="-- Seleccionar --"
          />
          <Select
            label="Estado Inicial"
            {...register('status_id')}
            error={errors.status_id?.message}
            options={statuses.map(s => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Asignar a"
            {...register('advisor_id')}
            error={errors.advisor_id?.message}
            disabled={currentUser?.role === 'advisor'}
            options={availableAdvisors.map(a => ({ value: a.id, label: a.full_name }))}
            placeholder="-- Seleccionar --"
          />
        </div>

        <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100 dark:border-slate-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={!isValid || isSubmitting} className="shadow-lg shadow-brand-secondary/20 min-w-[140px]">
            {isSubmitting ? 'Guardando...' : (leadToEdit ? 'Actualizar Lead' : 'Crear Lead')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeadFormModal;