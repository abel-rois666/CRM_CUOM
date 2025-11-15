import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, updates: { fullName: string; role: 'admin' | 'advisor'; newPassword?: string }) => Promise<void>;
  user: Profile | null;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'advisor'>('advisor');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setRole(user.role);
      setNewPassword(''); // Reset password field every time modal opens
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    await onSave(user.id, {
      fullName,
      role,
      newPassword: newPassword.trim() || undefined,
    });
    setLoading(false);
    // onClose is called by the parent on success
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700";

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Usuario: ${user.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="editFullName" className={labelClasses}>Nombre Completo</label>
          <input id="editFullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClasses} />
        </div>
        <div>
          <label htmlFor="editEmail" className={labelClasses}>Correo Electrónico</label>
          <input id="editEmail" type="email" value={user.email || ''} disabled className={`${inputClasses} bg-gray-100 cursor-not-allowed`} />
        </div>
        <div>
          <label htmlFor="editRole" className={labelClasses}>Rol</label>
          <select id="editRole" value={role} onChange={e => setRole(e.target.value as any)} className={inputClasses}>
            <option value="advisor">Asesor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <hr />
        <div>
          <label htmlFor="editNewPassword" className={labelClasses}>Nueva Contraseña (Opcional)</label>
          <input id="editNewPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className={inputClasses} placeholder="Dejar en blanco para no cambiar" />
           <p className="text-xs text-gray-500 mt-1">Si se establece, la contraseña anterior del usuario dejará de funcionar.</p>
        </div>
        <div className="pt-4 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading || !fullName}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
