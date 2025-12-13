import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Button from './common/Button';
import { Input } from './common/FormElements';
import CheckCircleIcon from './icons/CheckCircleIcon';
import RocketLaunchIcon from './icons/RocketLaunchIcon';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import Cog6ToothIcon from './icons/Cog6ToothIcon';
import { useCRMData } from '../hooks/useCRMData';

interface SetupWizardProps {
    onComplete: () => void;
    currentUser: any;
}

const steps = [
    { id: 'welcome', title: 'Bienvenida', icon: <RocketLaunchIcon className="w-6 h-6" /> },
    { id: 'branding', title: 'Personalización', icon: <BuildingOfficeIcon className="w-6 h-6" /> },
    { id: 'general', title: 'Configuración', icon: <Cog6ToothIcon className="w-6 h-6" /> },
    { id: 'data', title: 'Datos Iniciales', icon: <CheckCircleIcon className="w-6 h-6" /> },
];

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, currentUser }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();
    const { refreshCatalogs } = useCRMData(null, 'admin', currentUser.id);

    // Estados de Configuración
    const [companyName, setCompanyName] = useState('Mi Universidad');
    const [subtitle, setSubtitle] = useState('CRM Administrativo');
    const [logoUrl, setLogoUrl] = useState('');
    const [timezone, setTimezone] = useState('America/Mexico_City');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Estados de Carga
    const [seeding, setSeeding] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // --- LOGIC ---

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleLogoUpload = async (file: File) => {
        try {
            setLoading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${Math.random()}.${fileExt}`;
            const filePath = `branding/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setLogoUrl(publicUrl);
            success("Logo subido correctamente.");
        } catch (e: any) {
            error(`Error subiendo logo: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const seedData = async () => {
        setSeeding(true);
        try {
            // 1. Catálogos
            await supabase.from('licenciaturas').insert([{ name: 'Administración' }, { name: 'Derecho' }, { name: 'Psicología' }, { name: 'Ingeniería en Sistemas' }]).select();
            await supabase.from('sources').insert([{ name: 'Redes Sociales' }, { name: 'Google Ads' }, { name: 'Feria Vocacional' }, { name: 'Recomendación' }]).select();

            // 2. Leads de Prueba
            const { data: statusData } = await supabase.from('statuses').select('id, name').limit(1);
            const activeStatus = statusData?.[0]?.id;

            if (activeStatus) {
                await supabase.from('leads').insert([
                    { first_name: 'Juan', paternal_last_name: 'Pérez', email: 'juan.demo@example.com', phone: '5512345678', status_id: activeStatus, advisor_id: currentUser.id },
                    { first_name: 'María', paternal_last_name: 'González', email: 'maria.demo@example.com', phone: '5587654321', status_id: activeStatus, advisor_id: currentUser.id },
                    { first_name: 'Carlos', paternal_last_name: 'López', email: 'carlos.demo@example.com', phone: '5555555555', status_id: activeStatus, advisor_id: currentUser.id }
                ]);
            }

            setDataLoaded(true);
            success("¡Datos de muestra cargados!");
            refreshCatalogs(); // Refrescar contexto
        } catch (e: any) {
            console.error(e);
            error("Hubo un error cargando los datos, tal vez ya existían.");
        } finally {
            setSeeding(false);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // 1. Identificar fila existente para actualizar (Singleton Pattern)
            const { data: existingRow } = await supabase.from('organization_settings').select('id').limit(1).maybeSingle();

            if (existingRow?.id) {
                // Actualizar existente
                await supabase.from('organization_settings').update({
                    company_name: companyName,
                    company_subtitle: subtitle,
                    logo_url: logoUrl,
                    setup_completed: true
                }).eq('id', existingRow.id);
            } else {
                // Insertar nueva si está vacía
                await supabase.from('organization_settings').insert({
                    company_name: companyName,
                    company_subtitle: subtitle,
                    logo_url: logoUrl,
                    setup_completed: true
                });
            }

            // 2. Guardar System Settings (Timezone)
            await supabase.from('system_settings').upsert([
                { key: 'timezone', value: timezone },
                { key: 'notifications_enabled', value: JSON.stringify(notificationsEnabled) }
            ], { onConflict: 'key' });

            success("¡Configuración completada! Bienvenido.");
            onComplete(); // Callback to App to re-render
        } catch (e: any) {
            console.error("Error setup:", e);
            error(`Error finalizando setup: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---

    const renderStepContent = () => {
        switch (steps[currentStep].id) {
            case 'welcome':
                return (
                    <div className="text-center py-4 sm:py-10">
                        <RocketLaunchIcon className="w-16 h-16 sm:w-20 sm:h-20 text-brand-primary dark:text-blue-500 mx-auto mb-4 sm:mb-6" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">¡Bienvenido a tu CRM Universitario!</h2>
                        <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto text-base sm:text-lg px-2">
                            Estás a unos pasos de organizar tu proceso de admisiones. Configuremos lo básico para que tu equipo empiece a trabajar hoy mismo.
                        </p>
                    </div>
                );
            case 'branding':
                return (
                    <div className="space-y-4 sm:space-y-6 max-w-md mx-auto">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Identidad de tu Institución</h3>
                            <p className="text-sm text-gray-500">Esto aparecerá en el encabezado y reportes.</p>
                        </div>

                        <Input label="Nombre de la Universidad" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ej. Universidad Central" />
                        <Input label="Eslogan o Subtítulo" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ej. Admisiones 2024" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logotipo</label>
                            <div className="flex items-center gap-4">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-16 h-16 object-cover rounded-full border border-gray-200 dark:border-slate-600 bg-white" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-transparent dark:border-slate-600">
                                        <span className="text-xs font-medium">Sin Logo</span>
                                    </div>
                                )}
                                <label className="cursor-pointer bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 transition-colors">
                                    Subir Imagen
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                                    }} />
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'general':
                return (
                    <div className="space-y-6 max-w-md mx-auto">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Ajustes del Sistema</h3>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zona Horaria</label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                            >
                                <option value="America/Mexico_City" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Ciudad de México, Centro (GMT-6)</option>
                                <option value="America/Cancun" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Cancún, Quintana Roo (GMT-5)</option>
                                <option value="America/Tijuana" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Tijuana, Baja California (GMT-7)</option>
                                <option value="America/Chihuahua" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Chihuahua, Pacífico (GMT-6)</option>
                                <option value="America/Hermosillo" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Hermosillo, Sonora (GMT-7)</option>
                                <option value="America/Mazatlan" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Mazatlán, Sinaloa (GMT-6)</option>
                                <option value="America/Bogota" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Bogotá (GMT-5)</option>
                                <option value="America/Santiago" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Santiago (GMT-3)</option>
                                <option value="Europe/Madrid" className="text-gray-900 dark:text-white bg-white dark:bg-slate-800">Madrid (GMT+1)</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white">Recordatorios de Pendientes</p>
                                <p className="text-xs text-gray-500">Notificar a asesores al iniciar sesión.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 dark:peer-focus:ring-brand-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                );
            case 'data':
                return (
                    <div className="text-center py-8">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Datos de Muestra</h3>
                        <p className="text-gray-600 mb-6">¿Quieres precargar el sistema con licenciaturas, orígenes y leads de ejemplo?</p>

                        {!dataLoaded ? (
                            <Button onClick={seedData} disabled={seeding || dataLoaded} className="w-full sm:w-auto mx-auto" leftIcon={seeding ? undefined : <RocketLaunchIcon className="w-4 h-4" />}>
                                {seeding ? 'Cargando Catálogos...' : 'Cargar Datos Iniciales'}
                            </Button>
                        ) : (
                            <div className="flex flex-col items-center text-green-600 animate-scale-in">
                                <CheckCircleIcon className="w-16 h-16 mb-2" />
                                <p className="font-bold text-lg">¡Datos cargados correctamente!</p>
                                <p className="text-sm text-gray-500 mt-2">Ya puedes finalizar el asistente.</p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-auto max-h-[90vh] sm:h-[600px]">
                {/* Header */}
                <div className="bg-brand-primary p-4 sm:p-6 text-white flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <RocketLaunchIcon className="w-6 h-6" />
                        Configuración Inicial
                    </h1>
                    <div className="flex items-center gap-2">
                        {steps.map((step, idx) => (
                            <div key={step.id} className={`w-3 h-3 rounded-full transition-colors ${idx === currentStep ? 'bg-white scale-125' : idx < currentStep ? 'bg-brand-secondary' : 'bg-white/30'}`} />
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex flex-col items-center justify-center relative">
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={currentStep === 0 || loading}
                        className={`w-full sm:w-auto ${currentStep === 0 ? 'invisible' : ''}`}
                    >
                        Atrás
                    </Button>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">


                        <Button onClick={handleNext} disabled={loading} className="w-full sm:w-auto px-8 shadow-xl shadow-brand-secondary/20">
                            {currentStep === steps.length - 1 ? (loading ? 'Guardando...' : 'Finalizar y Entrar') : 'Siguiente'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupWizard;
