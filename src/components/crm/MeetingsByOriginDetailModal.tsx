import React from 'react';
import { X, Calendar, Users, Tag, ChevronRight } from 'lucide-react';
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
import { useAuth } from '@/context/AuthContext';

interface MeetingsByOriginDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  originName: string;
  leads: CrmLead[];
  crmStages: CrmStage[];
  teamMembers: TeamMember[];
}

export const MeetingsByOriginDetailModal: React.FC<MeetingsByOriginDetailModalProps> = ({
  isOpen,
  onClose,
  originName,
  leads = [], // Proteção: valor padrão vazio
  crmStages,
  teamMembers,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleGoToLead = (leadId: string) => {
    onClose();
    const baseRoute = user?.role === 'GESTOR' || user?.role === 'ADMIN' ? '/gestor' : '/consultor';
    navigate(`${baseRoute}/crm`, { state: { highlightLeadId: leadId } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-brand-500" />
            <span>Reuniões da Origem: {originName} ({leads?.length || 0})</span>
          </DialogTitle>
          <DialogDescription>
            Lista de leads que tiveram reuniões agendadas e vieram da origem "{originName}".
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {!leads || leads.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma reunião encontrada para esta origem.</p>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => {
                const consultant = teamMembers.find(tm => tm.id === lead.consultant_id);
                const stage = crmStages.find(s => s.id === lead.stage_id);

                return (
                  <div
                    key={lead.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 group flex-col sm:flex-row"
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