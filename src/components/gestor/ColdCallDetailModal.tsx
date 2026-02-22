import React, { useMemo } from 'react';
import { X, PhoneCall, MessageSquare, CalendarCheck, BarChart3, UserRound, Clock, ChevronRight } from 'lucide-react';
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
import { ColdCallLead, ColdCallLog, TeamMember, ColdCallDetailType } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ColdCallDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  consultantName: string;
  leads: ColdCallLead[];
  logs: ColdCallLog[];
  type: ColdCallDetailType;
  teamMembers: TeamMember[];
  filterStartDate?: string; // NOVO: Filtro de data de início
  filterEndDate?: string;   // NOVO: Filtro de data de fim
}

export const ColdCallDetailModal: React.FC<ColdCallDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  consultantName,
  leads,
  logs,
  type,
  teamMembers,
  filterStartDate, // NOVO
  filterEndDate,   // NOVO
}) => {
  const navigate = useNavigate();

  const filteredItems = useMemo(() => {
    const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
    const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;

    const filterByDate = (itemDate: string) => {
      const date = new Date(itemDate);
      return (!start || date >= start) && (!end || date <= end);
    };

    if (type === 'calls') {
      return logs.filter(log => filterByDate(log.created_at)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (type === 'conversations') {
      return logs.filter(log => (log.result === 'Conversou' || log.result === 'Agendar Reunião') && filterByDate(log.created_at))
                 .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (type === 'meetings') {
      return logs.filter(log => log.result === 'Agendar Reunião' && filterByDate(log.created_at))
                 .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (type === 'interest') {
      return logs.filter(log => log.result === 'Demonstrou Interesse' && filterByDate(log.created_at))
                 .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    // 'all' ou default: mostra leads
    return leads.filter(lead => filterByDate(lead.created_at)).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [leads, logs, type, filterStartDate, filterEndDate]);

  const getLeadNameFromLog = (log: ColdCallLog) => {
    const lead = leads.find(l => l.id === log.cold_call_lead_id);
    return lead?.name || 'Lead Desconhecido';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleGoToColdCallLead = (leadId: string) => {
    onClose();
    navigate('/consultor/cold-call', { state: { highlightLeadId: leadId } }); // Pode adicionar um estado para destacar o lead
  };

  const handleGoToCrmLead = (crmLeadId: string) => {
    onClose();
    navigate('/consultor/crm', { state: { highlightLeadId: crmLeadId } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-brand-500" />
            <span>{title} ({consultantName})</span>
          </DialogTitle>
          <DialogDescription>
            Detalhes das atividades de Cold Call para {consultantName}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum item encontrado para esta métrica no período selecionado.</p>
          ) : (
            <div className="space-y-3">
              {type === 'calls' || type === 'conversations' || type === 'meetings' ? (
                (filteredItems as ColdCallLog[]).map(log => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer group flex-col sm:flex-row"
                    onClick={() => handleGoToColdCallLead(log.cold_call_lead_id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{getLeadNameFromLog(log)}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> {new Date(log.start_time).toLocaleDateString('pt-BR')} {new Date(log.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center">
                          <PhoneCall className="w-3 h-3 mr-1" /> Duração: {formatDuration(log.duration_seconds)}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" /> Resultado: {log.result}
                        </span>
                        {log.result === 'Agendar Reunião' && log.meeting_date && (
                          <span className="flex items-center text-green-600 dark:text-green-400">
                            <CalendarCheck className="w-3 h-3 mr-1" /> Reunião: {new Date(log.meeting_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {leads.find(l => l.id === log.cold_call_lead_id)?.crm_lead_id && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleGoToCrmLead(leads.find(l => l.id === log.cold_call_lead_id)!.crm_lead_id!); }}
                            className="p-0 h-auto text-blue-600 dark:text-blue-400 text-xs mt-1"
                          >
                            <ChevronRight className="w-3 h-3 mr-1" /> Ver Lead no CRM
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 text-gray-400 hover:text-brand-600 mt-2 sm:mt-0" title="Ver Prospect">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                ))
              ) : (
                (filteredItems as ColdCallLead[]).map(lead => (
                  <div
                    key={lead.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer group flex-col sm:flex-row"
                    onClick={() => handleGoToColdCallLead(lead.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        <span className="flex items-center">
                          <PhoneCall className="w-3 h-3 mr-1" /> {lead.phone}
                        </span>
                        {lead.email && (
                          <span className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" /> {lead.email}
                          </span>
                        )}
                        <span className="flex items-center">
                          <BarChart3 className="w-3 h-3 mr-1" /> Etapa: {lead.current_stage}
                        </span>
                        {lead.crm_lead_id && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleGoToCrmLead(lead.crm_lead_id!); }}
                            className="p-0 h-auto text-blue-600 dark:text-blue-400 text-xs mt-1"
                          >
                            <ChevronRight className="w-3 h-3 mr-1" /> Ver Lead no CRM
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 text-gray-400 hover:text-brand-600 mt-2 sm:mt-0" title="Ver Prospect">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
          <Button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};