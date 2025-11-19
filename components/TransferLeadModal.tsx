
import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Profile } from '../types';
import TransferIcon from './icons/TransferIcon';

interface TransferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (newAdvisorId: string, reason: string) => void;
  advisors: Profile[];
  currentAdvisorId: string;
}

const TransferLeadModal: React.FC<TransferLeadModalProps> = ({ isOpen, onClose, onTransfer, advisors, currentAdvisorId }) => {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [reason, setReason] = useState('');

  // Filter out the current advisor
  const availableAdvisors = advisors.filter(a => a.id !== currentAdvisorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAdvisorId && reason.trim()) {
      onTransfer(selectedAdvisorId, reason.trim());
      onClose();
      // Reset state
      setSelectedAdvisorId('');
      setReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transferir Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 flex items-start gap-3">
            <TransferIcon className="w-6 h-6 text-blue-600 mt-1" />
            <div className="text-sm text-blue-800">
                <p className="font-bold">Cambio de Responsabilidad</p>
                <p>El lead se moverá a la lista del nuevo asesor y se generará un registro en el historial.</p>
            </div>
        </div>

        <div>
          <label htmlFor="newAdvisor" className="block text-sm font-medium text-gray-700">
            Nuevo Asesor <span className="text-red-500">*</span>
          </label>
          <select
            id="newAdvisor"
            value={selectedAdvisorId}
            onChange={(e) => setSelectedAdvisorId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
            required
          >
            <option value="">Seleccionar asesor destino...</option>
            {availableAdvisors.map(advisor => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transferReason" className="block text-sm font-medium text-gray-700">
            Motivo de la Transferencia <span className="text-red-500">*</span>
          </label>
          <textarea
            id="transferReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
            placeholder="Ej: El cliente solicita atención en turno vespertino..."
            required
          />
        </div>

        <div className="pt-4 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!selectedAdvisorId || !reason.trim()}>
            Confirmar Transferencia
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferLeadModal;
