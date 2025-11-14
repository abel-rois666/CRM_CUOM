
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


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
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

const UserSettings: React.FC<{ profiles: Profile[] }> = ({ profiles }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Usuarios</h3>
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    La creación y gestión de usuarios se realiza a través de la consola de Supabase para mayor seguridad. Aquí puedes ver los usuarios actuales del sistema.
                </p>
                <hr className="my-4"/>
                <h4 className="font-semibold text-gray-700">Usuarios Actuales</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {profiles.map(profile => (
                        <li key={profile.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <div>
                                <span className="font-medium">{profile.full_name}</span>
                                <span className="text-gray-500 ml-2">({profile.email})</span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${profile.role === 'admin' ? 'bg-indigo-200 text-indigo-800' : 'bg-green-200 text-green-800'}`}>
                                {profile.role}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const StatusSettings: React.FC<{ statuses: Status[], onStatusesUpdate: (statuses: Status[]) => void }> = ({ statuses, onStatusesUpdate }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(colors[0]);

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
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Configuración" size="lg">
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
          {activeTab === 'users' && <UserSettings profiles={props.profiles} />}
          {activeTab === 'statuses' && <StatusSettings statuses={props.statuses} onStatusesUpdate={props.onStatusesUpdate} />}
          {activeTab === 'sources' && <SourceSettings sources={props.sources} onSourcesUpdate={props.onSourcesUpdate} />}
          {activeTab === 'licenciaturas' && <LicenciaturaSettings licenciaturas={props.licenciaturas} onLicenciaturasUpdate={props.onLicenciaturasUpdate} />}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
