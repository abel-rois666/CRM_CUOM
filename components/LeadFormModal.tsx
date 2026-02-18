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
  // Estado para el toggle de nombre desconocido
  const [isAnonymous, setIsAnonymous] = useState(false);

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
    setIsAnonymous(false);

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

  // Manejar el toggle de nombre desconocido
  const handleAnonymousToggle = useCallback(async (checked: boolean) => {
    setIsAnonymous(checked);

    if (checked) {
      // Contar leads genéricos existentes para generar el siguiente número
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .like('first_name', 'Lead-%');

      const nextNumber = (count || 0) + 1;
      setValue('first_name', `Lead-${nextNumber}`, { shouldValidate: true });
      setValue('paternal_last_name', 'Sin Identificar', { shouldValidate: true });
    } else {
      // Limpiar los campos al desactivar
      setValue('first_name', '', { shouldValidate: false });
      setValue('paternal_last_name', '', { shouldValidate: false });
    }
  }, [setValue]);

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
      // Si es anónimo, conservar el nombre genérico tal cual (sin toTitleCase que rompería Lead-N)
      first_name: isAnonymous ? data.first_name : toTitleCase(data.first_name.trim()),
      paternal_last_name: isAnonymous ? data.paternal_last_name : toTitleCase(data.paternal_last_name.trim()),
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

  // Detectar si el lead que se edita ya tiene nombre genérico
  const isEditingAnonymous = leadToEdit
    ? /^Lead-\d+$/.test(leadToEdit.first_name)
    : false;

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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Datos Personales</h4>

            {/* Toggle de nombre desconocido — solo visible al crear, o si ya es anónimo */}
            {(!leadToEdit || isEditingAnonymous) && (
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Nombre desconocido
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAnonymous}
                    onChange={(e) => handleAnonymousToggle(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${isAnonymous ? 'bg-amber-400' : 'bg-gray-300 dark:bg-slate-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isAnonymous ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            )}
          </div>

          {/* Aviso cuando el modo anónimo está activo */}
          {isAnonymous && (
            <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span>🏷️</span>
              <span>Se asignará un nombre genérico. Puedes actualizarlo cuando se conozca el nombre real.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
            <Input
              label="Nombre(s)"
              {...register('first_name')}
              autoComplete="given-name"
              error={errors.first_name?.message}
              placeholder={isAnonymous ? 'Generado automáticamente' : 'Ej. María'}
              disabled={isAnonymous}
              className={isAnonymous ? 'opacity-60 cursor-not-allowed' : ''}
              // Keep TitleCase behavior on Blur (solo si no es anónimo)
              onBlur={(e) => {
                if (!isAnonymous) setValue('first_name', toTitleCase(e.target.value.trim()), { shouldDirty: true, shouldValidate: true });
              }}
            />
            <Input
              label="Apellido Paterno"
              {...register('paternal_last_name')}
              autoComplete="family-name"
              error={errors.paternal_last_name?.message}
              placeholder={isAnonymous ? 'Sin Identificar' : 'Ej. López'}
              disabled={isAnonymous}
              className={isAnonymous ? 'opacity-60 cursor-not-allowed' : ''}
              onBlur={(e) => {
                if (!isAnonymous) setValue('paternal_last_name', toTitleCase(e.target.value.trim()), { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Apellido Materno"
              {...register('maternal_last_name')}
              autoComplete="family-name"
              error={errors.maternal_last_name?.message}
              placeholder="Opcional"
              onBlur={(e) => {
                setValue('maternal_last_name', toTitleCase(e.target.value.trim()), { shouldDirty: true, shouldValidate: true });
              }}
            />
            <Select
              label="Licenciatura de Interés"
              {...register('program_id')}
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
                autoComplete="tel"
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
                autoComplete="email"
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