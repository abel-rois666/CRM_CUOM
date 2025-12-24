import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define available modal keys for type safety
export type ModalKey =
    | 'leadForm'
    | 'detailView'
    | 'settings'
    | 'report'
    | 'whatsapp'
    | 'email'
    | 'bulkImport'
    | 'automationChoice';

interface ModalState {
    isOpen: boolean;
    data?: any; // Generic data payload
}

type ModalsMap = Record<ModalKey, ModalState>;

interface ModalContextType {
    modals: ModalsMap;
    openModal: (key: ModalKey, data?: any) => void;
    updateModalData: (key: ModalKey, data: any) => void;
    closeModal: (key: ModalKey) => void;
    closeAllModals: () => void;
}

const defaultState: ModalsMap = {
    leadForm: { isOpen: false },
    detailView: { isOpen: false },
    settings: { isOpen: false },
    report: { isOpen: false },
    whatsapp: { isOpen: false },
    email: { isOpen: false },
    bulkImport: { isOpen: false },
    automationChoice: { isOpen: false },
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modals, setModals] = useState<ModalsMap>(defaultState);

    const openModal = (key: ModalKey, data?: any) => {
        setModals(prev => ({
            ...prev,
            [key]: { isOpen: true, data }
        }));
    };

    const updateModalData = (key: ModalKey, data: any) => {
        setModals(prev => ({
            ...prev,
            [key]: { ...prev[key], data }
        }));
    };

    const closeModal = (key: ModalKey) => {
        setModals(prev => ({
            ...prev,
            [key]: { isOpen: false, data: undefined }
        }));
    };

    const closeAllModals = () => {
        setModals(defaultState);
    };

    return (
        <ModalContext.Provider value={{ modals, openModal, updateModalData, closeModal, closeAllModals }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
