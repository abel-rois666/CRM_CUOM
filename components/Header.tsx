// components/Header.tsx
import React from 'react';
import CogIcon from './icons/CogIcon';
import Button from './common/Button';
import { Profile } from '../types';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';
import logoCuom from '../assets/logo-cuom-circular.png'; 
import NotificationDropdown from './NotificationDropdown'; // Importación nueva

interface HeaderProps {
    onOpenSettings: () => void;
    userProfile: Profile | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, userProfile, onLogout }) => {
  const firstName = userProfile?.full_name?.split(' ')[0];

  return (
    <header className="bg-brand-primary border-b border-white/10 sticky top-0 z-40 shadow-md transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <img 
                src={logoCuom} 
                alt="Logo CUOM" 
                className="w-9 h-9 rounded-full shadow-sm ring-2 ring-white/20 object-cover bg-white" 
            />
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">CUOM CRM</h1>
                <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">
                    {userProfile?.role === 'admin' ? 'Administración' : 'Panel de Asesor'}
                </span>
            </div>
          </div>

          {/* Acciones de Usuario */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* 1. Centro de Notificaciones (NUEVO) */}
            <div className="border-r border-white/10 pr-2 sm:pr-4 mr-2">
                <NotificationDropdown userId={userProfile?.id} />
            </div>

            {userProfile && (
                <Button 
                    variant="ghost" 
                    onClick={onOpenSettings}
                    className="!text-white hover:!bg-white/10 p-2 rounded-xl transition-all"
                    aria-label="Configuración"
                    title="Configuración"
                >
                    <CogIcon className="w-6 h-6" />
                </Button>
            )}
            
            {userProfile && (
              <div className="pl-2 flex items-center">
                  <div className="hidden md:flex flex-col items-end mr-3">
                      <span className="text-sm font-semibold text-white leading-none">{firstName}</span>
                      <span className="text-[10px] text-blue-200 uppercase font-medium tracking-wide mt-0.5">
                        {userProfile.role === 'admin' ? 'Super Admin' : (userProfile.role === 'moderator' ? 'Coordinador' : 'Asesor')}
                      </span>
                  </div>
                  <Button 
                      variant="ghost" 
                      onClick={onLogout}
                      className="!text-red-100 hover:!bg-red-500/20 p-2 rounded-xl transition-all group"
                      aria-label="Cerrar sesión"
                      title="Cerrar Sesión"
                    >
                      <ArrowLeftOnRectangleIcon className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                    </Button>
              </div>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;