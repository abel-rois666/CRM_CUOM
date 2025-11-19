
import React, { useState, useEffect, useMemo } from 'react';
import { Profile, Status, Source, Licenciatura, WhatsAppTemplate } from '../types';
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


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  whatsappTemplates: WhatsAppTemplate[];
  currentUserProfile: Profile | null;
  onProfilesUpdate: (profiles: Profile[]) => void;
  onStatusesUpdate: (statuses: Status[]) => void;
  onSourcesUpdate: (sources: Source[]) => void;
  onLicenciaturasUpdate: (licenciaturas: Licenciatura[]) => void;
  onWhatsappTemplatesUpdate: (templates: WhatsAppTemplate[]) => void;
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
    const [role, setRole] = useState<'advisor' | 'admin'>('advisor');
    const [loading, setLoading] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

    const { success, error: toastError } = useToast();

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";
    const labelClasses = "block text-sm font-medium text-gray-700";

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession) {
            toastError('No se pudo obtener la sesión de administrador. Vuelve a iniciar sesión.');
            setLoading(false);
            return;
        }

        const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
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

        const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: newUser.id,
            full_name: fullName,
            user_email: newUser.email!,
            user_role: role
        });
        
        await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
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

    const handleUpdateUser = async (userId: string, updates: { fullName: string; role: 'admin' | 'advisor'; newPassword?: string }) => {
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
                        <option value="advisor">Asesor</option>
                        <option value="admin">Administrador</option>
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
                    <li key={profile.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <div>
                            <span className="font-medium">{profile.full_name}</span>
                            <span className="text-gray-500 ml-2 text-sm">({profile.email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${profile.role === 'admin' ? 'bg-indigo-200 text-indigo-800' : 'bg-green-200 text-green-800'}`}>
                                {profile.role}
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
    const [seeding, setSeeding] = useState(false);
    const [statusToDelete, setStatusToDelete] = useState<Status | null>(null);
    
    const { success, error: toastError } = useToast();

    const recommendedStatuses = [
        { name: 'Primer Contacto (Respuesta Pendiente)', color: 'bg-yellow-500' },
        { name: 'En Seguimiento', color: 'bg-sky-500' },
        { name: 'Cita en Negociación', color: 'bg-cyan-500' },
        { name: 'Con Cita', color: 'bg-blue-500' },
        { name: 'Siguiente ciclo', color: 'bg-violet-500' },
        { name: 'Sin Respuesta (No hay interacción por parte del prospecto)', color: 'bg-orange-500' },
        { name: 'Sin Interés', color: 'bg-red-500' },
        { name: 'Fase de Cierre/Solo Solicitud', color: 'bg-lime-500' },
        { name: 'Fase de Cierre/Solo Pago Parcial', color: 'bg-lime-500' },
        { name: 'Fase de Cierre/Solicitud y Documentos', color: 'bg-lime-500' },
        { name: 'Fase de Cierre/Solicitud y Pago Parcial', color: 'bg-emerald-500' },
        { name: 'Fase de Cierre/Solicitud, Pago Parcial y Documentos', color: 'bg-emerald-500' },
        { name: 'Inscrito (a)', color: 'bg-green-500' },
        { name: 'Número Equivocado/Inexistente', color: 'bg-stone-500' },
        { name: 'Contactar después', color: 'bg-purple-500' },
        { name: 'Sin Contactar', color: 'bg-gray-500' },
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
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            toastError(`Error: ${errorMessage}`);
        } else if (insertedData) {
            onStatusesUpdate([...statuses, ...insertedData]);
            success(`¡Se añadieron ${insertedData.length} nuevos estados!`);
        }
        
        setSeeding(false);
    };

    const handleAdd = async () => {
        if(name.trim()) {
            const { data, error } = await supabase.from('statuses').insert({ name: name.trim(), color }).select().single();
            if(error) { 
                console.error(error); 
                toastError("Error al crear estado");
                return; 
            }
            onStatusesUpdate([...statuses, data]);
            success("Estado creado");
            setName('');
        }
    }
    
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
                const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                toastError(`Error al eliminar estado: ${errorMessage}`);
            }
            console.error(error); 
        } else {
            onStatusesUpdate(statuses.filter(s => s.id !== statusToDelete.id));
            success("Estado eliminado");
            setStatusToDelete(null);
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Estados</h3>

            <div className="p-4 border rounded-lg bg-gray-50/70">
                <h4 className="font-semibold text-gray-700">Estados Predefinidos</h4>
                <p className="text-sm text-gray-600 mt-1 mb-3">Carga una lista de estados recomendados para empezar a organizar tus leads rápidamente.</p>
                <Button onClick={handleSeedStatuses} disabled={seeding} variant="secondary" leftIcon={<ArrowUpTrayIcon className="w-4 h-4"/>}>
                    {seeding ? 'Cargando...' : 'Cargar Estados Recomendados'}
                </Button>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Añadir Nuevo Estado</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del Estado" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    <select value={color} onChange={e => setColor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {colors.map(c => <option key={c} value={c}>{c.replace('bg-', '').replace('-500', '')}</option>)}
                    </select>
                    <Button onClick={handleAdd} size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>}>Añadir Estado</Button>
                </div>
                <hr className="my-4"/>
                <h4 className="font-semibold text-gray-700">Estados Actuales</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {statuses.map(status => (
                        <li key={status.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full ${status.color}`}></span>
                                <span>{status.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyAndDelete(status)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
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
                const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                toastError(`Error al eliminar origen: ${errorMessage}`);
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
                const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                toastError(`Error al eliminar licenciatura: ${errorMessage}`);
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
             const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
             toastError(`Error al eliminar la plantilla: ${errorMessage}`);
        } else {
            onTemplatesUpdate(templates.filter(t => t.id !== templateToDelete.id));
            success("Plantilla eliminada");
            setTemplateToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Plantillas de WhatsApp</h3>
            <div className="p-4 border rounded-lg bg-green-50/50 border-green-200">
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
                                {userProfile?.role === 'admin' && (
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

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<string>('');

  const allTabs = useMemo(() => [
    { id: 'users', label: 'Usuarios', icon: <UserIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'statuses', label: 'Estados', icon: <TagIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'sources', label: 'Orígenes', icon: <ArrowDownTrayIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'licenciaturas', label: 'Licenciaturas', icon: <AcademicCapIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
    { id: 'whatsapp', label: 'Plantillas WhatsApp', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, allowedRoles: ['admin', 'advisor'] },
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
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
