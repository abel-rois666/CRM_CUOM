
import React from 'react';
import CogIcon from './icons/CogIcon';
import Button from './common/Button';
import { Profile } from '../types';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';

interface HeaderProps {
    onOpenSettings: () => void;
    userProfile: Profile | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, userProfile, onLogout }) => {
  return (
    <header className="bg-brand-primary shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white ml-3">CUOM CRM</h1>
          </div>
          <div className="flex items-center space-x-4">
            {userProfile && <span className="text-white text-sm font-medium">Hola, {userProfile.full_name}</span>}
            {userProfile?.role === 'admin' && (
                <Button 
                variant="ghost" 
                onClick={onOpenSettings}
                className="text-white hover:bg-white/10"
                aria-label="Configuración"
                >
                <CogIcon className="w-6 h-6" />
                </Button>
            )}
             <Button 
                variant="ghost" 
                onClick={onLogout}
                className="text-white hover:bg-white/10"
                aria-label="Cerrar sesión"
              >
                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
              </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
