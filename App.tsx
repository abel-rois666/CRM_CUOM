// App.tsx
import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import LeadList from './components/LeadList';
import LeadFormModal from './components/LeadFormModal';
import WhatsAppModal from './components/WhatsAppModal';
import EmailModal from './components/EmailModal';
import AutomationChoiceModal from './components/AutomationChoiceModal';
import { Lead } from './types';
import LoginPage from './components/auth/LoginPage';
import LeadListSkeleton from './components/LeadListSkeleton';
import { ToastProvider, useToast } from './context/ToastContext';
import { useCRMData } from './hooks/useCRMData';

// IMPORTACIÓN DIFERIDA
const LeadDetailModal = React.lazy(() => import('./components/LeadDetailModal'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const ReportModal = React.lazy(() => import('./components/ReportModal'));
const BulkImportModal = React.lazy(() => import('./components/BulkImportModal'));

const AppContent: React.FC = () => {
  const { session, profile, loading: authLoading, signOut } = useAuth();
  const { success, error: toastError } = useToast();

  const {
    loadingData,
    loadingLeads,
    leads,
    totalLeads,
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    setFilters,
    
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
    removeManyLocalLeads,
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
  const [isAutomationChoiceOpen, setIsAutomationChoiceOpen] = useState(false);
  
  const [detailInitialTab, setDetailInitialTab] = useState<'info' | 'activity' | 'appointments'>('info');

  // Estados de Selección
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [automationLead, setAutomationLead] = useState<Lead | null>(null);
  
  const [initialEmailTemplateId, setInitialEmailTemplateId] = useState<string | undefined>(undefined);
  const [initialWhatsAppTemplateId, setInitialWhatsAppTemplateId] = useState<string | undefined>(undefined);

  const assignableStaff = profiles.filter(p => 
      p.role === 'advisor' || p.role === 'moderator' || p.role === 'admin'
  );

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

  const handleViewDetails = async (lead: Lead, tab: 'info' | 'activity' | 'appointments' = 'info') => {
    setDetailInitialTab(tab); 
    setSelectedLead(lead);
    setDetailViewOpen(true);

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *, 
        follow_ups(*, created_by(full_name)), 
        appointments(*, created_by(full_name)), 
        status_history(*, created_by(full_name))
      `)
      .eq('id', lead.id)
      .single();
    
    if(error) {
      console.error("Error fetching lead details", error);
    } else {
      setSelectedLead(data);
    }
  };

  // --- LÓGICA DE AUTOMATIZACIÓN ---

  const checkAndTriggerAutomation = (newStatusId: string, lead: Lead) => {
      const status = statuses.find(s => s.id === newStatusId);
      if (status && status.name.toLowerCase().includes('inscrito')) {
          setTimeout(() => {
              setAutomationLead(lead);
              setIsAutomationChoiceOpen(true);
              success("¡Inscripción registrada! Elige cómo dar la bienvenida.");
          }, 500);
      }
  };

  const handleAutomationChoice = (channel: 'email' | 'whatsapp') => {
      if (!automationLead) return;
      setIsAutomationChoiceOpen(false);

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
  
  const handleSaveLead = async (leadData: any, leadIdToEdit?: string) => {
    if (leadIdToEdit) {
      const oldLead = leads.find(l => l.id === leadIdToEdit);
      const { data, error } = await supabase
        .from('leads')
        .update({ ...leadData })
        .eq('id', leadIdToEdit)
        .select(`*, appointments(*, created_by(full_name)), follow_ups(*, created_by(full_name)), status_history(*, created_by(full_name))`)
        .single();
      
      if (error) { toastError(`Error al actualizar: ${error.message}`); return; }

      let updatedLead = { ...data };
      
      if (oldLead && oldLead.status_id !== leadData.status_id) {
        const { data: newHistory, error: historyError } = await supabase.from('status_history').insert({
          old_status_id: oldLead.status_id,
          new_status_id: leadData.status_id,
          lead_id: leadIdToEdit,
          date: new Date().toISOString(),
          created_by: profile?.id 
        }).select().single();

        if (!historyError && newHistory) {
            const historyWithProfile = { ...newHistory, created_by: profile };
            updatedLead.status_history = [...(updatedLead.status_history || []), historyWithProfile];
        }
        checkAndTriggerAutomation(leadData.status_id, updatedLead);
      }

      updateLocalLead(updatedLead);
      success("Lead actualizado.");

    } else {
      const newLeadPayload = { ...leadData, registration_date: new Date().toISOString() };
      const { data, error } = await supabase.from('leads').insert(newLeadPayload).select().single();
      
      if (error) { toastError(`Error al crear: ${error.message}`); return; }
      
      if (data) {
        const { data: initHistory } = await supabase.from('status_history').insert({
            old_status_id: null,
            new_status_id: leadData.status_id,
            lead_id: data.id,
            date: new Date().toISOString(),
            created_by: profile?.id
        }).select().single();

        const fullNewLead = {
            ...data,
            appointments: [],
            follow_ups: [],
            status_history: initHistory ? [{ ...initHistory, created_by: profile }] : []
        };

        addLocalLead(fullNewLead);
        // IMPORTANTE: Refetch para que la paginación del servidor se entere del nuevo registro y lo ordene bien
        refetch();
        success("Lead creado.");
        checkAndTriggerAutomation(leadData.status_id, fullNewLead);
      }
    }
    setLeadFormOpen(false);
  };

  const handleUpdateLeadDetails = async (leadId: string, updates: any) => {
    const oldLead = leads.find(l => l.id === leadId);
    
    const { data: leadData, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

    if (error) { toastError(`Error: ${error.message}`); return; }

    let newHistoryItem: any = null;
    if (oldLead && updates.status_id && updates.status_id !== oldLead.status_id) {
        const { data: historyData } = await supabase.from('status_history').insert({
            old_status_id: oldLead.status_id,
            new_status_id: updates.status_id,
            lead_id: leadId,
            date: new Date().toISOString(),
            created_by: profile?.id
        }).select().single();
        
        if (historyData) {
            newHistoryItem = { ...historyData, created_by: profile }; 
        }
    }

    const updatedLeadComplete = {
        ...oldLead, 
        ...leadData, 
        appointments: oldLead?.appointments || [],
        follow_ups: oldLead?.follow_ups || [],
        status_history: newHistoryItem 
            ? [...(oldLead?.status_history || []), newHistoryItem] 
            : (oldLead?.status_history || [])
    };

    updateLocalLead(updatedLeadComplete as Lead);
    if (selectedLead?.id === leadId) {
        setSelectedLead(updatedLeadComplete as Lead);
    }
    
    if (updates.status_id) checkAndTriggerAutomation(updates.status_id, updatedLeadComplete as Lead);
  };

  const handleTransferLead = async (leadId: string, newAdvisorId: string, reason: string) => {
    const oldLead = leads.find(l => l.id === leadId);
    const oldAdvisorName = profiles.find(p => p.id === oldLead?.advisor_id)?.full_name || 'Desconocido';
    const newAdvisorName = profiles.find(p => p.id === newAdvisorId)?.full_name || 'Desconocido';
    const transferNote = `🔄 TRANSICIÓN DE ASESOR\nDe: ${oldAdvisorName}\nA: ${newAdvisorName}\nMotivo: ${reason}`;
    
    const { data: followUpData } = await supabase.from('follow_ups').insert({ 
        lead_id: leadId, 
        date: new Date().toISOString(), 
        notes: transferNote,
        created_by: profile?.id 
    }).select().single();

    const { error: updateError } = await supabase.rpc('transfer_lead', { lead_id: leadId, new_advisor_id: newAdvisorId });

    if (updateError) { toastError(`Error: ${updateError.message}`); return; }

    if (oldLead) {
        const newFollowUpWithProfile = followUpData ? { ...followUpData, created_by: profile } : null;
        
        const updated = { 
            ...oldLead, 
            advisor_id: newAdvisorId, 
            follow_ups: newFollowUpWithProfile ? [...(oldLead.follow_ups || []), newFollowUpWithProfile] : oldLead.follow_ups 
        };

        if (profile?.role === 'advisor' && profile.id !== newAdvisorId) { 
            removeLocalLead(leadId); 
            setDetailViewOpen(false); 
        } else { 
            updateLocalLead(updated); 
            if (selectedLead?.id === leadId) setSelectedLead(updated); 
        }
        success("Lead transferido.");
    }
  };

  // Función central para añadir notas (usada por modales y manual)
  const handleAddFollowUp = async (leadId: string, followUp: any) => {
    const { data, error } = await supabase.from('follow_ups').insert({ 
        ...followUp, 
        lead_id: leadId,
        created_by: profile?.id 
    }).select().single();

    if(error) { toastError("Error al guardar."); return; }

    // Actualizar si está en memoria
    const l = leads.find(l => l.id === leadId);
    if(l && data) { 
        const newFollowUp = { ...data, created_by: profile };
        const up = { ...l, follow_ups: [...(l.follow_ups || []), newFollowUp] }; 
        updateLocalLead(up); 
    }
    
    // Actualizar el modal de detalles si está abierto
    if(selectedLead?.id === leadId && data) {
         const newFollowUp = { ...data, created_by: profile };
         setSelectedLead(prev => prev ? ({ ...prev, follow_ups: [...(prev.follow_ups || []), newFollowUp] }) : null);
    }
    success("Nota guardada.");
  };

  // Función callback para modales de mensaje
  const handleMessageSent = (leadId: string, note: string) => {
      handleAddFollowUp(leadId, {
          date: new Date().toISOString(),
          notes: note
      });
  };

  const handleDeleteFollowUp = async (leadId: string, followUpId: string) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId);
    if(error) { toastError("Error al eliminar."); return; }
    
    const l = leads.find(l => l.id === leadId);
    if(l) { 
        const up = { ...l, follow_ups: (l.follow_ups || []).filter(f => f.id !== followUpId) }; 
        updateLocalLead(up); 
    }
    if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? ({...prev, follow_ups: (prev.follow_ups || []).filter(f => f.id !== followUpId)}) : null);
    }
    success("Nota eliminada."); 
  };
  
   const handleSaveAppointment = async (leadId: string, appointmentData: any, appointmentIdToEdit?: string) => {
    const citadoStatusId = statuses.find(s => s.name === 'Con Cita')?.id;
    let savedAppointment;

    const payload = {
        ...appointmentData,
        created_by: profile?.id 
    };

    if (appointmentIdToEdit) {
      const { data, error } = await supabase.from('appointments').update(payload).eq('id', appointmentIdToEdit).select().single();
      if(error) { toastError("Error actualizando."); return; } savedAppointment = data; success("Cita actualizada.");
    } else {
      const { data, error } = await supabase.from('appointments').insert({ ...payload, lead_id: leadId, status: 'scheduled' }).select().single();
      if(error) { toastError("Error creando cita."); return; } savedAppointment = data; success("Cita programada.");
    }

    if (citadoStatusId) await handleUpdateLeadDetails(leadId, { status_id: citadoStatusId });
    
    const l = leads.find(l => l.id === leadId);
    if (l && savedAppointment) {
        const apptWithProfile = { ...savedAppointment, created_by: profile }; 
        let newApps = l.appointments || [];
        
        if (appointmentIdToEdit) {
            newApps = newApps.map(a => a.id === appointmentIdToEdit ? apptWithProfile : a);
        } else {
            newApps = [...newApps, apptWithProfile];
        }
        
        const up = { ...l, appointments: newApps }; 
        updateLocalLead(up); 
    }
    
    if (selectedLead?.id === leadId && savedAppointment) {
        const apptWithProfile = { ...savedAppointment, created_by: profile };
        setSelectedLead(prev => {
            if(!prev) return null;
            let newApps = prev.appointments || [];
            if (appointmentIdToEdit) newApps = newApps.map(a => a.id === appointmentIdToEdit ? apptWithProfile : a);
            else newApps = [...newApps, apptWithProfile];
            return { ...prev, appointments: newApps };
        });
    }
  };

  const handleUpdateAppointmentStatus = async (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
      const { data, error } = await supabase.from('appointments').update({ status }).eq('id', appointmentId).select().single();
      if (error) { toastError("Error actualizando."); return; }
      
      const l = leads.find(l => l.id === leadId);
      if (l && data) { 
          const apptWithProfile = { ...data, created_by: profile }; 
          const newApps = (l.appointments || []).map(a => a.id === appointmentId ? { ...a, ...apptWithProfile } : a); 
          const up = { ...l, appointments: newApps }; 
          updateLocalLead(up); 
      }
      
      if (selectedLead?.id === leadId && data) {
          const apptWithProfile = { ...data, created_by: profile };
          setSelectedLead(prev => {
              if(!prev) return null;
              return { ...prev, appointments: (prev.appointments || []).map(a => a.id === appointmentId ? { ...a, ...apptWithProfile } : a) };
          });
      }
      
      status === 'completed' ? success("Completada.") : info("Cancelada."); 
  };

  const handleDeleteAppointment = async (leadId: string, appointmentId: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) { toastError("Error eliminando."); return; }
      
      const l = leads.find(l => l.id === leadId);
      if (l) { 
          const newApps = (l.appointments || []).filter(a => a.id !== appointmentId); 
          const up = { ...l, appointments: newApps }; 
          updateLocalLead(up); 
      }
      
      if (selectedLead?.id === leadId) {
          setSelectedLead(prev => prev ? ({...prev, appointments: (prev.appointments || []).filter(a => a.id !== appointmentId)}) : null);
      }
      
      success("Eliminada."); 
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} userProfile={profile} onLogout={signOut} />
      <main>
        <LeadList
          loading={loadingData || loadingLeads}
          leads={leads}
          totalLeads={totalLeads}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onFilterChange={setFilters}
          currentFilters={filters}
          
          advisors={assignableStaff} 
          statuses={statuses}
          licenciaturas={licenciaturas}
          whatsappTemplates={whatsappTemplates}
          emailTemplates={emailTemplates}
          
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onOpenReports={() => setReportModalOpen(true)}
          onOpenImport={() => setBulkImportOpen(true)}
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
          userRole={profile?.role}
          currentUser={profile}
          onRefresh={refetch}
          onLocalDeleteMany={removeManyLocalLeads}
        />
      </main>

      {/* MODALES */}
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
          advisors={assignableStaff}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          currentUser={profile}
        />
      )}

      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-secondary"></div></div>}>
        
        {isDetailViewOpen && selectedLead && (
            <LeadDetailModal
            isOpen={isDetailViewOpen}
            onClose={() => setDetailViewOpen(false)}
            lead={selectedLead}
            advisors={assignableStaff}
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
            initialTab={detailInitialTab}
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
                advisors={assignableStaff}
                sources={sources}
            />
        )}
        
        {isBulkImportOpen && (
            <BulkImportModal 
                isOpen={isBulkImportOpen} 
                onClose={() => setBulkImportOpen(false)}
                onSuccess={() => { refetch(); setBulkImportOpen(false); }}
                advisors={assignableStaff}
                statuses={statuses}
                sources={sources}
                licenciaturas={licenciaturas}
            />
        )}
      </Suspense>

      {/* MODALES INDIVIDUALES ACTUALIZADOS: USAN handleMessageSent */}
      {isWhatsAppModalOpen && (
          <WhatsAppModal 
            isOpen={isWhatsAppModalOpen} 
            onClose={() => setWhatsAppModalOpen(false)} 
            lead={selectedLeadForWhatsApp} 
            templates={whatsappTemplates} 
            initialTemplateId={initialWhatsAppTemplateId}
            onMessageSent={handleMessageSent} // CORRECCIÓN CLAVE
          />
      )}

      {isEmailModalOpen && selectedLeadForEmail && (
          <EmailModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
            lead={selectedLeadForEmail}
            templates={emailTemplates} 
            initialTemplateId={initialEmailTemplateId}
            onMessageSent={handleMessageSent} // CORRECCIÓN CLAVE
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