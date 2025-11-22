import React from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Lead } from '../types';
import EnvelopeIcon from './icons/EnvelopeIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';

interface AutomationChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSelect: (channel: 'email' | 'whatsapp') => void;
}

const AutomationChoiceModal: React.FC<AutomationChoiceModalProps> = ({ isOpen, onClose, lead, onSelect }) => {
  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="¡Nuevo Inscrito Detectado!" size="sm">
      <div className="text-center space-y-6 py-2">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-900 font-medium">
                ¿Cómo te gustaría dar la bienvenida a <br/>
                <span className="font-bold text-lg">{lead.first_name} {lead.paternal_last_name}</span>?
            </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
            {/* Botón Email */}
            <Button 
                variant="ghost" // IMPORTANTE: Evita el conflicto con el azul primario
                onClick={() => onSelect('email')}
                className="w-full justify-start h-14 relative overflow-hidden group border border-blue-200 bg-white hover:!bg-blue-50 text-gray-700 transition-all"
            >
                <div className="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                    <EnvelopeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                    <span className="block font-bold text-sm text-gray-900 group-hover:text-blue-900 transition-colors">Enviar Correo</span>
                    <span className="block text-[10px] text-blue-400 group-hover:text-blue-500 transition-colors">Recomendado para info extensa</span>
                </div>
            </Button>

            {/* Botón WhatsApp */}
            <Button 
                variant="ghost" // IMPORTANTE: Limpia estilos base
                onClick={() => onSelect('whatsapp')}
                className="w-full justify-start h-14 relative overflow-hidden group border border-green-200 bg-white hover:!bg-green-50 text-gray-700 transition-all"
            >
                <div className="bg-green-100 p-2 rounded-lg mr-3 group-hover:bg-green-200 transition-colors">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                    <span className="block font-bold text-sm text-gray-900 group-hover:text-green-900 transition-colors">Enviar WhatsApp</span>
                    <span className="block text-[10px] text-green-400 group-hover:text-green-500 transition-colors">Para contacto rápido y directo</span>
                </div>
            </Button>
        </div>

        <div className="pt-2 border-t border-gray-100">
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
                Omitir bienvenida por ahora
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default AutomationChoiceModal;