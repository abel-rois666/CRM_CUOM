// components/Header.tsx
import React from 'react';
import CogIcon from './icons/CogIcon';
import Button from './common/Button';
import { Profile } from '../types';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';
// CORRECCIÓN: Importamos el archivo exacto que indicaste
import logoCuom from '../assets/logo-cuom-circular.png'; 

interface HeaderProps {
    onOpenSettings: () => void;
    userProfile: Profile | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, userProfile, onLogout }) => {
  const firstName = userProfile?.full_name?.split(' ')[0];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <img src={logoCuom} alt="Logo CUOM" className="w-9 h-9 rounded-full shadow-sm ring-2 ring-white object-cover" />
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">CUOM CRM</h1>
                <span className="text-[10px] font-semibold text-brand-secondary uppercase tracking-wider">Panel Administrativo</span>
            </div>
          </div>

          {/* Acciones de Usuario */}
          <div className="flex items-center gap-2">
            {userProfile && (
                <Button 
                    variant="ghost" 
                    onClick={onOpenSettings}
                    className="text-gray-500 hover:text-brand-secondary hover:bg-brand-secondary/5 p-2 rounded-xl transition-all"
                    aria-label="Configuración"
                    title="Configuración"
                >
                    <CogIcon className="w-5 h-5" />
                </Button>
            )}
            
            {userProfile && (
              <div className="pl-2 ml-2 border-l border-gray-200 flex items-center">
                  <div className="hidden md:flex flex-col items-end mr-3">
                      <span className="text-sm font-semibold text-gray-700 leading-none">{firstName}</span>
                      <span className="text-[10px] text-gray-400 uppercase">{userProfile.role === 'admin' ? 'Administrador' : 'Asesor'}</span>
                  </div>
                  <Button 
                      variant="ghost" 
                      onClick={onLogout}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all group"
                      aria-label="Cerrar sesión"
                      title="Cerrar Sesión"
                    >
                      <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
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