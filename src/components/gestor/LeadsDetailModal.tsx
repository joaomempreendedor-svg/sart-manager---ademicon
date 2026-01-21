import React from 'react';
import { X, DollarSign, Calendar, Users, Tag, ChevronRight, Send } from 'lucide-react';
import { CrmLead, CrmStage, TeamMember } from '@/types';
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

interface LeadsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  leads: CrmLead[];
  crmStages: CrmStage[];
  teamMembers: TeamMember[];
  metricType: 'proposal' | 'sold'; // Para diferenciar o ícone e o valor exibido
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const LeadsDetailModal: React.FC<LeadsDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  leads,
  crmStages,
  teamMembers,
  metricType,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToLead = (leadId: string) => {
    onClose(); // Fecha o modal antes de navegar
    navigate(`/gestor/crm`, { state: { highlightLeadId: leadId } }); // Navega para o CRM, pode adicionar um estado para destacar o lead
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {metricType === 'proposal' ? (
              <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ) : (
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            )}
            <span>{title} ({leads.length})</span>
          </DialogTitle>
          <DialogDescription>
            Lista de leads relacionados a esta métrica.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {leads.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum lead encontrado para esta métrica.</p>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => {
                const consultant = teamMembers.find(tm => tm.id === lead.consultant_id);
                const stage = crmStages.find(s => s.id === lead.stage_id);
                const displayValue = metricType === 'proposal' 
                  ? (lead.proposalValue || 0) 
                  : (lead.soldCreditValue || lead.proposalValue || 0); // Fallback para valor vendido

                return (
                  <div
                    key={lead.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${metricType === 'proposal' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'} group flex-col sm:flex-row`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {consultant && (
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" /> Consultor: <span className="font-semibold">{consultant.name}</span>
                          </span>
                        )}
                        {stage && (
                          <span className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" /> Etapa: <span className="font-semibold">{stage.name}</span>
                          </span>
                        )}
                        {metricType === 'proposal' && lead.proposalClosingDate && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> Fechamento Esperado: <span className="font-semibold">{new Date(lead.proposalClosingDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                        {metricType === 'sold' && lead.saleDate && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> Data da Venda: <span className="font-semibold">{new Date(lead.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                        <span className={`flex items-center font-medium ${metricType === 'proposal' ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`}>
                          <DollarSign className="w-3 h-3 mr-1" /> {metricType === 'proposal' ? 'Valor Proposta' : 'Valor Vendido'}: <span className="font-semibold">{formatCurrency(displayValue)}</span>
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleGoToLead(lead.id)} className="flex-shrink-0 text-gray-400 hover:text-brand-600 mt-2 sm:mt-0" title="Ver Lead">
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