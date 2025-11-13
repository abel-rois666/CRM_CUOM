
import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface FollowUpFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; notes: string }) => void;
}

const FollowUpFormModal: React.FC<FollowUpFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notes.trim()) {
      onSave({ date, notes: notes.trim() });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Seguimiento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">
            Fecha
          </label>
          <input
            type="date"
            id="followUpDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="followUpNotes" className="block text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            id="followUpNotes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
            placeholder="Introduce los detalles del seguimiento..."
            required
          />
        </div>
        <div className="pt-4 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!notes.trim()}>
            Guardar Seguimiento
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FollowUpFormModal;
