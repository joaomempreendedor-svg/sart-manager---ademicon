import React from 'react';
import { X, ListTodo, Calendar, Clock, UserRound, ChevronRight } from 'lucide-react';
import { LeadTask, CrmLead, TeamMember } from '@/types';
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
import { useNavigate } from 'react-router-dom';

interface PendingLeadTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTasks: LeadTask[];
  crmLeads: CrmLead[]; // Para obter o nome do lead
  teamMembers: TeamMember[]; // NOVO: Para obter o nome do consultor
}

export const PendingLeadTasksModal: React.FC<PendingLeadTasksModalProps> = ({ isOpen, onClose, pendingTasks, crmLeads, teamMembers }) => {
  const navigate = useNavigate();

  console.log("[PendingLeadTasksModal] Modal is rendering. isOpen:", isOpen);
  console.log("[PendingLeadTasksModal] pendingTasks.length:", pendingTasks.length);

  if (!isOpen) return null;

  const handleGoToLead = (leadId: string) => {
    onClose(); // Fecha o modal antes de navegar
    navigate(`/consultor/crm`, { state: { highlightLeadId: leadId } }); // Navega para o CRM, pode adicionar um estado para destacar o lead
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ListTodo className="w-6 h-6 text-red-600 dark:text-red-400" />
            <span>Tarefas de Lead Pendentes ({pendingTasks.length})</span>
          </DialogTitle>
          <DialogDescription>
            Lista de tarefas atrasadas ou que vencem hoje para seus leads.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {pendingTasks.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tarefa pendente encontrada.</p>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map(task => {
                const lead = crmLeads.find(l => l.id === task.lead_id);
                const consultant = teamMembers.find(tm => tm.id === task.user_id);
                const isOverdue = task.due_date && new Date(task.due_date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');

                return (
                  <div
                    key={task.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'} group flex-col sm:flex-row`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {lead && (
                          <span className="flex items-center">
                            <UserRound className="w-3 h-3 mr-1" /> Lead: <span className="font-semibold">{lead.name}</span>
                          </span>
                        )}
                        {consultant && (
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" /> Consultor: <span className="font-semibold">{consultant.name}</span>
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> Vence: <span className="font-semibold">{new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                        {task.type === 'meeting' && task.meeting_start_time && task.meeting_end_time && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> Horário: <span className="font-semibold">{new Date(task.meeting_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(task.meeting_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleGoToLead(task.lead_id)} className="flex-shrink-0 text-gray-400 hover:text-brand-600 mt-2 sm:mt-0" title="Ver Lead">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                );
              })}
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