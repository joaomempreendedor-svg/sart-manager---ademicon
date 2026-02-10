import React from 'react';
import { X, Users, Calendar, MessageSquare, UserCheck, TrendingUp, Clock, FileText, UserPlus, UserX, UserMinus, Ghost, XCircle, MapPin } from 'lucide-react';
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
import { Candidate, TeamMember } from '@/types';

interface CandidatesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  candidates: Candidate[];
  teamMembers: TeamMember[];
  metricType: 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified';
}

export const CandidatesDetailModal: React.FC<CandidatesDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  candidates,
  teamMembers,
  metricType,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToCandidate = (candidateId: string) => {
    onClose();
    navigate(`/gestor/candidate/${candidateId}`);
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find(m => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    return member?.name || 'Desconhecido';
  };

  const getIconForMetric = (type: string) => {
    switch (type) {
      case 'total': return <Users className="w-6 h-6 text-indigo-600" />;
      case 'newCandidates': return <UserPlus className="w-6 h-6 text-slate-600" />;
      case 'contacted': return <MessageSquare className="w-6 h-6 text-amber-500" />;
      case 'scheduled': return <Clock className="w-6 h-6 text-orange-600" />;
      case 'conducted': return <FileText className="w-6 h-6 text-purple-600" />;
      case 'awaitingPreview': return <TrendingUp className="w-6 h-6 text-blue-600" />;
      case 'hired': return <UserCheck className="w-6 h-6 text-emerald-600" />;
      case 'noShow': return <Ghost className="w-6 h-6 text-rose-500" />;
      case 'withdrawn': return <UserMinus className="w-6 h-6 text-rose-600" />;
      case 'disqualified': return <XCircle className="w-6 h-6 text-rose-700" />;
      default: return <Users className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getIconForMetric(metricType)}
            <span>{title} ({candidates.length})</span>
          </DialogTitle>
          <DialogDescription>
            Lista de candidatos para a métrica "{title}".
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          {candidates.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum candidato encontrado para esta métrica.</p>
          ) : (
            <div className="space-y-3">
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer group flex-col sm:flex-row"
                  onClick={() => handleGoToCandidate(candidate.id)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{candidate.name}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      {candidate.responsibleUserId && (
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" /> Responsável: <span className="font-semibold">{getResponsibleName(candidate.responsibleUserId)}</span>
                        </span>
                      )}
                      {candidate.phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" /> Telefone: <span className="font-semibold">{candidate.phone}</span>
                        </span>
                      )}
                      {candidate.email && (
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" /> Email: <span className="font-semibold">{candidate.email}</span>
                        </span>
                      )}
                      {candidate.origin && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> Origem: <span className="font-semibold">{candidate.origin}</span>
                        </span>
                      )}
                      {candidate.interviewDate && (
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> Entrevista: <span className="font-semibold">{new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 text-gray-400 hover:text-brand-600 mt-2 sm:mt-0" title="Ver Detalhes">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              ))}
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