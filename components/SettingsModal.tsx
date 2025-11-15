import React, { useState } from 'react';
import { Profile, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import UserIcon from './icons/UserIcon';
import TagIcon from './icons/TagIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';
import { supabase } from '../lib/supabase';
import EditIcon from './icons/EditIcon';
import ConfirmationModal from './common/ConfirmationModal';
import UserEditModal from './UserEditModal';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  currentUserProfile: Profile | null;
  onProfilesUpdate: (profiles: Profile[]) => void;
  onStatusesUpdate: (statuses: Status[]) => void;
  onSourcesUpdate: (sources: Source[]) => void;
  onLicenciaturasUpdate: (licenciaturas: Licenciatura[]) => void;
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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [userToEdit, setUserToEdit] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";
    const labelClasses = "block text-sm font-medium text-gray-700";

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession) {
            setError('No se pudo obtener la sesión de administrador. Vuelve a iniciar sesión.');
            setLoading(false);
            return;
        }

        const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // NOTA: Para desactivar la verificación por correo, debes desactivar
                // la opción "Confirm email" en la configuración de Autenticación de tu
                // proyecto de Supabase.
            }
        });
        
        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        if (!newUser) {
            setError('No se pudo crear el usuario. El email podría ya estar en uso.');
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
            setError(`Usuario de auth creado, pero error al crear perfil: ${profileError.message}. Se requiere corrección manual.`);
            setLoading(false);
            return;
        }
        
        setSuccess(`¡Usuario ${email} creado con éxito!`);
        
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
        setActionError(null);
        const { error } = await supabase.rpc('update_user_details', {
            user_id_to_update: userId,
            new_full_name: updates.fullName,
            new_role: updates.role,
            new_password: updates.newPassword
        });

        if (error) {
            console.error("Error updating user:", error);
            setActionError(`Error al actualizar: ${error.message}`);
        } else {
            onProfilesUpdate(profiles.map(p => p.id === userId ? { ...p, full_name: updates.fullName, role: updates.role } : p));
            setUserToEdit(null); // Close modal on success
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setActionError(null);

        const { error } = await supabase.rpc('delete_user_by_id', {
            user_id_to_delete: userToDelete.id
        });

        if (error) {
            console.error("Error deleting user:", error);
            setActionError(`Error al eliminar: ${error.message}`);
        } else {
            onProfilesUpdate(profiles.filter(p => p.id !== userToDelete.id));
            setUserToDelete(null); // Close modal on success
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Usuarios</h3>
            
             <form onSubmit={handleCreateUser} className="p-4 border rounded-lg bg-gray-50/70 space-y-4">
                <h4 className="font-semibold text-gray-700">Crear Nuevo Usuario</h4>
                {error && <div className="p-3 my-2 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm" role="alert">{error}</div>}
                {success && <div className="p-3 my-2 bg-green-100 border-l-4 border-green-500 text-green-700 text-sm" role="alert">{success}</div>}
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
            {actionError && <div className="p-3 mb-2 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm" role="alert">{actionError}</div>}
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
    const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

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
        setSeedSuccess(null);
        
        const existingStatusNames = new Set(statuses.map(s => s.name.toLowerCase()));
        
        const newStatusesToInsert = recommendedStatuses.filter(
            rec => !existingStatusNames.has(rec.name.toLowerCase())
        );
    
        if (newStatusesToInsert.length === 0) {
            setSeedSuccess('Todos los estados recomendados ya existen.');
            setSeeding(false);
            setTimeout(() => setSeedSuccess(null), 5000);
            return;
        }
        
        const { data: insertedData, error } = await supabase
            .from('statuses')
            .insert(newStatusesToInsert)
            .select();
    
        if (error) {
            console.error('Error seeding statuses:', error);
            alert(`Error: ${error.message}`);
        } else if (insertedData) {
            onStatusesUpdate([...statuses, ...insertedData]);
            setSeedSuccess(`¡Se añadieron ${insertedData.length} nuevos estados!`);
            setTimeout(() => setSeedSuccess(null), 5000);
        }
        
        setSeeding(false);
    };

    const handleAdd = async () => {
        if(name.trim()) {
            const { data, error } = await supabase.from('statuses').insert({ name: name.trim(), color }).select().single();
            if(error) { console.error(error); return; }
            onStatusesUpdate([...statuses, data]);
            setName('');
        }
    }
    
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('statuses').delete().eq('id', id);
        if(error) { 
            alert('No se puede eliminar un estado si está siendo utilizado por algún lead.');
            console.error(error); 
        } else {
            onStatusesUpdate(statuses.filter(s => s.id !== id));
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Estados</h3>

            <div className="p-4 border rounded-lg bg-gray-50/70">
                <h4 className="font-semibold text-gray-700">Estados Predefinidos</h4>
                <p className="text-sm text-gray-600 mt-1 mb-3">Carga una lista de estados recomendados para empezar a organizar tus leads rápidamente.</p>
                {seedSuccess && <div className="p-3 my-2 bg-green-100 border-l-4 border-green-500 text-green-700 text-sm animate-fade-in" role="alert">{seedSuccess}</div>}
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
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(status.id)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const SourceSettings: React.FC<{ sources: Source[], onSourcesUpdate: (sources: Source[]) => void }> = ({ sources, onSourcesUpdate }) => {
    const [name, setName] = useState('');

    const handleAdd = async () => {
        if (name.trim()) {
            const { data, error } = await supabase.from('sources').insert({ name: name.trim() }).select().single();
            if(error) { console.error(error); return; }
            onSourcesUpdate([...sources, data]);
            setName('');
        }
    };
    
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('sources').delete().eq('id', id);
        if(error) { 
            alert('No se puede eliminar un origen si está siendo utilizado por algún lead.');
            console.error(error); 
        } else {
            onSourcesUpdate(sources.filter(s => s.id !== id));
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
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const LicenciaturaSettings: React.FC<{ licenciaturas: Licenciatura[], onLicenciaturasUpdate: (licenciaturas: Licenciatura[]) => void }> = ({ licenciaturas, onLicenciaturasUpdate }) => {
    const [name, setName] = useState('');

    const handleAdd = async () => {
        if (name.trim()) {
            const { data, error } = await supabase.from('licenciaturas').insert({ name: name.trim() }).select().single();
            if (error) { console.error(error); return; }
            onLicenciaturasUpdate([...licenciaturas, data]);
            setName('');
        }
    };
    
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('licenciaturas').delete().eq('id', id);
        if(error) { 
            alert('No se puede eliminar una licenciatura si está siendo utilizada por algún lead.');
            console.error(error); 
        } else {
            onLicenciaturasUpdate(licenciaturas.filter(s => s.id !== id));
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
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(lic.id)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'users' | 'statuses' | 'sources' | 'licenciaturas'>('users');

  type SettingsTabId = typeof activeTab;

  const settingsTabs: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Usuarios', icon: <UserIcon className="w-5 h-5" /> },
    { id: 'statuses', label: 'Estados', icon: <TagIcon className="w-5 h-5" /> },
    { id: 'sources', label: 'Orígenes', icon: <ArrowDownTrayIcon className="w-5 h-5" /> },
    { id: 'licenciaturas', label: 'Licenciaturas', icon: <AcademicCapIcon className="w-5 h-5" /> },
  ];

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Configuración" size="2xl">
      <div className="flex flex-col sm:flex-row -mx-6 -my-6 min-h-[60vh]">
        {/* Left Navigation */}
        <div className="w-full sm:w-1/3 md:w-1/4 bg-gray-50/70 p-4 border-b sm:border-b-0 sm:border-r border-gray-200">
          <nav className="flex flex-row flex-wrap sm:flex-col gap-1">
            {settingsTabs.map(tab => (
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
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;