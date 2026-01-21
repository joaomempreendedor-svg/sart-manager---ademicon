import React from 'react';
import { X, DollarSign, Calendar, Users, Tag, ChevronRight } from 'lucide-react';
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

interface SalesByOriginDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  originName: string;
  leads: CrmLead[];
  crmStages: CrmStage[];
  teamMembers: TeamMember[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const SalesByOriginDetailModal: React.FC<SalesByOriginDetailModalProps> = ({
  isOpen,
  onClose,
  originName,
  leads,
  crmStages,
  teamMembers,
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
            <Tag className="w-6 h-6 text-brand-500" />
            <span>Vendas da Origem: {originName} ({leads.length})</span>
          </DialogTitle>
          <DialogDescription>
            Lista de leads que foram vendidos e vieram da origem "{originName}".
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {leads.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma venda encontrada para esta origem.</p>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => {
                const consultant = teamMembers.find(tm => tm.id === lead.consultant_id);
                const soldValue = (lead.soldCreditValue && lead.soldCreditValue > 0)
                  ? lead.soldCreditValue
                  : (lead.proposalValue || 0); // Fallback to proposalValue if soldCreditValue is 0 or null

                return (
                  <div
                    key={lead.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 group flex-col sm:flex-row"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {consultant && (
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" /> Consultor: <span className="font-semibold">{consultant.name}</span>
                          </span>
                        )}
                        {lead.saleDate && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> Data da Venda: <span className="font-semibold">{new Date(lead.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                        <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                          <DollarSign className="w-3 h-3 mr-1" /> Valor Vendido: <span className="font-semibold">{formatCurrency(soldValue)}</span>
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