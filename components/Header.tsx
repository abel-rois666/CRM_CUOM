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
  const firstName = userProfile?.full_name?.split(' ')[0];

  return (
    <header className="bg-brand-primary shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white ml-3">CUOM CRM</h1>
          </div>
          <div className="flex items-center space-x-2">
            {userProfile?.role === 'admin' && (
                <Button 
                variant="ghost" 
                onClick={onOpenSettings}
                className="text-white hover:bg-white/10 p-2"
                aria-label="Configuración"
                >
                <CogIcon className="w-5 h-5" />
                </Button>
            )}
             {userProfile && (
              <Button 
                  variant="ghost" 
                  onClick={onLogout}
                  className="text-white hover:bg-white/10 flex items-center p-2"
                  aria-label="Cerrar sesión"
                >
                  {firstName && (
                    <span className="text-sm font-medium mr-2">
                        Hola, {firstName}
                    </span>
                  )}
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                </Button>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;