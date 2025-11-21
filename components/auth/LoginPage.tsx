// components/auth/LoginPage.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
// Asegúrate de que esta ruta coincida con tu estructura actual
import logoCuom from '../../assets/logo-cuom-circular.png'; 

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      await supabase.from('login_history').insert({
        user_id: data.user.id,
        user_agent: navigator.userAgent,
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-slate-900 via-brand-primary to-slate-900">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-secondary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 animate-scale-in">
        <div className="text-center mb-8">
          
          {/* LOGO MEJORADO: Más grande y con mejor distribución */}
          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36 group transition-transform duration-300 hover:scale-105">
                {/* Efecto de resplandor suave detrás del logo */}
                <div className="absolute -inset-4 bg-brand-secondary/20 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
                
                <img 
                  src={logoCuom} 
                  alt="Logo CUOM" 
                  className="relative w-full h-full rounded-full shadow-xl object-cover bg-white ring-4 ring-white"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                
                {/* Fallback por si la imagen falla */}
                <div className="hidden w-full h-full rounded-full bg-gray-100 flex items-center justify-center ring-4 ring-white shadow-inner">
                    <span className="text-gray-400 font-bold text-xl">CUOM</span>
                </div>
            </div>
          </div>

          {/* Textos */}
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido al CRM del CUOM</h1>
          <p className="text-gray-500 text-sm mt-2">Ingresa tus credenciales para acceder al sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary transition-all"
              placeholder="tu@cuom.edu.mx"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-brand-secondary/20" disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </Button>
        </form>
        
        {/* Footer */}
        <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 font-medium">© 2025 CRM CUOM. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;