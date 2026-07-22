// components/FollowUpFormModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface FollowUpFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; notes: string; interaction_types: string[] }) => void;
}

const FollowUpFormModal: React.FC<FollowUpFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSelectedTypes([]);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (notes.trim()) {
      onSave({ date, notes: notes.trim(), interaction_types: selectedTypes });
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Seguimiento" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">FECHA DE CONTACTO <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">TIPO DE INTERACCIÓN</label>
          <div className="flex flex-wrap gap-3">
            {['Llamada telefónica', 'WhatsApp', 'Email'].map((type) => (
              <label key={type} className="flex items-center space-x-2 cursor-pointer bg-gray-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded text-brand-primary focus:ring-brand-primary dark:bg-slate-800 dark:border-slate-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">NOTAS DE LA CONVERSACIÓN <span className="text-red-500">*</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            rows={4}
            placeholder="Describe los detalles importantes, acuerdos o próximos pasos..."
          />
        </div>
      </div>
      <div className="flex justify-end mt-6 space-x-3">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} disabled={!notes.trim()}>Guardar Nota</Button>
      </div>
    </Modal>
  );
};

export default FollowUpFormModal;