import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger' | 'secondary';
  hideConfirm?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  confirmButtonVariant = 'primary',
  hideConfirm = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="pt-2 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            {hideConfirm ? 'Cerrar' : cancelButtonText}
          </Button>
          {!hideConfirm && (
            <Button variant={confirmButtonVariant} onClick={handleConfirm}>
              {confirmButtonText}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;

