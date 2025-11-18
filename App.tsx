
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
import { Lead, Profile, Status, Source, Appointment, FollowUp, Licenciatura, StatusChange, WhatsAppTemplate } from './types';
import LoginPage from './components/auth/LoginPage';
import LeadListSkeleton from './components/LeadListSkeleton';

const AppContent: React.FC = () => {
  const { session, profile, loading: authLoading, signOut } = useAuth();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);

  const [isLeadFormOpen, setLeadFormOpen] = useState(false);
  const [isDetailViewOpen, setDetailViewOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [
        { data: leadsData, error: leadsError },
        { data: profilesData, error: profilesError },
        { data: statusesData, error: statusesError },
        { data: sourcesData, error: sourcesError },
        { data: licenciaturasData, error: licenciaturasError },
        { data: templatesData, error: templatesError },
      ] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('statuses').select('*'),
        supabase.from('sources').select('*'),
        supabase.from('licenciaturas').select('*'),
        supabase.from('whatsapp_templates').select('*')
      ]);

      if (leadsError) throw leadsError;
      if (profilesError) throw profilesError;
      if (statusesError) throw statusesError;
      if (sourcesError) throw sourcesError;
      if (licenciaturasError) throw licenciaturasError;
      if (templatesError) throw templatesError;

      setLeads(leadsData || []);
      setProfiles(profilesData || []);
      setStatuses(statusesData || []);
      setSources(sourcesData || []);
      setLicenciaturas(licenciaturasData || []);
      setWhatsappTemplates(templatesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      // Here you could add a toast notification for the user
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    } else {
      setLoadingData(false);
    }
  }, [session]);

  if (authLoading) {
    return <LeadListSkeleton />;
  }

  if (!session) {
    return <LoginPage />;
  }

  const handleAddNew = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  const handleViewDetails = async (lead: Lead) => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('leads')
      .select(`*, follow_ups(*), appointments(*), status_history(*)`)
      .eq('id', lead.id)
      .single();
    
    if(error) {
      console.error("Error fetching lead details", error);
      setLoadingData(false);
      return;
    }

    setSelectedLead(data);
    setDetailViewOpen(true);
    setLoadingData(false);
  };

  const handleDelete = async (leadId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
       const { error } = await supabase.from('leads').delete().eq('id', leadId);
       if (error) {
         console.error('Error deleting lead:', error);
       } else {
         setLeads(leads.filter(lead => lead.id !== leadId));
       }
    }
  };
  
  const handleSaveLead = async (lead: Omit<Lead, 'id' | 'registration_date' | 'status_history'>, leadIdToEdit?: string) => {
    if (leadIdToEdit) { // Editing
      const oldLead = leads.find(l => l.id === leadIdToEdit);
      if (!oldLead) return;

      const { data, error } = await supabase
        .from('leads')
        .update({ ...lead })
        .eq('id', leadIdToEdit)
        .select()
        .single();
      
      if (error) { console.error('Error updating lead:', error); return; }

      // Handle status change history
      if (oldLead.status_id !== lead.status_id) {
        await supabase.from('status_history').insert({
          old_status_id: oldLead.status_id,
          new_status_id: lead.status_id,
          lead_id: leadIdToEdit,
          date: new Date().toISOString()
        });
      }

      setLeads(leads.map(l => l.id === leadIdToEdit ? data : l));

    } else { // Creating
      const newLeadPayload = {
        ...lead,
        registration_date: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('leads').insert(newLeadPayload).select().single();
      if (error) { console.error('Error creating lead:', error); return; }
      
      if (data) {
        await supabase.from('status_history').insert({
            old_status_id: null,
            new_status_id: lead.status_id,
            lead_id: data.id,
            date: new Date().toISOString()
        });

        setLeads([...leads, data]);
      }
    }
    setLeadFormOpen(false);
  };

  const handleUpdateLeadDetails = async (leadId: string, updates: Partial<Pick<Lead, 'advisor_id' | 'status_id'>>) => {
    const oldLead = leads.find(l => l.id === leadId);
    if (!oldLead) {
        console.error("No se encontró el lead original para actualizar.");
        return;
    }

    const updatePayload: any = {};
    if (updates.advisor_id !== undefined) updatePayload.advisor_id = updates.advisor_id;
    if (updates.status_id !== undefined) updatePayload.status_id = updates.status_id;

    // Ensure we are using a direct update query, NOT an RPC call, to avoid object errors.
    const { data: updatedLeadData, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .select()
        .single();

    if (error) {
        console.error("Error al actualizar detalles del lead:", error);
        // Safe error alerting to avoid [object Object]
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        alert(`Error al actualizar: ${errorMessage}`);
        return;
    }
    
    if (!updatedLeadData) {
        console.error("Error: No se recibieron datos actualizados del lead.");
        return;
    }

    // Registrar el cambio de estado si ocurrió
    if (updates.status_id && updates.status_id !== oldLead.status_id) {
        const { error: historyError } = await supabase.from('status_history').insert({
            old_status_id: oldLead.status_id,
            new_status_id: updates.status_id,
            lead_id: leadId,
            date: new Date().toISOString()
        });
        if(historyError) console.error("Error creating history", historyError);
    }

    // Actualizar el estado local con los datos devueltos por la función
    const newLeads = leads.map(l => l.id === leadId ? updatedLeadData : l);
    setLeads(newLeads);

    // Si el lead detallado es el que se actualizó, recargamos sus detalles completos
    if (selectedLead?.id === leadId) {
        const leadForRefetch = newLeads.find(l => l.id === leadId);
        if (leadForRefetch) {
            await handleViewDetails(leadForRefetch);
        }
    }
  };

  const handleAddFollowUp = async (leadId: string, followUp: Omit<FollowUp, 'id' | 'lead_id'>) => {
    const { data, error } = await supabase.from('follow_ups').insert({ ...followUp, lead_id: leadId }).select().single();
    if(error) { console.error("Error adding followup", error); return; }
    
    if(selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, follow_ups: [...(selectedLead.follow_ups || []), data!] });
    }
  };

  const handleDeleteFollowUp = async (leadId: string, followUpId: string) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId);
    if(error) { console.error("Error deleting followup", error); return; }

    if(selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, follow_ups: (selectedLead.follow_ups || []).filter(f => f.id !== followUpId) });
    }
  };
  
   const handleSaveAppointment = async (leadId: string, appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id'>, appointmentIdToEdit?: string) => {
    const citadoStatusId = statuses.find(s => s.name === 'Con Cita')?.id;
    let newAppointmentData;

    if (appointmentIdToEdit) {
      const { data, error } = await supabase.from('appointments').update(appointmentData).eq('id', appointmentIdToEdit).select().single();
      if(error) { console.error("Error updating appointment", error); return; }
      newAppointmentData = data;
    } else {
      const { data, error } = await supabase.from('appointments').insert({ ...appointmentData, lead_id: leadId, status: 'scheduled' }).select().single();
      if(error) { console.error("Error adding appointment", error); return; }
      newAppointmentData = data;
    }

    if (citadoStatusId) {
      await handleUpdateLeadDetails(leadId, { status_id: citadoStatusId });
    }

    await handleViewDetails(leads.find(l => l.id === leadId)!); // Refresh details
  };

  const handleUpdateAppointmentStatus = async (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
      await supabase.from('appointments').update({ status }).eq('id', appointmentId);
      await handleViewDetails(leads.find(l => l.id === leadId)!); // Refresh details
  };

  const handleDeleteAppointment = async (leadId: string, appointmentId: string) => {
      await supabase.from('appointments').delete().eq('id', appointmentId);
      await handleViewDetails(leads.find(l => l.id === leadId)!); // Refresh details
  };
  
  const handleOpenWhatsApp = (lead: Lead) => {
      setSelectedLeadForWhatsApp(lead);
      setWhatsAppModalOpen(true);
  }

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
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      </main>

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
          currentUserProfile={profile}
          onProfilesUpdate={(updated) => setProfiles(updated)}
          onStatusesUpdate={(updated) => setStatuses(updated)}
          onSourcesUpdate={(updated) => setSources(updated)}
          onLicenciaturasUpdate={(updated) => setLicenciaturas(updated)}
          onWhatsappTemplatesUpdate={(updated) => setWhatsappTemplates(updated)}
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

      {isWhatsAppModalOpen && (
          <WhatsAppModal 
            isOpen={isWhatsAppModalOpen} 
            onClose={() => setWhatsAppModalOpen(false)} 
            lead={selectedLeadForWhatsApp} 
            templates={whatsappTemplates} 
          />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
