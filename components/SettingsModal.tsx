
import React, { useState } from 'react';
import { Advisor, Status, Source, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import UserIcon from './icons/UserIcon';
import TagIcon from './icons/TagIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  onAdvisorsUpdate: (advisors: Advisor[]) => void;
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

const AdvisorSettings: React.FC<{ advisors: Advisor[], onAdvisorsUpdate: (advisors: Advisor[]) => void }> = ({ advisors, onAdvisorsUpdate }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleAdd = () => {
        if (name.trim() && email.trim()) {
            onAdvisorsUpdate([...advisors, { id: new Date().toISOString(), name: name.trim(), email: email.trim() }]);
            setName('');
            setEmail('');
        }
    };
    
    const handleDelete = (id: string) => {
        onAdvisorsUpdate(advisors.filter(a => a.id !== id));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gestionar Asesores</h3>
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Añadir Nuevo Asesor</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del Asesor" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email del Asesor" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    <Button onClick={handleAdd} size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>}>Añadir Asesor</Button>
                </div>
                <hr className="my-4"/>
                <h4 className="font-semibold text-gray-700">Asesores Actuales</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {advisors.map(advisor => (
                        <li key={advisor.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                            <span>{advisor.name} ({advisor.email})</span>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(advisor.id)}>
                                <TrashIcon className="w-4 h-4 text-red-500"/>
                            </Button>
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

    const handleAdd = () => {
        if(name.trim()) {
            onStatusesUpdate([...statuses, { id: new Date().toISOString(), name: name.trim(), color }]);
            setName('');
        }
    }
    
    const handleDelete = (id: string) => {
        onStatusesUpdate(statuses.filter(s => s.id !== id));
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

    const handleAdd = () => {
        if (name.trim()) {
            onSourcesUpdate([...sources, { id: new Date().toISOString(), name: name.trim() }]);
            setName('');
        }
    };
    
    const handleDelete = (id: string) => {
        onSourcesUpdate(sources.filter(s => s.id !== id));
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

    const handleAdd = () => {
        if (name.trim()) {
            onLicenciaturasUpdate([...licenciaturas, { id: new Date().toISOString(), name: name.trim() }]);
            setName('');
        }
    };
    
    const handleDelete = (id: string) => {
        onLicenciaturasUpdate(licenciaturas.filter(s => s.id !== id));
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
  const [activeTab, setActiveTab] = useState<'advisors' | 'statuses' | 'sources' | 'licenciaturas'>('advisors');

  type SettingsTabId = typeof activeTab;

  const settingsTabs: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'advisors', label: 'Asesores', icon: <UserIcon className="w-5 h-5" /> },
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
          {activeTab === 'advisors' && <AdvisorSettings advisors={props.advisors} onAdvisorsUpdate={props.onAdvisorsUpdate} />}
          {activeTab === 'statuses' && <StatusSettings statuses={props.statuses} onStatusesUpdate={props.onStatusesUpdate} />}
          {activeTab === 'sources' && <SourceSettings sources={props.sources} onSourcesUpdate={props.onSourcesUpdate} />}
          {activeTab === 'licenciaturas' && <LicenciaturaSettings licenciaturas={props.licenciaturas} onLicenciaturasUpdate={props.onLicenciaturasUpdate} />}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
