// components/FollowUpFormModal.tsx
import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input, TextArea } from './common/FormElements'; // Usamos los nuevos

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
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Seguimiento" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input 
            label="Fecha de Contacto"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
        />
        
        <TextArea 
            label="Notas de la conversación"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Describe los detalles importantes, acuerdos o próximos pasos..."
            required
        />

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!notes.trim()} className="shadow-lg shadow-brand-secondary/20">
            Guardar Nota
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FollowUpFormModal;