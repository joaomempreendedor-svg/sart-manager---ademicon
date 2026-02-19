import React from 'react';
import { X, User, Phone, Mail, MessageSquare, Clock, Calendar, Users, BarChart3, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColdCallLead, ColdCallLog } from '@/types';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

interface ColdCallLeadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ColdCallLead;
  logs: ColdCallLog[];
}

export const ColdCallLeadHistoryModal: React.FC<ColdCallLeadHistoryModalProps> = ({ isOpen, onClose, lead, logs }) => {
  const { createCrmLeadFromColdCall } = useApp();
  const navigate = useNavigate();

  if (!isOpen || !lead) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleCreateCrmLead = async (log: ColdCallLog) => {
    if (!log.cold_call_lead_id) {
      toast.error("ID do Cold Call Lead não encontrado para criar Lead no CRM.");
      return;
    }
    if (!window.confirm("Deseja criar um Lead no CRM principal a partir deste prospect?")) {
      return;
    }
    try {
      const { crmLeadId } = await createCrmLeadFromColdCall(log.cold_call_lead_id);
      toast.success(`Lead criado no CRM principal (ID: ${crmLeadId})!`);
      onClose();
      navigate('/consultor/crm', { state: { highlightLeadId: crmLeadId } });
    } catch (error: any) {
      toast.error(`Erro ao criar Lead no CRM: ${error.message}`);
      console.error("Erro ao criar Lead no CRM:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-brand-500" />
            <span>Histórico do Prospect: {lead.name}</span>
          </DialogTitle>
          <DialogDescription>
            Detalhes e histórico de ligações para {lead.name}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {/* Detalhes do Prospect */}
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-500" /> Informações do Prospect
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-200">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-200">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 col-span-full">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-200">Etapa Atual: {lead.current_stage}</span>
              </div>
              {lead.notes && (
                <div className="flex items-start space-x-2 col-span-full">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Ligações */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-brand-500" /> Histórico de Ligações ({logs.length})
          </h3>
          {sortedLogs.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma ligação registrada para este prospect.</p>
          ) : (
            <div className="space-y-4">
              {sortedLogs.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{new Date(log.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(log.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.result === 'Agendar Reunião' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      log.result === 'Conversou' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      log.result === 'Pedir retorno' || log.result === 'Não atendeu' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                    }`}>
                      {log.result}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Duração: {formatDuration(log.duration_seconds)}</p>
                  
                  {log.result === 'Agendar Reunião' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center space-x-1">
                        <Users className="w-4 h-4" /> Detalhes da Reunião
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Data: {log.meeting_date ? new Date(log.meeting_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Hora: {log.meeting_time || 'N/A'}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Modalidade: {log.meeting_modality || 'N/A'}</p>
                      {log.meeting_notes && <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Notas: {log.meeting_notes}</p>}
                      {!lead.crm_lead_id && (
                        <Button 
                          onClick={() => handleCreateCrmLead(log)}
                          className="mt-3 bg-brand-600 hover:bg-brand-700 text-white text-xs py-1.5 px-3 flex items-center space-x-1"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span>Criar Lead no CRM</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
          <Button type="button" onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};