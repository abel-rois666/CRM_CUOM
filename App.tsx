
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import LeadList from './components/LeadList';
import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';
import SettingsModal from './components/SettingsModal';
import ReportModal from './components/ReportModal';
import WhatsAppModal from './components/WhatsAppModal';
import { Lead, Profile, Status, Source, Appointment, FollowUp, Licenciatura, WhatsAppTemplate } from './types';
import LoginPage from './components/auth/LoginPage';
import LeadListSkeleton from './components/LeadListSkeleton';
import { ToastProvider, useToast } from './context/ToastContext';
import { useCatalogs } from './hooks/useCatalogs';
import { useLeads, useDashboardStats } from './hooks/useLeads';
import { FilterState } from './components/FilterDrawer';
import { QuickFilterType } from './components/DashboardStats';

const AppContent: React.FC = () => {
  const { session, profile, loading: authLoading, signOut } = useAuth();
  const { success, error: toastError, info } = useToast();

  // --- Global App State for Server-Side Queries ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    advisorId: 'all',
    statusId: 'all',
    programId: 'all',
    startDate: '',
    endDate: ''
  });
  const [sortColumn, setSortColumn] = useState('registration_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  
  // --- Data Fetching Hooks ---
  const { data: catalogs, isLoading: loadingCatalogs, refetch: refetchCatalogs } = useCatalogs();
  
  const { 
    data: leadsData, 
    isLoading: loadingLeads, 
    refetch: refetchLeads 
  } = useLeads({
    page: currentPage,
    pageSize: itemsPerPage,
    filters,
    searchTerm,
    sortColumn,
    sortDirection,
    quickFilter
  });
  
  const { data: dashboardStats, isLoading: loadingStats, refetch: refetchStats } = useDashboardStats();

  // --- UI State ---
  const [isLeadFormOpen, setLeadFormOpen] = useState(false);
  const [isDetailViewOpen, setDetailViewOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);

  const handleRefetchAll = () => {
    refetchLeads();
    refetchStats();
  };

  // --- Handlers ---

  const handleAddNew = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  const handleViewDetails = async (lead: Lead) => {
      // Fetch full details for the selected lead specifically to ensure we have relations
      // Although Server Side Pagination fetches relations, it's safer to fetch fresh single record
    const { data, error } = await supabase
      .from('leads')
      .select(`*, follow_ups(*), appointments(*), status_history(*)`)
      .eq('id', lead.id)
      .single();
    
    if(error) {
      console.error("Error fetching lead details", error);
      toastError("No se pudieron cargar los detalles del lead.");
      return;
    }

    setSelectedLead(data);
    setDetailViewOpen(true);
  };

  const handleDelete = async (leadId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
       const { error } = await supabase.from('leads').delete().eq('id', leadId);
       if (error) {
         console.error('Error deleting lead:', error);
         toastError("Error al eliminar el lead.");
       } else {
         handleRefetchAll();
         success("Lead eliminado correctamente.");
       }
    }
  };
  
  const handleSaveLead = async (lead: Omit<Lead, 'id' | 'registration_date' | 'status_history'>, leadIdToEdit?: string) => {
    if (leadIdToEdit) { // Editing
      const { data, error } = await supabase
        .from('leads')
        .update({ ...lead })
        .eq('id', leadIdToEdit)
        .select()
        .single();
      
      if (error) { 
        console.error('Error updating lead:', error); 
        toastError("Error al actualizar el lead.");
        return; 
      }

      // Optimistic update or Refetch
      // For simplicity with server-side logic, we refetch.
      // Also check if status changed for history (omitted for brevity but should be in database trigger ideally)
      // But current app does it client side:
      if (selectedLead && selectedLead.status_id !== lead.status_id) {
         await supabase.from('status_history').insert({
          old_status_id: selectedLead.status_id,
          new_status_id: lead.status_id,
          lead_id: leadIdToEdit,
          date: new Date().toISOString()
        });
      }

      handleRefetchAll();
      success("Lead actualizado exitosamente.");

    } else { // Creating
      const newLeadPayload = {
        ...lead,
        registration_date: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('leads').insert(newLeadPayload).select().single();
      if (error) { 
        console.error('Error creating lead:', error); 
        toastError("Error al crear el lead.");
        return; 
      }
      
      if (data) {
        await supabase.from('status_history').insert({
            old_status_id: null,
            new_status_id: lead.status_id,
            lead_id: data.id,
            date: new Date().toISOString()
        });

        handleRefetchAll();
        success("Lead creado exitosamente.");
      }
    }
    setLeadFormOpen(false);
  };

  const handleUpdateLeadDetails = async (leadId: string, updates: Partial<Pick<Lead, 'advisor_id' | 'status_id'>>) => {
    // Need to know old status for history if not in detail view
    // We can fetch it or rely on the lead object in the list (which is from the hook)
    const targetLead = leadsData?.leads.find(l => l.id === leadId);
    
    const updatePayload: any = {};
    if (updates.advisor_id !== undefined) updatePayload.advisor_id = updates.advisor_id;
    if (updates.status_id !== undefined) updatePayload.status_id = updates.status_id;

    const { data: updatedLeadData, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .select()
        .single();

    if (error) {
        console.error("Error al actualizar detalles del lead:", error);
        toastError(`Error al actualizar: ${error.message}`);
        return;
    }
    
    // Registrar el cambio de estado si ocurrió
    if (targetLead && updates.status_id && updates.status_id !== targetLead.status_id) {
        const { error: historyError } = await supabase.from('status_history').insert({
            old_status_id: targetLead.status_id,
            new_status_id: updates.status_id,
            lead_id: leadId,
            date: new Date().toISOString()
        });
        if(historyError) console.error("Error creating history", historyError);
    }

    handleRefetchAll();
    
    // If currently viewing details of this lead, refresh the detail view too
    if (selectedLead?.id === leadId) {
       await handleViewDetails(updatedLeadData);
    }
  };

  const handleAddFollowUp = async (leadId: string, followUp: Omit<FollowUp, 'id' | 'lead_id'>) => {
    const { data, error } = await supabase.from('follow_ups').insert({ ...followUp, lead_id: leadId }).select().single();
    if(error) { 
      console.error("Error adding followup", error); 
      toastError("Error al guardar el seguimiento.");
      return; 
    }
    
    if(selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, follow_ups: [...(selectedLead.follow_ups || []), data!] });
      success("Seguimiento añadido.");
      handleRefetchAll(); // To update dashboard stats
    }
  };

  const handleDeleteFollowUp = async (leadId: string, followUpId: string) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId);
    if(error) { 
      console.error("Error deleting followup", error); 
      toastError("Error al eliminar el seguimiento.");
      return; 
    }

    if(selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, follow_ups: (selectedLead.follow_ups || []).filter(f => f.id !== followUpId) });
      success("Seguimiento eliminado.");
      handleRefetchAll();
    }
  };
  
   const handleSaveAppointment = async (leadId: string, appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id'>, appointmentIdToEdit?: string) => {
    const citadoStatusId = catalogs?.statuses.find(s => s.name === 'Con Cita')?.id;

    if (appointmentIdToEdit) {
      const { error } = await supabase.from('appointments').update(appointmentData).eq('id', appointmentIdToEdit).select().single();
      if(error) { 
        console.error("Error updating appointment", error); 
        toastError("Error al actualizar la cita.");
        return; 
      }
      success("Cita actualizada.");
    } else {
      const { error } = await supabase.from('appointments').insert({ ...appointmentData, lead_id: leadId, status: 'scheduled' }).select().single();
      if(error) { 
        console.error("Error adding appointment", error); 
        toastError("Error al programar la cita.");
        return; 
      }
      success("Cita programada exitosamente.");
    }

    if (citadoStatusId) {
      await handleUpdateLeadDetails(leadId, { status_id: citadoStatusId });
    }

    if (selectedLead) {
        await handleViewDetails(selectedLead);
    }
    handleRefetchAll();
  };

  const handleUpdateAppointmentStatus = async (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', appointmentId);
      if (error) {
        toastError("Error al actualizar el estado de la cita.");
        return;
      }
      if (selectedLead) await handleViewDetails(selectedLead);
      if (status === 'completed') success("Cita marcada como completada.");
      if (status === 'canceled') info("Cita cancelada.");
      handleRefetchAll();
  };

  const handleDeleteAppointment = async (leadId: string, appointmentId: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) {
        toastError("Error al eliminar la cita.");
        return;
      }
      if (selectedLead) await handleViewDetails(selectedLead);
      success("Cita eliminada.");
      handleRefetchAll();
  };
  
  const handleOpenWhatsApp = (lead: Lead) => {
      setSelectedLeadForWhatsApp(lead);
      setWhatsAppModalOpen(true);
  }
  
  // --- Catalog Updates Handlers for Settings ---
  const handleCatalogsUpdate = () => {
      refetchCatalogs();
  }

  if (authLoading) {
    return <LeadListSkeleton />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} userProfile={profile} onLogout={signOut} />
      <main>
        <LeadList
          loading={loadingLeads || loadingCatalogs}
          leads={leadsData?.leads || []}
          totalCount={leadsData?.count || 0}
          dashboardStats={dashboardStats}
          dashboardLoading={loadingStats}
          
          advisors={(catalogs?.profiles || []).filter(p => p.role === 'advisor')}
          statuses={catalogs?.statuses || []}
          licenciaturas={catalogs?.licenciaturas || []}
          
          // State Props
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          searchTerm={searchTerm}
          filters={filters}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          quickFilter={quickFilter}

          // Handlers
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          onSearchChange={(term) => { setSearchTerm(term); setCurrentPage(1); }}
          onFiltersChange={(newFilters) => { setFilters(newFilters); setCurrentPage(1); }}
          onSortChange={(col) => { 
              if(col === sortColumn) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              else { setSortColumn(col); setSortDirection('asc'); }
          }}
          onQuickFilterChange={(filter) => { setQuickFilter(filter); setCurrentPage(1); }}

          // Actions
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onOpenReports={() => setReportModalOpen(true)}
          onOpenWhatsApp={handleOpenWhatsApp}
          onUpdateLead={handleUpdateLeadDetails}
        />
      </main>

      {isLeadFormOpen && (
        <LeadFormModal
          isOpen={isLeadFormOpen}
          onClose={() => setLeadFormOpen(false)}
          onSave={(leadData, leadId) => handleSaveLead(leadData, leadId)}
          leadToEdit={selectedLead}
          advisors={(catalogs?.profiles || []).filter(p => p.role === 'advisor')}
          statuses={catalogs?.statuses || []}
          sources={catalogs?.sources || []}
          licenciaturas={catalogs?.licenciaturas || []}
          currentUser={profile}
        />
      )}

      {isDetailViewOpen && selectedLead && (
        <LeadDetailModal
          isOpen={isDetailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          lead={selectedLead}
          advisors={(catalogs?.profiles || []).filter(p => p.role === 'advisor')}
          statuses={catalogs?.statuses || []}
          sources={catalogs?.sources || []}
          licenciaturas={catalogs?.licenciaturas || []}
          onAddFollowUp={handleAddFollowUp}
          onDeleteFollowUp={handleDeleteFollowUp}
          onUpdateLead={handleUpdateLeadDetails}
          onSaveAppointment={handleSaveAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          currentUser={profile}
        />
      )}
      
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          profiles={catalogs?.profiles || []}
          statuses={catalogs?.statuses || []}
          sources={catalogs?.sources || []}
          licenciaturas={catalogs?.licenciaturas || []}
          whatsappTemplates={catalogs?.whatsappTemplates || []}
          currentUserProfile={profile}
          onProfilesUpdate={handleCatalogsUpdate}
          onStatusesUpdate={handleCatalogsUpdate}
          onSourcesUpdate={handleCatalogsUpdate}
          onLicenciaturasUpdate={handleCatalogsUpdate}
          onWhatsappTemplatesUpdate={handleCatalogsUpdate}
        />
      )}

      {isReportModalOpen && (
        <ReportModal 
            isOpen={isReportModalOpen}
            onClose={() => setReportModalOpen(false)}
            leads={leadsData?.leads || []} // Note: Reports will currently only reflect current page leads. Ideally needs a dedicated full fetch for reports.
            statuses={catalogs?.statuses || []}
            advisors={(catalogs?.profiles || []).filter(p => p.role === 'advisor')}
            sources={catalogs?.sources || []}
        />
      )}

      {isWhatsAppModalOpen && (
          <WhatsAppModal 
            isOpen={isWhatsAppModalOpen} 
            onClose={() => setWhatsAppModalOpen(false)} 
            lead={selectedLeadForWhatsApp} 
            templates={catalogs?.whatsappTemplates || []} 
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
