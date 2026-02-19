import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ColdCallLead, ColdCallLog, ColdCallStage, ColdCallResult } from '@/types';
import { Plus, Search, PhoneCall, MessageSquare, CalendarCheck, Loader2, Edit2, Trash2, Play, StopCircle, Clock, UserRound, TrendingUp, BarChart3, Percent, ChevronRight, Save } from 'lucide-react';
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
    createCrmLeadFromColdCall,
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
  const [callStartTime, setCallStartTime] = useState<string | null>(null);
  const [callEndTime, setCallEndTime] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<ColdCallResult | ''>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingModality, setMeetingModality] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logError, setLogError] = useState('');

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
    return currentLeads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [coldCallLeads, user, filterStage, searchTerm]);

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
        toast.success("Lead de Cold Call atualizado!");
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
    setCallStartTime(new Date().toISOString());
    setCallEndTime(null);
    setCallResult('');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingModality('');
    setMeetingNotes('');
    setLogError('');
    setIsLogModalOpen(true);
  };

  const handleEndCall = () => {
    setCallEndTime(new Date().toISOString());
  };

  const handleSaveLog = async () => {
    if (!loggingLead || !callStartTime || !callEndTime || !callResult) {
      setLogError("Resultado da ligação é obrigatório.");
      return;
    }

    if (callResult === 'Agendar Reunião') {
      if (!meetingDate || !meetingTime || !meetingModality) {
        setLogError("Data, hora e modalidade da reunião são obrigatórios.");
        return;
      }
    }

    setIsSavingLog(true);
    try {
      const logData: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at' | 'duration_seconds'> & { start_time: string; end_time: string; } = {
        cold_call_lead_id: loggingLead.id,
        start_time: callStartTime,
        end_time: callEndTime,
        result: callResult,
        meeting_date: meetingDate || undefined,
        meeting_time: meetingTime || undefined,
        meeting_modality: meetingModality || undefined,
        meeting_notes: meetingNotes || undefined,
      };
      await addColdCallLog(logData);

      // Update lead stage
      let newStage: ColdCallStage = loggingLead.current_stage;
      if (callResult === 'Conversou') newStage = 'Conversou';
      else if (callResult === 'Agendar Reunião') newStage = 'Reunião Agendada';
      else if (callResult === 'Pedir retorno' || callResult === 'Não atendeu') newStage = 'Tentativa de Contato';
      else if (callResult === 'Sem interesse' || callResult === 'Número inválido') newStage = 'Base Fria'; // Pode voltar para base fria ou ser desqualificado

      await updateColdCallLead(loggingLead.id, { current_stage: newStage });

      // If meeting scheduled, create CRM lead
      if (callResult === 'Agendar Reunião') {
        const { crmLeadId } = await createCrmLeadFromColdCall(loggingLead.id);
        toast.success(`Reunião agendada! Novo Lead criado no CRM principal (ID: ${crmLeadId}).`);
      } else {
        toast.success("Ligação registrada com sucesso!");
      }
      
      setIsLogModalOpen(false);
    } catch (error: any) {
      setLogError(`Erro ao registrar ligação: ${error.message}`);
      toast.error(`Erro ao registrar ligação: ${error.message}`);
    } finally {
      setIsSavingLog(false);
    }
  };

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
                <th className="px-6 py-3">Última Atualização</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
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
                    <td className="px-6 py-4">{new Date(lead.updated_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => handleStartCall(lead)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full" title="Iniciar Ligação">
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenLeadModal(lead)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full" title="Editar Lead">
                          <Edit2 className="w-4 h-4" />
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
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
          <DialogHeader>
            <DialogTitle>Registrar Ligação: {loggingLead?.name}</DialogTitle>
            <DialogDescription>
              Registre o resultado da ligação e agende uma reunião, se aplicável.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveLog(); }}>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Status da Ligação:</Label>
                {callStartTime && !callEndTime ? (
                  <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                    <Play className="w-4 h-4 mr-1" /> Em Andamento
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500 dark:text-gray-400 font-medium">
                    <StopCircle className="w-4 h-4 mr-1" /> Finalizada
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" onClick={() => setCallStartTime(new Date().toISOString())} disabled={!!callStartTime} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Play className="w-4 h-4 mr-2" /> Iniciar Ligação
                </Button>
                <Button type="button" onClick={handleEndCall} disabled={!callStartTime || !!callEndTime} variant="destructive">
                  <StopCircle className="w-4 h-4 mr-2" /> Finalizar Ligação
                </Button>
              </div>
              {callStartTime && callEndTime && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Duração: {Math.round((new Date(callEndTime).getTime() - new Date(callStartTime).getTime()) / 1000)} segundos
                </div>
              )}
              <div>
                <Label htmlFor="callResult">Resultado da Ligação *</Label>
                <Select value={callResult} onValueChange={(value: ColdCallResult) => setCallResult(value)} required disabled={!callEndTime}>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    {COLD_CALL_RESULTS.map(result => (
                      <SelectItem key={result} value={result}>{result}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {callResult === 'Agendar Reunião' && (
                <div className="grid gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Detalhes da Reunião</h3>
                  <div>
                    <Label htmlFor="meetingDate">Data da Reunião *</Label>
                    <Input id="meetingDate" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="meetingTime">Hora da Reunião *</Label>
                    <Input id="meetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="meetingModality">Modalidade *</Label>
                    <Select value={meetingModality} onValueChange={setMeetingModality} required>
                      <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Selecione a modalidade" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                        {MEETING_MODALITIES.map(modality => (
                          <SelectItem key={modality} value={modality}>{modality}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="meetingNotes">Observações (Opcional)</Label>
                    <Textarea id="meetingNotes" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} rows={3} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                </div>
              )}
              {logError && <p className="text-red-500 text-sm mt-2">{logError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLogModalOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
              <Button type="submit" disabled={isSavingLog || !callEndTime} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSavingLog ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Ligação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColdCallPage;