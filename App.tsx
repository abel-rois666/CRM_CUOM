// App.tsx
import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase as supabaseClient } from './lib/supabase';
const supabase = supabaseClient as any;
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
import { ThemeProvider } from './context/ThemeContext';

// IMPORTACIÓN DIFERIDA
const LeadDetailModal = React.lazy(() => import('./components/LeadDetailModal'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const ReportModal = React.lazy(() => import('./components/ReportModal'));
const BulkImportModal = React.lazy(() => import('./components/BulkImportModal'));
const AlertsModal = React.lazy(() => import('./components/AlertsModal'));
const SetupWizard = React.lazy(() => import('./components/SetupWizard'));
const ActivityReportModal = React.lazy(() => import('./components/ActivityReportModal'));
const VocationalTestView = React.lazy(() => import('./components/VocationalTestView'));
import { usePublicRoute } from './hooks/usePublicRoute';

const AppContent: React.FC = () => {
  const { session, profile, loading: authLoading, signOut } = useAuth();
  const { success, error: toastError, info } = useToast();

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
    turnos,
    whatsappTemplates,
    emailTemplates,
    setProfiles,
    setStatuses,
    setSources,
    setLicenciaturas,
    setTurnos,
    setWhatsappTemplates,
    setEmailTemplates,
    updateLocalLead,
    addLocalLead,
    removeLocalLead,
    removeManyLocalLeads,
    refetch,
    dashboardMetrics,
    statusCategories,
    refreshCatalogs,
    checkSetupStatus,
    unreadWhatsAppCount
  } = useCRMData(session, profile?.role, profile?.id);

  const { modals, openModal, closeModal, updateModalData } = useModal(); // [NEW]

  // [REMOVED] Estados de UI locales
  // const [isLeadFormOpen, setLeadFormOpen] = useState(false);
  // ... (all removed)

  // Estado Setup Wizard
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);

  // [NEW] Check Setup Status on Load
  React.useEffect(() => {
    const initCheck = async () => {
      if (profile?.role === 'admin') {
        const completed = await checkSetupStatus();
        if (!completed) setShowSetupWizard(true);
      }
      setCheckingSetup(false);
    };
    if (session && profile && !loadingData) {
      initCheck();
    } else if (!session) {
      setCheckingSetup(false);
    }
  }, [session, profile, loadingData, checkSetupStatus]);

  // [REMOVED] detailInitialTab & selectedLead... (moved to modal data)
  const [automationLead, setAutomationLead] = useState<Lead | null>(null); // Keep locally for now as it's transient before modal logic
  // Actually automationLead IS used for AutomationChoiceModal. I can use modal data for that too.

  const [lastUpdatedLead, setLastUpdatedLead] = useState<Lead | null>(null);

  // [REMOVED] initialEmailTemplateId etc. (Use modal data)


  // [NEW] Event listener global para Notificaciones Push (Campana)
  React.useEffect(() => {
    const handleOpenWhatsAppEvent = async (e: any) => {
      const leadId = e.detail;
      // Fetch the full lead to pass it to the modal
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (data) {
        // Redirigir a la sección de conversación de whats app en la ficha del lead (LeadDetailModal)
        openModal('detailView', { lead: data, initialTab: 'whatsapp' });
      }
    };
    
    window.addEventListener('openWhatsAppFromNotification', handleOpenWhatsAppEvent);
    return () => window.removeEventListener('openWhatsAppFromNotification', handleOpenWhatsAppEvent);
  }, [openModal]);

  const assignableStaff = profiles.filter(p =>
    p.role === 'advisor' || p.role === 'moderator' || p.role === 'admin'
  );
  if (authLoading || checkingSetup) return <LeadListSkeleton />;
  if (!session) return <LoginPage />;

  if (showSetupWizard) {
    return (
      <Suspense fallback={<LeadListSkeleton />}>
        <SetupWizard
          onComplete={() => { setShowSetupWizard(false); refetch(); }}
          currentUser={profile}
        />
      </Suspense>
    );
  }

  // --- MANEJADORES DE UI ---

  // --- MANEJADORES DE UI ---

  const handleAddNew = () => {
    openModal('leadForm', null);
  };

  const handleEdit = (lead: Lead) => {
    openModal('leadForm', lead);
  };

  const handleViewDetails = async (lead: Lead, tab: 'info' | 'activity' | 'appointments' | 'whatsapp' | 'summary' = 'info') => {
    // Optimistic open
    openModal('detailView', { lead, initialTab: tab });

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

    if (error) {
      console.error("Error fetching lead details", error);
    } else {
      // Update with full data
      updateModalData('detailView', { lead: data, initialTab: tab });
    }
  };

  // --- LÓGICA DE AUTOMATIZACIÓN ---

  const checkAndTriggerAutomation = (newStatusId: string, lead: Lead) => {
    const status = statuses.find(s => s.id === newStatusId);
    if (status && status.name.toLowerCase().includes('inscrito')) {
      setTimeout(() => {
        // We can pass data to automationChoice modal directly
        openModal('automationChoice', lead);
        success("¡Inscripción registrada! Elige cómo dar la bienvenida.");
      }, 500);
    }
  };

  const handleAutomationChoice = (channel: 'email' | 'whatsapp') => {
    const lead = modals.automationChoice.data; // Retrieve from modal state
    if (!lead) return;
    closeModal('automationChoice');

    if (channel === 'email') {
      const welcomeTemplate = emailTemplates.find(t => t.name.toLowerCase().includes('bienvenida'));
      // Open Email Modal with data
      openModal('email', { lead, initialTemplateId: welcomeTemplate?.id });
    } else {
      const welcomeTemplate = whatsappTemplates.find(t => t.name.toLowerCase().includes('bienvenida') || t.name.toLowerCase().includes('saludo'));
      // Open WhatsApp Modal with data
      openModal('whatsapp', { lead, initialTemplateId: welcomeTemplate?.id });
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
        .update({ ...leadData } as any)
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
        } as any).select().single();

        if (!historyError && newHistory) {
          const historyWithProfile = { ...newHistory, created_by: profile };
          updatedLead.status_history = [...(updatedLead.status_history || []), historyWithProfile];
        }
        checkAndTriggerAutomation(leadData.status_id, updatedLead);
      }

      updateLocalLead(updatedLead);

      // Sync detail view if open
      if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadIdToEdit) {
        updateModalData('detailView', { ...modals.detailView.data, lead: updatedLead });
      }

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
        } as any).select().single();

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
    closeModal('leadForm');
  };

  const handleUpdateLeadDetails = async (leadId: string, updates: any) => {
    const oldLead = leads.find(l => l.id === leadId);

    const { data: leadData, error } = await supabase
      .from('leads')
      .update(updates as any)
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
      } as any).select().single();

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

    // Sync detail view
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId) {
      updateModalData('detailView', { ...modals.detailView.data, lead: updatedLeadComplete });
    }

    setLastUpdatedLead(updatedLeadComplete as Lead);

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
    } as any).select().single();

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
        // Close detail if open for this lead
        if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId) {
          closeModal('detailView');
        }
      } else {
        updateLocalLead(updated);
        // Sync detail view
        if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId) {
          updateModalData('detailView', { ...modals.detailView.data, lead: updated });
        }
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
    } as any).select().single();

    if (error) { toastError("Error al guardar."); return; }

    // Actualizar si está en memoria
    const l = leads.find(l => l.id === leadId);
    if (l && data) {
      const newFollowUp = { ...data, created_by: profile };
      const up = { ...l, follow_ups: [...(l.follow_ups || []), newFollowUp] };
      updateLocalLead(up);
    }

    // Actualizar el modal de detalles si está abierto
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId && data) {
      const newFollowUp = { ...data, created_by: profile };
      const prevLead = modals.detailView.data.lead;
      const updatedLead = { ...prevLead, follow_ups: [...(prevLead.follow_ups || []), newFollowUp] };
      updateModalData('detailView', { ...modals.detailView.data, lead: updatedLead });
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
    if (error) { toastError("Error al eliminar."); return; }

    const l = leads.find(l => l.id === leadId);
    if (l) {
      const up = { ...l, follow_ups: (l.follow_ups || []).filter(f => f.id !== followUpId) };
      updateLocalLead(up);
    }
    // Sync detail
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId) {
      const prevLead = modals.detailView.data.lead;
      const updatedLead = { ...prevLead, follow_ups: (prevLead.follow_ups || []).filter((f: any) => f.id !== followUpId) };
      updateModalData('detailView', { ...modals.detailView.data, lead: updatedLead });
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
      const { data, error } = await supabase.from('appointments').update(payload as any).eq('id', appointmentIdToEdit).select('*').single();
      if (error) { toastError("Error actualizando."); return; } savedAppointment = data; success("Cita actualizada.");
    } else {
      const { data, error } = await supabase.from('appointments').insert({ ...payload, lead_id: leadId, status: 'scheduled' } as any).select('*').single();
      if (error) { toastError("Error creando cita."); return; } savedAppointment = data; success("Cita programada.");
    }

    if (citadoStatusId) await handleUpdateLeadDetails(leadId, { status_id: citadoStatusId });

    const l = leads.find(l => l.id === leadId);
    if (l && savedAppointment) {
      const oldAppt = l.appointments?.find(a => a.id === savedAppointment.id) || {} as any;

      const apptWithProfile = {
        ...oldAppt, // Keep old props (like status if not returned)
        ...savedAppointment, // Overwrite with new DB data
        status: savedAppointment.status || oldAppt.status || 'scheduled', // [FIX] Robust fallback
        created_by: profile // Ensure profile object is present for UI
      };

      let newApps = l.appointments || [];

      if (appointmentIdToEdit) {
        newApps = newApps.map(a => a.id === appointmentIdToEdit ? apptWithProfile : a);
      } else {
        newApps = [...newApps, apptWithProfile];
      }

      const up = { ...l, appointments: newApps };
      updateLocalLead(up);
    }

    // Sync detail
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId && savedAppointment) {
      const prevLead = modals.detailView.data.lead;
      const oldAppt = prevLead.appointments?.find((a: any) => a.id === savedAppointment.id) || {} as any;
      const apptWithProfile = {
        ...oldAppt,
        ...savedAppointment,
        status: savedAppointment.status || oldAppt.status || 'scheduled',
        created_by: profile
      };

      let newApps = prevLead.appointments || [];
      if (appointmentIdToEdit) newApps = newApps.map((a: any) => a.id === appointmentIdToEdit ? apptWithProfile : a);
      else newApps = [...newApps, apptWithProfile];

      updateModalData('detailView', { ...modals.detailView.data, lead: { ...prevLead, appointments: newApps } });
    }
  };

  const handleUpdateAppointmentStatus = async (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
    const { data, error } = await supabase.from('appointments').update({ status } as any).eq('id', appointmentId).select().single();
    if (error) { toastError("Error actualizando."); return; }

    const l = leads.find(l => l.id === leadId);
    if (l && data) {
      const apptWithProfile = { ...data, created_by: profile };
      const newApps = (l.appointments || []).map(a => a.id === appointmentId ? { ...a, ...apptWithProfile } : a);
      const up = { ...l, appointments: newApps };
      updateLocalLead(up);
    }

    // Sync detail
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId && data) {
      const apptWithProfile = { ...data, created_by: profile };
      const prevLead = modals.detailView.data.lead;
      const newApps = (prevLead.appointments || []).map((a: any) => a.id === appointmentId ? { ...a, ...apptWithProfile } : a);
      updateModalData('detailView', { ...modals.detailView.data, lead: { ...prevLead, appointments: newApps } });
    }

    status === 'completed' ? success("Completada.") : info("Cancelada.");
  };

  const handleDeleteAppointment = async (leadId: string, appointmentId: string) => {
    // [LOGGING] Find appointment details to annotate 'deleted' status
    const l = leads.find(l => l.id === leadId);
    const apptToDelete = l?.appointments?.find(a => a.id === appointmentId);
    const originalDetails = apptToDelete?.details || '';

    // [SOFT DELETE] Update status to 'canceled' instead of deleting
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'canceled',
        details: `${originalDetails} [Eliminada por usuario]`
      } as any)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) { toastError("Error eliminando."); return; }

    const profilePart = { created_by: profile };
    const updatedAppt = { ...data, ...profilePart };

    if (l) {
      // Update local state: Replace the appointment with the canceled version
      const newApps = (l.appointments || []).map(a => a.id === appointmentId ? { ...a, ...updatedAppt } : a);
      const up = { ...l, appointments: newApps };
      updateLocalLead(up);
    }

    // Sync detail
    if (modals.detailView.isOpen && modals.detailView.data?.lead?.id === leadId) {
      const prevLead = modals.detailView.data.lead;
      const newApps = (prevLead.appointments || []).map((a: any) => a.id === appointmentId ? { ...a, ...updatedAppt } : a);
      updateModalData('detailView', { ...modals.detailView.data, lead: { ...prevLead, appointments: newApps } });
    }

    success("Cita eliminada (movida a historial).");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300">
      <Header onOpenSettings={() => { openModal('settings'); setClearSelectionSignal(p => p + 1); }} userProfile={profile} onLogout={signOut} unreadWhatsAppCount={unreadWhatsAppCount} />
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
          sources={sources}
          whatsappTemplates={whatsappTemplates}
          emailTemplates={emailTemplates}

          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onOpenReports={() => { openModal('report'); setClearSelectionSignal(p => p + 1); }}
          onOpenImport={() => { openModal('bulkImport'); setClearSelectionSignal(p => p + 1); }}
          onOpenWhatsApp={(lead) => {
            // Retrieve template if needed or just open default
            openModal('whatsapp', { lead });
          }}
          onOpenEmail={(lead) => {
            openModal('email', { lead });
          }}
          onUpdateLead={handleUpdateLeadDetails}
          userRole={profile?.role}
          currentUser={profile}
          onRefresh={refetch}
          onLocalDeleteMany={removeManyLocalLeads}
          metrics={dashboardMetrics}
          lastUpdatedLead={lastUpdatedLead}
          statusCategories={statusCategories}
          onRefreshCatalogs={refetch}
          clearSelectionSignal={clearSelectionSignal}
          onOpenActivity={() => openModal('activityReport')}
        />
      </main>

      {/* MODALES */}
      <AutomationChoiceModal
        isOpen={modals.automationChoice.isOpen}
        onClose={() => closeModal('automationChoice')}
        lead={modals.automationChoice.data}
        onSelect={handleAutomationChoice}
      />

      {modals.leadForm.isOpen && (
        <LeadFormModal
          isOpen={modals.leadForm.isOpen}
          onClose={() => closeModal('leadForm')}
          onSave={(leadData, leadId) => handleSaveLead(leadData, leadId)}
          leadToEdit={modals.leadForm.data} // Passing data directly
          advisors={assignableStaff}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          turnos={turnos}
          currentUser={profile}
        />
      )}

      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-secondary"></div></div>}>

        {modals.detailView.isOpen && modals.detailView.data?.lead && (
          <LeadDetailModal
            isOpen={modals.detailView.isOpen}
            onClose={() => closeModal('detailView')}
            lead={modals.detailView.data.lead}
            advisors={assignableStaff}
            statuses={statuses}
            sources={sources}
            licenciaturas={licenciaturas}
            turnos={turnos}
            whatsappTemplates={whatsappTemplates}
            onAddFollowUp={handleAddFollowUp}
            onDeleteFollowUp={handleDeleteFollowUp}
            onUpdateLead={handleUpdateLeadDetails}
            onSaveAppointment={handleSaveAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onTransferLead={handleTransferLead}
            currentUser={profile}
            initialTab={modals.detailView.data.initialTab || 'info'}
            onOpenWhatsApp={(lead) => {
              openModal('whatsapp', { lead });
            }}
            onOpenEmail={(lead) => {
              openModal('email', { lead });
            }}
          />
        )}

        {modals.settings.isOpen && (
          <SettingsModal
            isOpen={modals.settings.isOpen}
            onClose={() => closeModal('settings')}
            profiles={profiles}
            statuses={statuses}
            sources={sources}
            licenciaturas={licenciaturas}
            turnos={turnos}
            whatsappTemplates={whatsappTemplates}
            emailTemplates={emailTemplates}
            currentUserProfile={profile}
            onProfilesUpdate={setProfiles}
            onStatusesUpdate={setStatuses}
            onSourcesUpdate={setSources}
            onLicenciaturasUpdate={setLicenciaturas}
            onTurnosUpdate={setTurnos}
            onWhatsappTemplatesUpdate={setWhatsappTemplates}
            onEmailTemplatesUpdate={setEmailTemplates}
          />
        )}

        {modals.report.isOpen && (
          <ReportModal
            isOpen={modals.report.isOpen}
            onClose={() => closeModal('report')}
            leads={leads}
            statuses={statuses}
            advisors={assignableStaff}
            sources={sources}
          />
        )}

        {modals.bulkImport.isOpen && (
          <BulkImportModal
            isOpen={modals.bulkImport.isOpen}
            onClose={() => closeModal('bulkImport')}
            onSuccess={() => { refetch(); closeModal('bulkImport'); }}
            advisors={assignableStaff}
            statuses={statuses}
            sources={sources}
            licenciaturas={licenciaturas}
          />
        )}

        {modals.activityReport.isOpen && (
          <ActivityReportModal
            isOpen={modals.activityReport.isOpen}
            onClose={() => closeModal('activityReport')}
            currentUser={profile}
            advisors={assignableStaff}
            statuses={statuses}
          />
        )}
      </Suspense>

      {/* MODALES INDIVIDUALES ACTUALIZADOS */}
      {modals.whatsapp.isOpen && modals.whatsapp.data?.lead && (
        <WhatsAppModal
          isOpen={modals.whatsapp.isOpen}
          onClose={() => closeModal('whatsapp')}
          lead={modals.whatsapp.data.lead}
          templates={whatsappTemplates}
          licenciaturas={licenciaturas}
          initialTemplateId={modals.whatsapp.data.initialTemplateId}
          onMessageSent={handleMessageSent}
        />
      )}

      {modals.email.isOpen && modals.email.data?.lead && (
        <EmailModal
          isOpen={modals.email.isOpen}
          onClose={() => closeModal('email')}
          lead={modals.email.data.lead}
          templates={emailTemplates}
          licenciaturas={licenciaturas}
          initialTemplateId={modals.email.data.initialTemplateId}
          onMessageSent={handleMessageSent}
          currentUser={profile}
        />
      )}

      {/* ALERTS MODAL (New) */}
      <AlertsModal userProfile={profile} />
    </div>
  );
};

import { ConfigProvider } from './context/ConfigContext';

import { ModalProvider, useModal } from './context/ModalContext'; // [NEW]

// ... imports

const App: React.FC = () => {
  const { isTestRoute, testToken } = usePublicRoute();

  if (isTestRoute && testToken) {
    return (
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
          }>
            <VocationalTestView token={testToken} />
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <ConfigProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <ToastProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;