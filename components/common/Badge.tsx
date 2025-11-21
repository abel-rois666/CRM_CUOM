// components/common/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string; // Esperamos clases de Tailwind como 'bg-blue-500'
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({ children, color = 'bg-gray-500', size = 'md' }) => {
  // Mapa para convertir colores sólidos antiguos a estilos "Soft" modernos
  // Ejemplo: si viene 'bg-blue-500', lo transformamos en un fondo suave con texto oscuro
  
  const getColorStyle = (bgClass: string) => {
    if (bgClass.includes('red')) return 'bg-red-50 text-red-700 ring-red-600/20';
    if (bgClass.includes('blue') || bgClass.includes('sky')) return 'bg-blue-50 text-blue-700 ring-blue-700/10';
    if (bgClass.includes('green') || bgClass.includes('emerald')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    if (bgClass.includes('yellow') || bgClass.includes('amber')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    if (bgClass.includes('purple') || bgClass.includes('violet')) return 'bg-purple-50 text-purple-700 ring-purple-700/10';
    if (bgClass.includes('orange')) return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    // Default gray/slate
    return 'bg-gray-50 text-gray-600 ring-gray-500/10';
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const colorClasses = getColorStyle(color);

  return (
    <span className={`inline-flex items-center font-medium rounded-lg ring-1 ring-inset ${sizeClasses} ${colorClasses}`}>
      {children}
    </span>
  );
};

export default Badge;