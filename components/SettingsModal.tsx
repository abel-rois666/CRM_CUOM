// components/SettingsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js'; // IMPORTANTE: Para el cliente temporal
import { Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate, StatusCategory } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import UserIcon from './icons/UserIcon';
import TagIcon from './icons/TagIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import { supabase } from '../lib/supabase';
import EditIcon from './icons/EditIcon';
import ConfirmationModal from './common/ConfirmationModal';
import UserEditModal from './UserEditModal';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import { useToast } from '../context/ToastContext';
import EnvelopeIcon from './icons/EnvelopeIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  whatsappTemplates: WhatsAppTemplate[];
  emailTemplates: EmailTemplate[];
  currentUserProfile: Profile | null;
  onProfilesUpdate: (profiles: Profile[]) => void;
  onStatusesUpdate: (statuses: Status[]) => void;
  onSourcesUpdate: (sources: Source[]) => void;
  onLicenciaturasUpdate: (licenciaturas: Licenciatura[]) => void;
  onWhatsappTemplatesUpdate: (templates: WhatsAppTemplate[]) => void;
  onEmailTemplatesUpdate: (templates: EmailTemplate[]) => void;
}

const colors = [
  'bg-slate-500', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

interface UserSettingsProps {
  profiles: Profile[];
  onProfilesUpdate: (profiles: Profile[]) => void;
  currentUserProfile: Profile | null;
}

const UserSettings: React.FC<UserSettingsProps> = ({ profiles, onProfilesUpdate, currentUserProfile }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'advisor' | 'admin' | 'moderator'>('advisor');
    const [loading, setLoading] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

    const { success, error: toastError } = useToast();

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";
    const labelClasses = "block text-sm font-medium text-gray-700";

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // --- SOLUCIÓN PANTALLA BLANCA ---
        // Usamos un cliente temporal desconectado de la sesión global
        // para crear el usuario sin cerrar la sesión del admin.
        const tempSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false, 
                    detectSessionInUrl: false
                }
            }
        );

        // 1. Crear usuario en Auth (usando cliente temporal)
        const { data: { user: newUser }, error: signUpError } = await tempSupabase.auth.signUp({
            email,
            password,
        });
        
        if (signUpError) {
            toastError(signUpError.message);
            setLoading(false);
            return;
        }

        if (!newUser) {
            toastError('No se pudo crear el usuario. El email podría ya estar en uso.');
            setLoading(false);
            return;
        }

        // 2. Crear perfil en base de datos (usando cliente principal con permisos de Admin)
        const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: newUser.id,
            full_name: fullName,
            user_email: newUser.email!,
            user_role: role
        });
        
        if (profileError) {
            toastError(`Usuario Auth creado, pero error en perfil: ${profileError.message}`);
            setLoading(false);
            return;
        }
        
        success(`Usuario ${email} creado con éxito`);
        
        const newProfile: Profile = {
            id: newUser.id,
            full_name: fullName,
            email: newUser.email!,
            role: role
        };

        onProfilesUpdate([...profiles, newProfile]);
        
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('advisor');
        setLoading(false);
    };

    const handleUpdateUser = async (userId: string, updates: { fullName: string; role: 'admin' | 'advisor' | 'moderator'; newPassword?: string }) => {
        const { error } = await supabase.rpc('update_user_details', {
            user_id_to_update: userId,
            new_full_name: updates.fullName,
            new_role: updates.role,
            new_password: updates.newPassword
        });

        if (error) {
            console.error("Error updating user:", error);
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            toastError(`Error al actualizar: ${errorMessage}`);
        } else {
            onProfilesUpdate(profiles.map(p => p.id === userId ? { ...p, full_name: updates.fullName, role: updates.role } : p));
            success(`Usuario actualizado correctamente`);
            setUserToEdit(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        const { error } = await supabase.rpc('delete_user_by_id', {
            user_id_to_delete: userToDelete.id
        });

        if (error) {
            console.error("Error deleting user:", error);
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            toastError(`Error al eliminar: ${errorMessage}`);
        } else {
            onProfilesUpdate(profiles.filter(p => p.id !== userToDelete.id));
            success(`Usuario eliminado correctamente`);
            setUserToDelete(null);
        }
    };

    const getRoleLabel = (r: string) => {
        switch(r) {
            case 'admin': return 'Administrador';
            case 'moderator': return 'Coordinador';
            default: return 'Asesor';
        }
    };

    const getRoleColor = (r: string) => {
        switch(r) {
            case 'admin': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'moderator': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Usuarios</h3>
            
             <form onSubmit={handleCreateUser} className="p-4 border rounded-lg bg-gray-50/70 space-y-4">
                <h4 className="font-semibold text-gray-700">Crear Nuevo Usuario</h4>
                <div>
                    <label htmlFor="fullName" className={labelClasses}>Nombre Completo</label>
                    <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClasses} />
                </div>
                <div>
                    <label htmlFor="email" className={labelClasses}>Correo Electrónico</label>
                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses} />
                </div>
                <div>
                    <label htmlFor="password" className={labelClasses}>Contraseña Inicial</label>
                    <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputClasses} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                    <label htmlFor="role" className={labelClasses}>Rol</label>
                    <select id="role" value={role} onChange={e => setRole(e.target.value as any)} className={inputClasses}>
                        <option value="advisor">Asesor (Acceso limitado)</option>
                        <option value="moderator">Coordinador (Supervisión)</option>
                        <option value="admin">Administrador (Total)</option>
                    </select>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !fullName || !email || password.length < 6}>
                        {loading ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>

            <hr className="my-4"/>

            <h4 className="font-semibold text-gray-700">Usuarios Actuales</h4>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {profiles.map(profile => (
                    <li key={profile.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                            <span className="font-bold text-gray-800 block">{profile.full_name}</span>
                            <span className="text-gray-500 text-xs">{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRoleColor(profile.role)}`}>
                                {getRoleLabel(profile.role)}
                            </span>
                             <Button variant="ghost" size="sm" onClick={() => setUserToEdit(profile)} aria-label={`Editar ${profile.full_name}`}>
                                <EditIcon className="w-4 h-4 text-gray-600 hover:text-brand-secondary"/>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setUserToDelete(profile)} disabled={profile.id === currentUserProfile?.id} aria-label={`Eliminar ${profile.full_name}`}>
                                <TrashIcon className="w-4 h-4 text-gray-600 hover:text-red-500 disabled:text-gray-300 disabled:hover:text-gray-300"/>
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            {userToEdit && (
                <UserEditModal
                    isOpen={!!userToEdit}
                    onClose={() => setUserToEdit(null)}
                    user={userToEdit}
                    // @ts-ignore
                    onSave={handleUpdateUser} 
                />
            )}
            {userToDelete && (
                <ConfirmationModal
                    isOpen={!!userToDelete}
                    onClose={() => setUserToDelete(null)}
                    onConfirm={handleDeleteUser}
                    title="Confirmar Eliminación"
                    message={<>¿Estás seguro de que quieres eliminar a <strong>{userToDelete.full_name}</strong>? Esta acción es irreversible.</>}
                    confirmButtonText="Sí, Eliminar"
                    confirmButtonVariant="danger"
                />
            )}
        </div>
    );
}

const StatusSettings: React.FC<{ statuses: Status[], onStatusesUpdate: (statuses: Status[]) => void }> = ({ statuses, onStatusesUpdate }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(colors[0]);
    const [category, setCategory] = useState<StatusCategory>('active');
    const [seeding, setSeeding] = useState(false);
    const [statusToDelete, setStatusToDelete] = useState<Status | null>(null);
    const [statusToEdit, setStatusToEdit] = useState<Status | null>(null);
    
    const { success, error: toastError } = useToast();

    const recommendedStatuses: {name: string, color: string, category: StatusCategory}[] = [
        { name: 'Primer Contacto (Respuesta Pendiente)', color: 'bg-yellow-500', category: 'active' },
        { name: 'En Seguimiento', color: 'bg-sky-500', category: 'active' },
        { name: 'Cita en Negociación', color: 'bg-cyan-500', category: 'active' },
        { name: 'Con Cita', color: 'bg-blue-500', category: 'active' },
        { name: 'Siguiente ciclo', color: 'bg-violet-500', category: 'active' },
        { name: 'Sin Respuesta (No hay interacción)', color: 'bg-orange-500', category: 'active' },
        { name: 'Sin Interés', color: 'bg-red-500', category: 'lost' },
        { name: 'Fase de Cierre/Solo Solicitud', color: 'bg-lime-500', category: 'active' },
        { name: 'Fase de Cierre/Solo Pago Parcial', color: 'bg-lime-500', category: 'active' },
        { name: 'Fase de Cierre/Solicitud y Documentos', color: 'bg-lime-500', category: 'active' },
        { name: 'Fase de Cierre/Solicitud y Pago Parcial', color: 'bg-emerald-500', category: 'active' },
        { name: 'Fase de Cierre/Solicitud, Pago Parcial y Documentos', color: 'bg-emerald-500', category: 'active' },
        { name: 'Inscrito (a)', color: 'bg-green-500', category: 'won' },
        { name: 'Número Equivocado/Inexistente', color: 'bg-stone-500', category: 'lost' },
        { name: 'Contactar después', color: 'bg-purple-500', category: 'active' },
        { name: 'Sin Contactar', color: 'bg-gray-500', category: 'active' },
    ];

    const handleSeedStatuses = async () => {
        setSeeding(true);
        
        const existingStatusNames = new Set(statuses.map(s => s.name.toLowerCase()));
        
        const newStatusesToInsert = recommendedStatuses.filter(
            rec => !existingStatusNames.has(rec.name.toLowerCase())
        );
    
        if (newStatusesToInsert.length === 0) {
            success('Todos los estados recomendados ya existen.');
            setSeeding(false);
            return;
        }
        
        const { data: insertedData, error } = await supabase
            .from('statuses')
            .insert(newStatusesToInsert)
            .select();
    
        if (error) {
            console.error('Error seeding statuses:', error);
            toastError(`Error: ${error.message}`);
        } else if (insertedData) {
            onStatusesUpdate([...statuses, ...insertedData]);
            success(`¡Se añadieron ${insertedData.length} nuevos estados!`);
        }
        
        setSeeding(false);
    };

    const handleSave = async () => {
        if(!name.trim()) return;

        if (statusToEdit) {
             const { data, error } = await supabase.from('statuses').update({ name: name.trim(), color, category }).eq('id', statusToEdit.id).select().single();
            if(error) { 
                console.error(error); 
                toastError("Error al actualizar estado");
                return; 
            }
            onStatusesUpdate(statuses.map(s => s.id === statusToEdit.id ? data : s));
            success("Estado actualizado");
            setStatusToEdit(null);
        } else {
            const { data, error } = await supabase.from('statuses').insert({ name: name.trim(), color, category }).select().single();
            if(error) { 
                console.error(error); 
                toastError("Error al crear estado");
                return; 
            }
            onStatusesUpdate([...statuses, data]);
            success("Estado creado");
        }
        setName('');
        setCategory('active');
    }
    
    const handleEditClick = (status: Status) => {
        setStatusToEdit(status);
        setName(status.name);
        setColor(status.color);
        setCategory(status.category || 'active'); 
    };
    
    const handleVerifyAndDelete = async (status: Status) => {
        const { count, error: checkError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('status_id', status.id);

        if (checkError) {
            console.error("Error al verificar el uso del estado:", checkError);
        }

        if (count && count > 0) {
            toastError(`No se puede eliminar. El estado "${status.name}" está asignado a ${count} lead(s).`);
            return;
        }

        setStatusToDelete(status);
    }

    const handleConfirmDelete = async () => {
        if (!statusToDelete) return;

        const { error } = await supabase.from('statuses').delete().eq('id', statusToDelete.id);
        if(error) { 
             if (error.code === '23503') {
                toastError(`No se puede eliminar "${statusToDelete.name}" porque está en uso.`);
            } else {
                toastError(`Error al eliminar estado: ${error.message}`);
            }
            console.error(error); 
        } else {
            onStatusesUpdate(statuses.filter(s => s.id !== statusToDelete.id));
            success("Estado eliminado");
            setStatusToDelete(null);
        }
    }

    const getCategoryLabel = (cat: StatusCategory) => {
        switch(cat) {
            case 'won': return 'Inscritos (Ganados)';
            case 'lost': return 'Bajas (Perdidos)';
            default: return 'En Proceso (Activos)';
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Estados</h3>

            {!statusToEdit && (
                <div className="p-4 border rounded-lg bg-gray-50/70 mb-4">
                    <h4 className="font-semibold text-gray-700">Estados Predefinidos</h4>
                    <p className="text-sm text-gray-600 mt-1 mb-3">Carga una lista de estados recomendados para empezar a organizar tus leads rápidamente.</p>
                    <Button onClick={handleSeedStatuses} disabled={seeding} variant="secondary" leftIcon={<ArrowUpTrayIcon className="w-4 h-4"/>}>
                        {seeding ? 'Cargando...' : 'Cargar Estados Recomendados'}
                    </Button>
                </div>
            )}

            <div className="space-y-4 border rounded-lg p-4 bg-white shadow-sm">
                <h4 className="font-semibold text-gray-700">{statusToEdit ? 'Editar Estado' : 'Añadir Nuevo Estado'}</h4>
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Interesado" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                            <select value={color} onChange={e => setColor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                {colors.map(c => <option key={c} value={c}>{c.replace('bg-', '').replace('-500', '')}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">Categoría (Vista)</label>
                             <select value={category} onChange={e => setCategory(e.target.value as StatusCategory)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="active">En Proceso (Activos)</option>
                                <option value="won">Inscritos (Ganados)</option>
                                <option value="lost">Bajas (Perdidos)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {statusToEdit && (
                            <Button variant="ghost" onClick={() => { setStatusToEdit(null); setName(''); setCategory('active'); }}>Cancelar</Button>
                        )}
                        <Button onClick={handleSave} leftIcon={!statusToEdit ? <PlusIcon className="w-4 h-4"/> : undefined}>
                            {statusToEdit ? 'Actualizar' : 'Añadir Estado'}
                        </Button>
                    </div>
                </div>
            </div>
                
            <h4 className="font-semibold text-gray-700 mt-6">Estados Actuales</h4>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {statuses.map(status => (
                    <li key={status.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full ${status.color}`}></span>
                            <div>
                                <span className="font-medium block">{status.name}</span>
                                <span className="text-xs text-gray-500">{getCategoryLabel(status.category || 'active')}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(status)}>
                                <EditIcon className="w-4 h-4 text-blue-500"/>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyAndDelete(status)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmationModal
                isOpen={!!statusToDelete}
                onClose={() => setStatusToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar Estado?"
                message={
                    <>
                        Estás a punto de eliminar el estado <strong>{statusToDelete?.name}</strong>.
                        <br /><br />
                        <span className="text-red-600 font-semibold">Esta acción es irreversible.</span>
                        <br />
                        ¿Estás seguro de que deseas continuar?
                    </>
                }
                confirmButtonText="Sí, Eliminar"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

const SourceSettings: React.FC<{ sources: Source[], onSourcesUpdate: (sources: Source[]) => void }> = ({ sources, onSourcesUpdate }) => {
    const [name, setName] = useState('');
    const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
    const { success, error: toastError } = useToast();

    const handleAdd = async () => {
        if (name.trim()) {
            const { data, error } = await supabase.from('sources').insert({ name: name.trim() }).select().single();
            if(error) { 
                console.error(error); 
                toastError("Error al crear origen");
                return; 
            }
            onSourcesUpdate([...sources, data]);
            success("Origen creado");
            setName('');
        }
    };
    
    const handleVerifyAndDelete = async (source: Source) => {
         const { count, error: checkError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('source_id', source.id);

        if (checkError) console.error(checkError);

        if (count && count > 0) {
            toastError(`No se puede eliminar "${source.name}" porque está en uso.`);
            return;
        }

        setSourceToDelete(source);
    };

    const handleConfirmDelete = async () => {
        if (!sourceToDelete) return;

        const { error } = await supabase.from('sources').delete().eq('id', sourceToDelete.id);
        if(error) { 
            if (error.code === '23503') {
                toastError(`No se puede eliminar "${sourceToDelete.name}" porque está en uso.`);
            } else {
                toastError(`Error al eliminar origen: ${error.message}`);
            }
            console.error(error); 
        } else {
            onSourcesUpdate(sources.filter(s => s.id !== sourceToDelete.id));
            success("Origen eliminado");
            setSourceToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Orígenes</h3>
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Añadir Nuevo Origen</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del Origen" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    <Button onClick={handleAdd} size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>}>Añadir Origen</Button>
                </div>
                <hr className="my-4"/>
                <h4 className="font-semibold text-gray-700">Orígenes Actuales</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {sources.map(source => (
                        <li key={source.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span>{source.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyAndDelete(source)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </li>
                    ))}
                </ul>

                <ConfirmationModal
                    isOpen={!!sourceToDelete}
                    onClose={() => setSourceToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="¿Eliminar Origen?"
                    message={
                        <>
                            Vas a eliminar el origen <strong>{sourceToDelete?.name}</strong>.
                            <br /><br />
                            <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
                        </>
                    }
                    confirmButtonText="Eliminar Definitivamente"
                    confirmButtonVariant="danger"
                />
            </div>
        </div>
    );
}

const LicenciaturaSettings: React.FC<{ licenciaturas: Licenciatura[], onLicenciaturasUpdate: (licenciaturas: Licenciatura[]) => void }> = ({ licenciaturas, onLicenciaturasUpdate }) => {
    const [name, setName] = useState('');
    const [licenciaturaToDelete, setLicenciaturaToDelete] = useState<Licenciatura | null>(null);
    const { success, error: toastError } = useToast();

    const handleAdd = async () => {
        if (name.trim()) {
            const { data, error } = await supabase.from('licenciaturas').insert({ name: name.trim() }).select().single();
            if (error) { 
                console.error(error); 
                toastError("Error al crear licenciatura");
                return; 
            }
            onLicenciaturasUpdate([...licenciaturas, data]);
            success("Licenciatura creada");
            setName('');
        }
    };
    
    const handleVerifyAndDelete = async (lic: Licenciatura) => {
        const { count, error: checkError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', lic.id);

        if (checkError) console.error(checkError);

        if (count && count > 0) {
            toastError(`No se puede eliminar "${lic.name}" porque hay leads interesados en ella.`);
            return;
        }

        setLicenciaturaToDelete(lic);
    };

    const handleConfirmDelete = async () => {
        if (!licenciaturaToDelete) return;

        const { error } = await supabase.from('licenciaturas').delete().eq('id', licenciaturaToDelete.id);
        if(error) { 
            if (error.code === '23503') {
                toastError(`No se puede eliminar "${licenciaturaToDelete.name}" porque está en uso.`);
            } else {
                toastError(`Error al eliminar licenciatura: ${error.message}`);
            }
            console.error(error); 
        } else {
            onLicenciaturasUpdate(licenciaturas.filter(s => s.id !== licenciaturaToDelete.id));
            success("Licenciatura eliminada");
            setLicenciaturaToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Licenciaturas</h3>
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Añadir Nueva Licenciatura</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la Licenciatura" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    <Button onClick={handleAdd} size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>}>Añadir Licenciatura</Button>
                </div>
                <hr className="my-4"/>
                <h4 className="font-semibold text-gray-700">Licenciaturas Actuales</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {licenciaturas.map(lic => (
                        <li key={lic.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span>{lic.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyAndDelete(lic)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </li>
                    ))}
                </ul>

                <ConfirmationModal
                    isOpen={!!licenciaturaToDelete}
                    onClose={() => setLicenciaturaToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="¿Eliminar Licenciatura?"
                    message={
                        <>
                            Se eliminará la licenciatura <strong>{licenciaturaToDelete?.name}</strong> del catálogo.
                            <br /><br />
                            <span className="text-red-600 font-bold">Esta acción es permanente.</span>
                        </>
                    }
                    confirmButtonText="Eliminar"
                    confirmButtonVariant="danger"
                />
            </div>
        </div>
    );
}

const WhatsappTemplateSettings: React.FC<{ 
    templates: WhatsAppTemplate[], 
    onTemplatesUpdate: (t: WhatsAppTemplate[]) => void,
    userProfile: Profile | null 
}> = ({ templates, onTemplatesUpdate, userProfile }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);
    const { success, error: toastError } = useToast();

    const handleSeedTemplates = async () => {
        setSaving(true);
        const newTemplates = [
            { name: 'Saludo Inicial', content: 'Hola, gracias por tu interés en nuestra oferta académica. ¿Te gustaría agendar una visita al campus?' },
            { name: 'Confirmación Cita', content: 'Hola, te confirmamos tu cita para el día asignado. ¡Te esperamos!' },
            { name: 'Seguimiento', content: 'Hola, ¿tuviste oportunidad de revisar el plan de estudios que te enviamos?' }
        ];

        const currentNames = new Set(templates.map(t => t.name));
        const toInsert = newTemplates.filter(t => !currentNames.has(t.name));

        if (toInsert.length === 0) {
             success("Ya tienes las plantillas recomendadas.");
             setSaving(false);
             return;
        }

        if (templates.length + toInsert.length > 5) {
            toastError("No hay espacio suficiente para las plantillas recomendadas (máx 5).");
            setSaving(false);
            return;
        }

        const { data, error } = await supabase.from('whatsapp_templates').insert(toInsert).select();
        if (error) {
            toastError("Error al crear plantillas: " + error.message);
        } else if (data) {
            onTemplatesUpdate([...templates, ...data]);
            success(`${data.length} plantillas añadidas.`);
        }
        setSaving(false);
    }

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) return;
        setSaving(true);

        if (editingId) {
            const { data, error } = await supabase
                .from('whatsapp_templates')
                .update({ name: name.trim(), content: content.trim() })
                .eq('id', editingId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating template:', error);
                toastError('Error al actualizar la plantilla.');
            } else if (data) {
                const updatedTemplates = templates.map(t => t.id === editingId ? data : t);
                onTemplatesUpdate(updatedTemplates);
                success("Plantilla actualizada");
                setEditingId(null);
                setName('');
                setContent('');
            }
        } else {
            if (templates.length >= 5) {
                toastError("Solo puedes tener un máximo de 5 plantillas.");
                setSaving(false);
                return;
            }
            
            const { data, error } = await supabase
                .from('whatsapp_templates')
                .insert({ name: name.trim(), content: content.trim() })
                .select()
                .single();
            
             if (error) {
                console.error('Error creating template:', error);
                toastError('Error al crear la plantilla.');
            } else if (data) {
                onTemplatesUpdate([...templates, data]);
                success("Plantilla creada");
                setName('');
                setContent('');
            }
        }
        setSaving(false);
    };

    const handleEdit = (template: WhatsAppTemplate) => {
        setName(template.name);
        setContent(template.content);
        setEditingId(template.id);
    };

    const handleCancelEdit = () => {
        setName('');
        setContent('');
        setEditingId(null);
    };

    const handleDeleteClick = (template: WhatsAppTemplate) => {
        setTemplateToDelete(template);
    };

    const handleConfirmDelete = async () => {
        if (!templateToDelete) return;
        
        const { error } = await supabase.from('whatsapp_templates').delete().eq('id', templateToDelete.id);
        if (error) {
             console.error('Error deleting template:', error);
             toastError('Error al eliminar la plantilla.');
        } else {
            onTemplatesUpdate(templates.filter(t => t.id !== templateToDelete.id));
            success("Plantilla eliminada");
            setTemplateToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Plantillas de WhatsApp</h3>
            
            {!editingId && templates.length === 0 && (
                <div className="p-4 border rounded-lg bg-green-50/50 border-green-200 mb-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-green-800 font-medium">¿Empezando?</p>
                        <p className="text-xs text-green-600">Carga plantillas predefinidas para comenzar rápido.</p>
                    </div>
                    <Button onClick={handleSeedTemplates} disabled={saving} size="sm" variant="secondary" leftIcon={<ArrowUpTrayIcon className="w-4 h-4"/>}>
                        Cargar Recomendadas
                    </Button>
                </div>
            )}

            <div className="p-4 border rounded-lg bg-gray-50/70 border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">{editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h4>
                <div className="space-y-3">
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la Plantilla</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ej: Saludo Inicial" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Contenido del Mensaje</label>
                        <textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            placeholder="Hola, te contacto para..." 
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        {editingId && <Button onClick={handleCancelEdit} variant="ghost" size="sm" disabled={saving}>Cancelar</Button>}
                        <Button onClick={handleSave} size="sm" disabled={!name || !content || saving}>
                            {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                        </Button>
                    </div>
                </div>
            </div>

            <hr className="my-4"/>
            
            <h4 className="font-semibold text-gray-700">Plantillas Guardadas ({templates.length}/5)</h4>
            <div className="space-y-3">
                {templates.map(t => (
                    <div key={t.id} className="border border-gray-200 rounded-md p-3 bg-white shadow-sm relative group">
                        <div className="flex justify-between items-start mb-1">
                            <h5 className="font-bold text-gray-800 text-sm">{t.name}</h5>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800 p-1">
                                    <EditIcon className="w-4 h-4"/>
                                </button>
                                {(userProfile?.role === 'admin' || userProfile?.role === 'moderator' || userProfile?.role === 'advisor') && (
                                    <button onClick={() => handleDeleteClick(t)} className="text-red-600 hover:text-red-800 p-1">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">{t.content}</p>
                    </div>
                ))}
                {templates.length === 0 && <p className="text-sm text-gray-500 italic">No hay plantillas configuradas.</p>}
            </div>

            <ConfirmationModal
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Plantilla"
                message={`¿Estás seguro de que quieres eliminar la plantilla "${templateToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmButtonText="Sí, Eliminar"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

const EmailTemplateSettings: React.FC<{ 
    templates: EmailTemplate[], 
    onTemplatesUpdate: (t: EmailTemplate[]) => void,
    userProfile: Profile | null 
}> = ({ templates, onTemplatesUpdate, userProfile }) => {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
    const { success, error: toastError } = useToast();

    const handleSeedTemplates = async () => {
        setSaving(true);
        const newTemplates = [
            { 
                name: 'Bienvenida', 
                subject: 'Bienvenido/a a la Universidad', 
                body: '<p>Hola,</p><p>Gracias por contactarnos. Adjunto encontrarás la información de la licenciatura de tu interés.</p><p>Estamos a tus órdenes para cualquier duda.</p><p>Saludos cordiales,</p>' 
            },
            { 
                name: 'Recordatorio Cita', 
                subject: 'Recordatorio de tu cita en Campus', 
                body: '<p>Hola,</p><p>Te recordamos que tienes una cita programada con nosotros para conocer el campus y resolver tus dudas.</p><p>¡Te esperamos!</p>' 
            },
            {
                name: 'Seguimiento',
                subject: 'Seguimiento a tu solicitud de informes',
                body: '<p>Hola,</p><p>Esperamos que te encuentres muy bien.</p><p>Queríamos saber si tuviste oportunidad de revisar la información que te enviamos anteriormente y si tienes alguna pregunta adicional.</p>'
            }
        ];
        
        const currentNames = new Set(templates.map(t => t.name));
        const toInsert = newTemplates.filter(t => !currentNames.has(t.name));

        if (toInsert.length === 0) {
             success("Ya tienes las plantillas recomendadas.");
             setSaving(false);
             return;
        }

        const { data, error } = await supabase.from('email_templates').insert(toInsert).select();
        if (error) {
            toastError("Error al crear plantillas: " + error.message);
        } else if (data) {
            onTemplatesUpdate([...templates, ...data]);
            success(`${data.length} plantillas añadidas.`);
        }
        setSaving(false);
    }

    const handleSave = async () => {
        if (!name.trim() || !subject.trim() || !body.trim()) return;
        setSaving(true);

        if (editingId) {
            const { data, error } = await supabase
                .from('email_templates')
                .update({ name: name.trim(), subject: subject.trim(), body: body.trim() })
                .eq('id', editingId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating template:', error);
                toastError('Error al actualizar la plantilla.');
            } else if (data) {
                const updatedTemplates = templates.map(t => t.id === editingId ? data : t);
                onTemplatesUpdate(updatedTemplates);
                success("Plantilla actualizada");
                setEditingId(null);
                setName('');
                setSubject('');
                setBody('');
            }
        } else {
            const { data, error } = await supabase
                .from('email_templates')
                .insert({ name: name.trim(), subject: subject.trim(), body: body.trim() })
                .select()
                .single();
            
             if (error) {
                console.error('Error creating template:', error);
                toastError('Error al crear la plantilla.');
            } else if (data) {
                onTemplatesUpdate([...templates, data]);
                success("Plantilla creada");
                setName('');
                setSubject('');
                setBody('');
            }
        }
        setSaving(false);
    };

    const handleEdit = (template: EmailTemplate) => {
        setName(template.name);
        setSubject(template.subject);
        setBody(template.body);
        setEditingId(template.id);
    };

    const handleCancelEdit = () => {
        setName('');
        setSubject('');
        setBody('');
        setEditingId(null);
    };

    const handleDeleteClick = (template: EmailTemplate) => {
        setTemplateToDelete(template);
    };

    const handleConfirmDelete = async () => {
        if (!templateToDelete) return;
        
        const { error } = await supabase.from('email_templates').delete().eq('id', templateToDelete.id);
        if (error) {
             console.error('Error deleting template:', error);
             toastError('Error al eliminar la plantilla.');
        } else {
            onTemplatesUpdate(templates.filter(t => t.id !== templateToDelete.id));
            success("Plantilla eliminada");
            setTemplateToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Plantillas de Correo</h3>

            {!editingId && templates.length === 0 && (
                <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200 mb-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-blue-800 font-medium">¿Primera vez aquí?</p>
                        <p className="text-xs text-blue-600">Carga plantillas básicas de bienvenida y seguimiento.</p>
                    </div>
                    <Button onClick={handleSeedTemplates} disabled={saving} size="sm" variant="secondary" leftIcon={<ArrowUpTrayIcon className="w-4 h-4"/>}>
                        Cargar Recomendadas
                    </Button>
                </div>
            )}

            <div className="p-4 border rounded-lg bg-gray-50/70 border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">{editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h4>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la Plantilla</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ej: Bienvenida" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Asunto del Correo</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)} 
                            placeholder="Bienvenido a la universidad..." 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cuerpo del Correo (HTML Soportado)</label>
                        <textarea 
                            value={body} 
                            onChange={e => setBody(e.target.value)} 
                            placeholder="<p>Hola...</p>" 
                            rows={5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono text-xs" 
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        {editingId && <Button onClick={handleCancelEdit} variant="ghost" size="sm" disabled={saving}>Cancelar</Button>}
                        <Button onClick={handleSave} size="sm" disabled={!name || !subject || !body || saving}>
                            {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                        </Button>
                    </div>
                </div>
            </div>

            <hr className="my-4"/>
            
            <h4 className="font-semibold text-gray-700">Plantillas Guardadas</h4>
            <div className="space-y-3">
                {templates.map(t => (
                    <div key={t.id} className="border border-gray-200 rounded-md p-3 bg-white shadow-sm relative group">
                        <div className="flex justify-between items-start mb-1">
                            <h5 className="font-bold text-gray-800 text-sm">{t.name}</h5>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800 p-1">
                                    <EditIcon className="w-4 h-4"/>
                                </button>
                                {(userProfile?.role === 'admin' || userProfile?.role === 'moderator' || userProfile?.role === 'advisor') && (
                                    <button onClick={() => handleDeleteClick(t)} className="text-red-600 hover:text-red-800 p-1">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Asunto: {t.subject}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">{t.body.replace(/<[^>]*>/g, '')}</p>
                    </div>
                ))}
                {templates.length === 0 && <p className="text-sm text-gray-500 italic">No hay plantillas de correo configuradas.</p>}
            </div>

            <ConfirmationModal
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Plantilla"
                message={`¿Estás seguro de que quieres eliminar la plantilla "${templateToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmButtonText="Sí, Eliminar"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

const LoginHistorySettings: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [configError, setConfigError] = useState<string | null>(null);
    const { error: toastError } = useToast();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('login_history')
                .select('*, profiles:user_id(full_name, email)')
                .order('login_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching login history:", error);
                setConfigError(error.message || String(error));
            } else {
                setHistory(data || []);
            }
            setLoading(false);
        };
        fetchHistory();
    }, []);

    if (configError) {
         const fixSql = `DO $$ BEGIN CREATE TABLE IF NOT EXISTS public.login_history ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL, login_at TIMESTAMP WITH TIME ZONE DEFAULT now(), user_agent TEXT ); ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY; IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_history_user_id_fkey') THEN ALTER TABLE public.login_history DROP CONSTRAINT login_history_user_id_fkey; END IF; ALTER TABLE public.login_history ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE; DROP POLICY IF EXISTS "Insertar propio historial" ON public.login_history; CREATE POLICY "Insertar propio historial" ON public.login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); DROP POLICY IF EXISTS "Admins ven historial" ON public.login_history; CREATE POLICY "Admins ven historial" ON public.login_history FOR SELECT TO authenticated USING ( EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') ); END $$; NOTIFY pgrst, 'reload';`;

        return (
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 space-y-3">
                 <div className="flex items-center gap-2 font-bold">
                    <ExclamationCircleIcon className="w-5 h-5" />
                    <span>Error de Configuración</span>
                 </div>
                 <p className="text-sm">Detalle: {configError}</p>
                 <div className="bg-gray-800 text-gray-200 p-3 rounded text-xs font-mono overflow-x-auto">
                    <pre>{fixSql}</pre>
                 </div>
                 <Button size="sm" variant="secondary" onClick={() => window.location.reload()} leftIcon={<ArrowPathIcon className="w-4 h-4"/>}>Recargar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Historial de Accesos</h3>
            
            {/* FIX CRÍTICO: 'overflow-x-auto' habilita el scroll horizontal en móviles */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* 'whitespace-nowrap' fuerza a que la tabla se anche en lugar de aplastarse */}
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Usuario</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Fecha y Hora</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Dispositivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                             <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">Cargando...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No hay registros.</td></tr>
                        ) : (
                            history.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                        <div className="font-medium text-gray-900">{record.profiles?.full_name || 'Desconocido'}</div>
                                        <div className="text-gray-500 text-xs">{record.profiles?.email}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                                        {new Date(record.login_at).toLocaleString()}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={record.user_agent}>
                                        {record.user_agent}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<string>('');

  const allTabs = useMemo(() => [
    { id: 'users', label: 'Usuarios', icon: <UserIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'statuses', label: 'Estados', icon: <TagIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'sources', label: 'Orígenes', icon: <ArrowDownTrayIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'licenciaturas', label: 'Licenciaturas', icon: <AcademicCapIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    
    // Plantillas visibles para todos los roles con permisos de gestión
    { id: 'whatsapp', label: 'Plantillas WhatsApp', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, allowedRoles: ['admin', 'advisor', 'moderator'] },
    { id: 'email', label: 'Plantillas Email', icon: <EnvelopeIcon className="w-5 h-5" />, allowedRoles: ['admin', 'advisor', 'moderator'] },
    
    { id: 'audit', label: 'Historial de Accesos', icon: <ArrowUpTrayIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
  ], []);

  const visibleTabs = useMemo(() => {
      return allTabs.filter(tab => props.currentUserProfile && tab.allowedRoles.includes(props.currentUserProfile.role));
  }, [allTabs, props.currentUserProfile]);

  useEffect(() => {
      if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
          setActiveTab(visibleTabs[0].id);
      }
  }, [visibleTabs, activeTab]);


  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Configuración" size="2xl">
      <div className="flex flex-col sm:flex-row -mx-6 -my-6 min-h-[60vh]">
        {/* Left Navigation */}
        <div className="w-full sm:w-1/3 md:w-1/4 bg-gray-50/70 p-4 border-b sm:border-b-0 sm:border-r border-gray-200">
          <nav className="flex flex-row flex-wrap sm:flex-col gap-1">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-auto sm:w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  activeTab === tab.id
                    ? 'bg-brand-secondary/10 text-brand-secondary'
                    : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="w-full sm:w-2/3 md:w-3/4 p-6 overflow-y-auto">
          {activeTab === 'users' && <UserSettings profiles={props.profiles} onProfilesUpdate={props.onProfilesUpdate} currentUserProfile={props.currentUserProfile} />}
          {activeTab === 'statuses' && <StatusSettings statuses={props.statuses} onStatusesUpdate={props.onStatusesUpdate} />}
          {activeTab === 'sources' && <SourceSettings sources={props.sources} onSourcesUpdate={props.onSourcesUpdate} />}
          {activeTab === 'licenciaturas' && <LicenciaturaSettings licenciaturas={props.licenciaturas} onLicenciaturasUpdate={props.onLicenciaturasUpdate} />}
          {activeTab === 'whatsapp' && <WhatsappTemplateSettings templates={props.whatsappTemplates} onTemplatesUpdate={props.onWhatsappTemplatesUpdate} userProfile={props.currentUserProfile} />}
          {activeTab === 'email' && <EmailTemplateSettings templates={props.emailTemplates} onTemplatesUpdate={props.onEmailTemplatesUpdate} userProfile={props.currentUserProfile} />}
          {activeTab === 'audit' && <LoginHistorySettings />}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;