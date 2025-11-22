import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import LeadList from './components/LeadList';
import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';
import SettingsModal from './components/SettingsModal';
import ReportModal from './components/ReportModal';
import WhatsAppModal from './components/WhatsAppModal';
import EmailModal from './components/EmailModal';
import BulkImportModal from './components/BulkImportModal';
import AutomationChoiceModal from './components/AutomationChoiceModal'; // IMPORTAR NUEVO MODAL
import { Lead, Appointment, FollowUp } from './types';
import LoginPage from './components/auth/LoginPage';
import LeadListSkeleton from './components/LeadListSkeleton';
import { ToastProvider, useToast } from './context/ToastContext';
import { useCRMData } from './hooks/useCRMData';

const AppContent: React.FC = () => {
  const { session, profile, loading: authLoading, signOut } = useAuth();
  const { success, error: toastError, info } = useToast();

const {
    loadingData,
    leads,
    profiles,
    statuses,
    sources,
    licenciaturas,
    whatsappTemplates,
    emailTemplates,
    setProfiles,
    setStatuses,
    setSources,
    setLicenciaturas,
    setWhatsappTemplates,
    setEmailTemplates,
    updateLocalLead,
    addLocalLead,
    removeLocalLead,
    refetch
  } = useCRMData(session, profile?.role, profile?.id);

  // Estados de UI
  const [isLeadFormOpen, setLeadFormOpen] = useState(false);
  const [isDetailViewOpen, setDetailViewOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBulkImportOpen, setBulkImportOpen] = useState(false);
  const [isAutomationChoiceOpen, setIsAutomationChoiceOpen] = useState(false); // NUEVO ESTADO
  
  // Estados de Selección
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [automationLead, setAutomationLead] = useState<Lead | null>(null); // Lead en proceso de automatización
  
  // Estados para Plantillas Iniciales
  const [initialEmailTemplateId, setInitialEmailTemplateId] = useState<string | undefined>(undefined);
  const [initialWhatsAppTemplateId, setInitialWhatsAppTemplateId] = useState<string | undefined>(undefined);

  if (authLoading) return <LeadListSkeleton />;
  if (!session) return <LoginPage />;

  // --- MANEJADORES DE UI ---

  const handleAddNew = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  const handleViewDetails = async (lead: Lead) => {
    const { data, error } = await supabase
      .from('leads')
      .select(`*, follow_ups(*), appointments(*), status_history(*)`)
      .eq('id', lead.id)
      .single();
    
    if(error) {
      console.error("Error fetching lead details", error);
      toastError("No se pudieron cargar los detalles actualizados.");
      setSelectedLead(lead);
    } else {
      setSelectedLead(data);
    }
    setDetailViewOpen(true);
  };

  // --- LÓGICA DE AUTOMATIZACIÓN Y SELECCIÓN ---

  // 1. Detectar el cambio y abrir el selector
  const checkAndTriggerAutomation = (newStatusId: string, lead: Lead) => {
      const status = statuses.find(s => s.id === newStatusId);
      
      if (status && status.name.toLowerCase().includes('inscrito')) {
          // Esperamos un poco para que la UI se asiente
          setTimeout(() => {
              setAutomationLead(lead);
              setIsAutomationChoiceOpen(true);
              // Reproducir sonido sutil o notificación visual extra si quisieras
              success("¡Inscripción registrada! Elige cómo dar la bienvenida.");
          }, 500);
      }
  };

  // 2. Manejar la elección del usuario (Email vs WhatsApp)
  const handleAutomationChoice = (channel: 'email' | 'whatsapp') => {
      if (!automationLead) return;
      
      setIsAutomationChoiceOpen(false); // Cerrar selector

      if (channel === 'email') {
          const welcomeTemplate = emailTemplates.find(t => t.name.toLowerCase().includes('bienvenida'));
          setSelectedLeadForEmail(automationLead);
          setInitialEmailTemplateId(welcomeTemplate?.id);
          setIsEmailModalOpen(true);
      } else {
          const welcomeTemplate = whatsappTemplates.find(t => t.name.toLowerCase().includes('bienvenida') || t.name.toLowerCase().includes('saludo'));
          setSelectedLeadForWhatsApp(automationLead);
          setInitialWhatsAppTemplateId(welcomeTemplate?.id);
          setWhatsAppModalOpen(true);
      }
  };

  // --- CRUD HANDLERS ---

  const handleDelete = async (leadId: string) => {
       const { error } = await supabase.from('leads').delete().eq('id', leadId);
       if (error) {
         toastError("Error al eliminar el lead.");
       } else {
         removeLocalLead(leadId);
         success("Lead eliminado correctamente.");
       }
  };
  
  const handleSaveLead = async (leadData: Omit<Lead, 'id' | 'registration_date' | 'status_history'>, leadIdToEdit?: string) => {
    if (leadIdToEdit) {
      const oldLead = leads.find(l => l.id === leadIdToEdit);
      const { data, error } = await supabase
        .from('leads')
        .update({ ...leadData })
        .eq('id', leadIdToEdit)
        .select('*, appointments(*), follow_ups(*), status_history(*)')
        .single();
      
      if (error) { toastError(`Error al actualizar: ${error.message}`); return; }

      if (oldLead && oldLead.status_id !== leadData.status_id) {
        await supabase.from('status_history').insert({
          old_status_id: oldLead.status_id,
          new_status_id: leadData.status_id,
          lead_id: leadIdToEdit,
          date: new Date().toISOString()
        });
        checkAndTriggerAutomation(leadData.status_id, data);
      }

      updateLocalLead(data);
      success("Lead actualizado.");

    } else {
      const newLeadPayload = { ...leadData, registration_date: new Date().toISOString() };
      const { data, error } = await supabase.from('leads').insert(newLeadPayload).select('*, appointments(*), follow_ups(*), status_history(*)').single();
      
      if (error) { toastError(`Error al crear: ${error.message}`); return; }
      
      if (data) {
        await supabase.from('status_history').insert({
            old_status_id: null,
            new_status_id: leadData.status_id,
            lead_id: data.id,
            date: new Date().toISOString()
        });
        addLocalLead(data);
        success("Lead creado.");
        checkAndTriggerAutomation(leadData.status_id, data);
      }
    }
    setLeadFormOpen(false);
  };

  const handleUpdateLeadDetails = async (leadId: string, updates: Partial<Pick<Lead, 'advisor_id' | 'status_id'>>) => {
    const oldLead = leads.find(l => l.id === leadId);
    const { data: updatedLeadData, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select('*, appointments(*), follow_ups(*), status_history(*)')
        .single();

    if (error) { toastError(`Error al actualizar: ${error.message}`); return; }

    if (oldLead && updates.status_id && updates.status_id !== oldLead.status_id) {
        await supabase.from('status_history').insert({
            old_status_id: oldLead.status_id,
            new_status_id: updates.status_id,
            lead_id: leadId,
            date: new Date().toISOString()
        });
        checkAndTriggerAutomation(updates.status_id, updatedLeadData);
    }

    updateLocalLead(updatedLeadData);
    if (selectedLead?.id === leadId) setSelectedLead(updatedLeadData);
  };

  // --- RESTO DE HANDLERS (Transfer, FollowUps, Appointments) ---
  
  const handleTransferLead = async (leadId: string, newAdvisorId: string, reason: string) => {
    const oldLead = leads.find(l => l.id === leadId);
    const oldAdvisorName = profiles.find(p => p.id === oldLead?.advisor_id)?.full_name || 'Desconocido';
    const newAdvisorName = profiles.find(p => p.id === newAdvisorId)?.full_name || 'Desconocido';
    const transferNote = `🔄 TRANSICIÓN DE ASESOR\nDe: ${oldAdvisorName}\nA: ${newAdvisorName}\nMotivo: ${reason}`;
    
    const { data: followUpData } = await supabase.from('follow_ups').insert({ lead_id: leadId, date: new Date().toISOString(), notes: transferNote }).select().single();
    const { error: updateError } = await supabase.rpc('transfer_lead', { lead_id: leadId, new_advisor_id: newAdvisorId });

    if (updateError) { toastError(`Error: ${updateError.message}`); return; }

    if (oldLead) {
        const updated = { ...oldLead, advisor_id: newAdvisorId, follow_ups: followUpData ? [...(oldLead.follow_ups || []), followUpData] : oldLead.follow_ups };
        if (profile?.role === 'advisor' && profile.id !== newAdvisorId) { removeLocalLead(leadId); setDetailViewOpen(false); } 
        else { updateLocalLead(updated); if (selectedLead?.id === leadId) setSelectedLead(updated); }
        success("Lead transferido.");
    }
  };

  const handleAddFollowUp = async (leadId: string, followUp: Omit<FollowUp, 'id' | 'lead_id'>) => {
    const { data, error } = await supabase.from('follow_ups').insert({ ...followUp, lead_id: leadId }).select().single();
    if(error) { toastError("Error al guardar."); return; }
    const l = leads.find(l => l.id === leadId);
    if(l) { const up = { ...l, follow_ups: [...(l.follow_ups || []), data] }; updateLocalLead(up); if(selectedLead?.id === leadId) setSelectedLead(up); success("Nota guardada."); }
  };

  const handleDeleteFollowUp = async (leadId: string, followUpId: string) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId);
    if(error) { toastError("Error al eliminar."); return; }
    const l = leads.find(l => l.id === leadId);
    if(l) { const up = { ...l, follow_ups: (l.follow_ups || []).filter(f => f.id !== followUpId) }; updateLocalLead(up); if(selectedLead?.id === leadId) setSelectedLead(up); success("Nota eliminada."); }
  };
  
   const handleSaveAppointment = async (leadId: string, appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id'>, appointmentIdToEdit?: string) => {
    const citadoStatusId = statuses.find(s => s.name === 'Con Cita')?.id;
    let savedAppointment;
    if (appointmentIdToEdit) {
      const { data, error } = await supabase.from('appointments').update(appointmentData).eq('id', appointmentIdToEdit).select().single();
      if(error) { toastError("Error actualizando."); return; } savedAppointment = data; success("Cita actualizada.");
    } else {
      const { data, error } = await supabase.from('appointments').insert({ ...appointmentData, lead_id: leadId, status: 'scheduled' }).select().single();
      if(error) { toastError("Error creando cita."); return; } savedAppointment = data; success("Cita programada.");
    }
    if (citadoStatusId) await handleUpdateLeadDetails(leadId, { status_id: citadoStatusId });
    const l = leads.find(l => l.id === leadId);
    if (l && savedAppointment) {
        let newApps = l.appointments || [];
        if (appointmentIdToEdit) newApps = newApps.map(a => a.id === appointmentIdToEdit ? savedAppointment : a);
        else newApps = [...newApps, savedAppointment];
        const up = { ...l, appointments: newApps }; updateLocalLead(up); if (selectedLead?.id === leadId) setSelectedLead(up);
    }
  };

  const handleUpdateAppointmentStatus = async (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
      const { data, error } = await supabase.from('appointments').update({ status }).eq('id', appointmentId).select().single();
      if (error) { toastError("Error actualizando."); return; }
      const l = leads.find(l => l.id === leadId);
      if (l) { const newApps = (l.appointments || []).map(a => a.id === appointmentId ? data : a); const up = { ...l, appointments: newApps }; updateLocalLead(up); if (selectedLead?.id === leadId) setSelectedLead(up); status === 'completed' ? success("Completada.") : info("Cancelada."); }
  };

  const handleDeleteAppointment = async (leadId: string, appointmentId: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) { toastError("Error eliminando."); return; }
      const l = leads.find(l => l.id === leadId);
      if (l) { const newApps = (l.appointments || []).filter(a => a.id !== appointmentId); const up = { ...l, appointments: newApps }; updateLocalLead(up); if (selectedLead?.id === leadId) setSelectedLead(up); success("Eliminada."); }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} userProfile={profile} onLogout={signOut} />
      <main>
        <LeadList
          loading={loadingData}
          leads={leads}
          advisors={profiles.filter(p => p.role === 'advisor')}
          statuses={statuses}
          licenciaturas={licenciaturas}
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onOpenReports={() => setReportModalOpen(true)}
          onOpenImport={() => setBulkImportOpen(true)}
          // Reset manual si se abre directo desde la lista
          onOpenWhatsApp={(lead) => { 
              setSelectedLeadForWhatsApp(lead); 
              setInitialWhatsAppTemplateId(undefined); 
              setWhatsAppModalOpen(true); 
          }}
          onOpenEmail={(lead) => { 
              setSelectedLeadForEmail(lead); 
              setInitialEmailTemplateId(undefined); 
              setIsEmailModalOpen(true); 
          }}
          onUpdateLead={handleUpdateLeadDetails}
        />
      </main>

      {/* MODALES */}
      
      {/* Selector de Automatización */}
      <AutomationChoiceModal 
        isOpen={isAutomationChoiceOpen}
        onClose={() => setIsAutomationChoiceOpen(false)}
        lead={automationLead}
        onSelect={handleAutomationChoice}
      />

      {isLeadFormOpen && (
        <LeadFormModal
          isOpen={isLeadFormOpen}
          onClose={() => setLeadFormOpen(false)}
          onSave={(leadData, leadId) => handleSaveLead(leadData, leadId)}
          leadToEdit={selectedLead}
          advisors={profiles.filter(p => p.role === 'advisor')}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          currentUser={profile}
        />
      )}

      {isDetailViewOpen && selectedLead && (
        <LeadDetailModal
          isOpen={isDetailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          lead={selectedLead}
          advisors={profiles.filter(p => p.role === 'advisor')}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          onAddFollowUp={handleAddFollowUp}
          onDeleteFollowUp={handleDeleteFollowUp}
          onUpdateLead={handleUpdateLeadDetails}
          onSaveAppointment={handleSaveAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          onTransferLead={handleTransferLead}
          currentUser={profile}
        />
      )}
      
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          profiles={profiles}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          whatsappTemplates={whatsappTemplates}
          emailTemplates={emailTemplates}
          currentUserProfile={profile}
          onProfilesUpdate={setProfiles}
          onStatusesUpdate={setStatuses}
          onSourcesUpdate={setSources}
          onLicenciaturasUpdate={setLicenciaturas}
          onWhatsappTemplatesUpdate={setWhatsappTemplates}
          onEmailTemplatesUpdate={setEmailTemplates}
        />
      )}

      {isReportModalOpen && (
        <ReportModal 
            isOpen={isReportModalOpen}
            onClose={() => setReportModalOpen(false)}
            leads={leads}
            statuses={statuses}
            advisors={profiles.filter(p => p.role === 'advisor')}
            sources={sources}
        />
      )}
      
      {isBulkImportOpen && (
          <BulkImportModal 
            isOpen={isBulkImportOpen} 
            onClose={() => setBulkImportOpen(false)}
            onSuccess={() => { refetch(); setBulkImportOpen(false); }}
            advisors={profiles.filter(p => p.role === 'advisor')}
            statuses={statuses}
            sources={sources}
            licenciaturas={licenciaturas}
          />
      )}

      {isWhatsAppModalOpen && (
          <WhatsAppModal 
            isOpen={isWhatsAppModalOpen} 
            onClose={() => setWhatsAppModalOpen(false)} 
            lead={selectedLeadForWhatsApp} 
            templates={whatsappTemplates} 
            initialTemplateId={initialWhatsAppTemplateId} // Prop pasada
          />
      )}

      {isEmailModalOpen && selectedLeadForEmail && (
          <EmailModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
            lead={selectedLeadForEmail}
            templates={emailTemplates}
            initialTemplateId={initialEmailTemplateId} // Prop pasada
          />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
        <AppContent />
    </ToastProvider>
  </AuthProvider>
);

export default App;