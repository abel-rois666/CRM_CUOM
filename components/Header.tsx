import React from 'react';
import CogIcon from './icons/CogIcon';
import Button from './common/Button';
import { Profile } from '../types';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';
import logoCuom from '../assets/logo-cuom-circular.png'; 

interface HeaderProps {
    onOpenSettings: () => void;
    userProfile: Profile | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, userProfile, onLogout }) => {
  const firstName = userProfile?.full_name?.split(' ')[0];

  return (
    // CAMBIOS: Fondo 'bg-brand-secondary' (Azul), borde inferior sutil 'border-white/10'
    <header className="bg-brand-secondary border-b border-white/10 sticky top-0 z-40 shadow-md transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            {/* Logo con anillo blanco suave para resaltar sobre el azul */}
            <img src={logoCuom} alt="Logo CUOM" className="w-9 h-9 rounded-full shadow-sm ring-2 ring-white/20 object-cover" />
            <div className="flex flex-col">
                {/* Texto Blanco */}
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">CUOM CRM</h1>
                {/* Subtítulo Azul Claro */}
                <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Panel Administrativo</span>
            </div>
          </div>

          {/* Acciones de Usuario */}
          <div className="flex items-center gap-2">
            {userProfile && (
                <Button 
                    variant="ghost" 
                    onClick={onOpenSettings}
                    // Estilos hover específicos para fondo oscuro
                    className="text-blue-100 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
                    aria-label="Configuración"
                    title="Configuración"
                >
                    <CogIcon className="w-5 h-5" />
                </Button>
            )}
            
            {userProfile && (
              <div className="pl-2 ml-2 border-l border-white/20 flex items-center">
                  <div className="hidden md:flex flex-col items-end mr-3">
                      {/* Texto Blanco */}
                      <span className="text-sm font-semibold text-white leading-none">{firstName}</span>
                      {/* Texto Azul Claro */}
                      <span className="text-[10px] text-blue-200 uppercase">{userProfile.role === 'admin' ? 'Administrador' : 'Asesor'}</span>
                  </div>
                  <Button 
                      variant="ghost" 
                      onClick={onLogout}
                      // Icono de cerrar sesión con hover rojo suave pero legible
                      className="text-blue-100 hover:text-red-200 hover:bg-red-500/20 p-2 rounded-xl transition-all group"
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