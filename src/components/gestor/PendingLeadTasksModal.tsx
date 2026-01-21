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

  console.log("PendingLeadTasksModal: isOpen =", isOpen);
  console.log("PendingLeadTasksModal: pendingTasks.length =", pendingTasks.length);

  if (!isOpen) return null;

  const handleGoToLead = (leadId: string) => {
    onClose(); // Fecha o modal antes de navegar
    navigate(`/gestor/crm`, { state: { highlightLeadId: leadId } }); // Navega para o CRM, pode adicionar um estado para destacar o lead
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
        
        {/* CONTEÚDO TEMPORARIAMENTE SIMPLIFICADO PARA DIAGNÓSTICO */}
        <div className="py-4 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Modal de Tarefas Pendentes está aberto!
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Número de tarefas: {pendingTasks.length}
          </p>
          {pendingTasks.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Primeira tarefa: {pendingTasks[0].title}
            </p>
          )}
        </div>
        {/* FIM DO CONTEÚDO TEMPORÁRIO */}

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
          <Button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};