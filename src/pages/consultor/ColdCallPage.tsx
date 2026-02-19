import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ColdCallLead, ColdCallLog, ColdCallStage, ColdCallResult, CrmLead } from '@/types';
import { Plus, Search, PhoneCall, MessageSquare, CalendarCheck, Loader2, Edit2, Trash2, Play, StopCircle, Clock, UserRound, TrendingUp, BarChart3, Percent, ChevronRight, Save, History } from 'lucide-react'; // Adicionado History icon
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ColdCallLogModal } from '@/components/consultor/ColdCallLogModal';
import { ColdCallLeadHistoryModal } from '@/components/consultor/ColdCallLeadHistoryModal'; // NOVO: Importar o modal de histórico
// Removido: import LeadModal from '@/components/crm/LeadModal'; // Importar LeadModal

const COLD_CALL_STAGES: ColdCallStage[] = ['Base Fria', 'Tentativa de Contato', 'Conversou', 'Reunião Agendada'];
const COLD_CALL_RESULTS: ColdCallResult[] = ['Não atendeu', 'Número inválido', 'Sem interesse', 'Pedir retorno', 'Conversou', 'Agendar Reunião'];
const MEETING_MODALITIES = ['Online', 'Presencial', 'Telefone'];

const ColdCallPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    coldCallLeads, 
    coldCallLogs, 
    addColdCallLead, 
    updateColdCallLead, 
    deleteColdCallLead, 
    addColdCallLog, 
    getColdCallMetrics,
    crmFields, // Adicionar crmFields
    crmStages, // Adicionar crmStages
    crmPipelines, // Adicionar crmPipelines
    createCrmLeadFromColdCall, // NOVO: Importar a função do AppContext
    isDataLoading 
  } = useApp();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<ColdCallStage | 'all'>('all');

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ColdCallLead | null>(null);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [isSavingLead, setIsSavingLead] = useState(false);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [loggingLead, setLoggingLead] = useState<ColdCallLead | null>(null);
  
  // NOVO: Estados para o modal de histórico
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [viewingLeadHistory, setViewingLeadHistory] = useState<ColdCallLead | null>(null);

  // Removido: isCrmLeadModalOpen e onCrmLeadSaved

  const filteredLeads = useMemo(() => {
    let currentLeads = coldCallLeads.filter(lead => lead.user_id === user?.id);

    if (filterStage !== 'all') {
      currentLeads = currentLeads.filter(lead => lead.current_stage === filterStage);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentLeads = currentLeads.filter(lead =>
        lead.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        lead.phone.toLowerCase().includes(lowerCaseSearchTerm) ||
        (lead.email && lead.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (lead.notes && lead.notes.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // Adicionar o último resultado da ligação e a data ao objeto do lead
    const leadsWithLastCallInfo = currentLeads.map(lead => {
      const lastLog = coldCallLogs
        .filter(log => log.cold_call_lead_id === lead.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      return {
        ...lead,
        lastCallResult: lastLog ? lastLog.result : 'N/A',
        lastCallDate: lastLog ? new Date(lastLog.created_at).toLocaleDateString('pt-BR') : 'N/A',
      };
    });

    return leadsWithLastCallInfo.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [coldCallLeads, coldCallLogs, user, filterStage, searchTerm]);

  const metrics = useMemo(() => {
    if (!user) return { totalCalls: 0, totalConversations: 0, totalMeetingsScheduled: 0, conversationToMeetingRate: 0 };
    return getColdCallMetrics(user.id);
  }, [user, getColdCallMetrics]);

  const handleOpenLeadModal = (lead: ColdCallLead | null) => {
    setEditingLead(lead);
    if (lead) {
      setNewLeadName(lead.name);
      setNewLeadPhone(lead.phone);
      setNewLeadEmail(lead.email || '');
      setNewLeadNotes(lead.notes || '');
    } else {
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadNotes('');
    }
    setIsLeadModalOpen(true);
  };

  const handleSaveLead = async () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      toast.error("Nome e Telefone são obrigatórios.");
      return;
    }
    setIsSavingLead(true);
    try {
      const leadData = {
        name: newLeadName.trim(),
        phone: newLeadPhone.trim(),
        email: newLeadEmail.trim() || undefined,
        notes: newLeadNotes.trim() || undefined,
      };
      if (editingLead) {
        await updateColdCallLead(editingLead.id, leadData);
        toast.success("Prospect de Cold Call atualizado!");
      } else {
        await addColdCallLead(leadData);
        toast.success("Novo Lead de Cold Call adicionado!");
      }
      setIsLeadModalOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar lead: ${error.message}`);
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lead "${leadName}"?`)) return;
    try {
      await deleteColdCallLead(leadId);
      toast.success("Lead de Cold Call excluído!");
    } catch (error: any) {
      toast.error(`Erro ao excluir lead: ${error.message}`);
    }
  };

  const handleStartCall = (lead: ColdCallLead) => {
    setLoggingLead(lead);
    setIsLogModalOpen(true);
  };

  // NOVO: Handler para abrir o modal de histórico
  const handleOpenHistoryModal = (lead: ColdCallLead) => {
    setViewingLeadHistory(lead);
    setIsHistoryModalOpen(true);
  };

  // NOVO: Handler para criar Lead no CRM (chamado do ColdCallLogModal)
  const handleCreateCrmLeadFromColdCall = useCallback(async (coldCallLead: ColdCallLead) => {
    try {
      const { crmLeadId } = await createCrmLeadFromColdCall(coldCallLead.id);
      toast.success((t) => (
        <div className="flex flex-col items-center">
          <p className="font-bold text-lg">Lead criado no CRM!</p>
          <p className="text-sm">Você pode editá-lo na página do CRM.</p>
          <Button
            onClick={() => {
              toast.dismiss(t.id);
              // NAVEGAÇÃO SIMPLIFICADA: Apenas vai para a página do CRM, sem highlightLeadId
              navigate('/consultor/crm'); 
            }}
            className="mt-3 bg-brand-600 hover:bg-brand-700 text-white text-sm py-1.5 px-3"
          >
            Ir para CRM <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      ), { duration: 5000 });
    } catch (error: any) {
      toast.error(`Erro ao criar Lead no CRM: ${error.message}`);
      console.error("Erro ao criar Lead no CRM:", error);
    }
  }, [createCrmLeadFromColdCall, navigate]);


  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Módulo Cold Call</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie suas ligações frias e agende reuniões.</p>
        </div>
        <button onClick={() => handleOpenLeadModal(null)} className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          <span>Novo Prospect</span>
        </button>
      </div>

      {/* Dashboard de Performance */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-brand-500" /> Performance Cold Call
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">Total de Ligações</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics.totalCalls}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-700 dark:text-purple-300">Total de Conversas</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{metrics.totalConversations}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">Reuniões Agendadas</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{metrics.totalMeetingsScheduled}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Taxa Conversa → Reunião</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{metrics.conversationToMeetingRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Lista de Leads de Cold Call */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meus Prospects ({filteredLeads.length})</h2>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar prospect..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48 flex-shrink-0">
              <Select value={filterStage} onValueChange={(value: ColdCallStage | 'all') => setFilterStage(value)}>
                <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Filtrar por Etapa" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                  <SelectItem value="all">Todas as Etapas</SelectItem>
                  {COLD_CALL_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Contato</th>
                <th className="px-6 py-3">Etapa Atual</th>
                <th className="px-6 py-3">Último Resultado</th>
                <th className="px-6 py-3">Última Atualização</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Nenhum prospect de Cold Call encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{lead.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <PhoneCall className="w-3 h-3 text-gray-400" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center space-x-2 mt-1">
                          <MessageSquare className="w-3 h-3 text-gray-400" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.current_stage === 'Reunião Agendada' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        lead.current_stage === 'Conversou' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        lead.current_stage === 'Tentativa de Contato' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                      }`}>
                        {lead.current_stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{lead.lastCallResult}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{lead.lastCallDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{new Date(lead.updated_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => handleStartCall(lead)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full" title="Iniciar Ligação">
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenLeadModal(lead)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full" title="Editar Lead">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenHistoryModal(lead)} className="p-2 text-gray-400 hover:text-purple-500 rounded-full" title="Ver Histórico">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLead(lead.id, lead.name)} className="p-2 text-gray-400 hover:text-red-500 rounded-full" title="Excluir Lead">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Modal */}
      <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Prospect' : 'Novo Prospect'}</DialogTitle>
            <DialogDescription>
              {editingLead ? `Edite as informações de ${editingLead.name}.` : 'Adicione um novo prospect para Cold Call.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveLead(); }}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="email">E-mail (Opcional)</Label>
                <Input id="email" type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="notes">Observações (Opcional)</Label>
                <Textarea id="notes" value={newLeadNotes} onChange={(e) => setNewLeadNotes(e.target.value)} rows={3} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLeadModalOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
              <Button type="submit" disabled={isSavingLead} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSavingLead ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Call Modal */}
      {isLogModalOpen && loggingLead && (
        <ColdCallLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          lead={loggingLead}
          onSaveLog={addColdCallLog}
          onUpdateLeadStage={updateColdCallLead}
          onCreateCrmLeadFromColdCall={handleCreateCrmLeadFromColdCall} // NOVO: Passa o handler local
        />
      )}

      {/* NOVO: Cold Call Lead History Modal */}
      {isHistoryModalOpen && viewingLeadHistory && (
        <ColdCallLeadHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          lead={viewingLeadHistory}
          logs={coldCallLogs.filter(log => log.cold_call_lead_id === viewingLeadHistory.id)}
        />
      )}
    </div>
  );
};

export default ColdCallPage;