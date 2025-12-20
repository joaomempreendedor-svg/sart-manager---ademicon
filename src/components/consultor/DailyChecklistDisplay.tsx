import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2, Eye, Video, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { User, DailyChecklistItem, DailyChecklistItemResourceType } from '@/types'; // Importar o tipo User e DailyChecklistItem
import { ConfettiAnimation } from '@/components/ConfettiAnimation'; // Importar o novo componente de animação
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal'; // Importar o novo modal
import { Button } from '@/components/ui/button'; // Importar o componente Button

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

interface DailyChecklistDisplayProps {
  user: User | null;
  isDataLoading: boolean;
}

export const DailyChecklistDisplay: React.FC<DailyChecklistDisplayProps> = ({ user, isDataLoading }) => {
  const { 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    dailyChecklistCompletions,
    teamMembers,
    toggleDailyChecklistCompletion,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showConfetti, setShowConfetti] = useState(false); // Novo estado para controlar o confete
  const prevDailyProgressRef = useRef(0); // Ref para armazenar o progresso anterior

  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedResourceItem, setSelectedResourceItem] = useState<DailyChecklistItem | null>(null);

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const userTeamMember = useMemo(() => {
    if (!user) return null;
    return teamMembers.find(tm => tm.id === user.id || (tm.email && tm.email === user.email) || (tm.isLegacy && tm.name === user.name));
  }, [user, teamMembers]);

  const assignedChecklists = useMemo(() => {
    if (!user || !userTeamMember) {
      return [];
    }

    // 1. GLOBAIS: checklists SEM atribuição específica
    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAnyAssignment = dailyChecklistAssignments.some(
        assignment => assignment.daily_checklist_id === checklist.id
      );
      return !hasAnyAssignment; // GLOBAL = sem atribuições
    });

    // 2. ESPECÍFICOS: checklists atribuídos a ESTE consultor
    const specificChecklists = dailyChecklists.filter(checklist => {
      return dailyChecklistAssignments.some(
        assignment => 
          assignment.daily_checklist_id === checklist.id && 
          assignment.consultant_id === userTeamMember.id
      );
    });

    // 3. COMBINAR ambos (remover duplicados)
    const allChecklists = [...globalChecklists, ...specificChecklists];
    const uniqueChecklists = allChecklists.filter(
      (checklist, index, self) =>
        // Filtra ativos E remove duplicados
        checklist.is_active &&
        self.findIndex(c => c.id === checklist.id) === index
    );

    return uniqueChecklists.sort((a, b) => a.title.localeCompare(b.title));
  }, [dailyChecklists, dailyChecklistAssignments, user, userTeamMember]);

  const getItemsForChecklist = useCallback((checklistId: string) => {
    return dailyChecklistItems
      .filter(item => item.daily_checklist_id === checklistId && item.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [dailyChecklistItems]);

  const getCompletionStatus = useCallback((itemId: string) => {
    if (!user || !userTeamMember) return false;
    return dailyChecklistCompletions.some(
      completion =>
        completion.daily_checklist_item_id === itemId &&
        completion.consultant_id === userTeamMember.id &&
        completion.date === formattedSelectedDate &&
        completion.done
    );
  }, [dailyChecklistCompletions, user, userTeamMember, formattedSelectedDate]);

  const handleToggleCompletion = async (itemId: string, currentStatus: boolean) => {
    if (!user || !userTeamMember) return;
    await toggleDailyChecklistCompletion(itemId, formattedSelectedDate, !currentStatus, userTeamMember.id);
  };

  const navigateDay = (offset: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  // Calcular o progresso diário para o confete
  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    if (!user || !userTeamMember) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0 };

    const relevantItems: DailyChecklistItem[] = assignedChecklists.flatMap(checklist => 
      dailyChecklistItems.filter(item => item.daily_checklist_id === checklist.id && item.is_active)
    );

    const total = relevantItems.length;
    const completed = relevantItems.filter(item => 
      dailyChecklistCompletions.some(
        completion =>
          completion.daily_checklist_item_id === item.id &&
          completion.consultant_id === userTeamMember.id &&
          completion.date === formattedSelectedDate &&
          completion.done
      )
    ).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [user, userTeamMember, assignedChecklists, dailyChecklistItems, dailyChecklistCompletions, formattedSelectedDate]);

  // Efeito para disparar o confete
  useEffect(() => {
    if (dailyProgress === 100 && prevDailyProgressRef.current !== 100) {
      setShowConfetti(true);
    }
    prevDailyProgressRef.current = dailyProgress;
  }, [dailyProgress]);

  // Função para resetar o confete após a animação
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleOpenResourceModal = (item: DailyChecklistItem) => {
    setSelectedResourceItem(item);
    setIsResourceModalOpen(true);
  };

  const getResourceTypeIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-red-500" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case 'text': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showConfetti && <ConfettiAnimation run={showConfetti} onConfettiComplete={handleConfettiComplete} />} {/* Renderiza o confete */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <button onClick={() => navigateDay(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CalendarDays className="w-5 h-5 text-brand-500" />
          <span>{displayDate(selectedDate)}</span>
        </div>
        <button onClick={() => navigateDay(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {assignedChecklists.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist diário atribuído a você ou ativo.</p>
          <p className="text-sm text-gray-400">Entre em contato com seu gestor para mais informações.</p>
        </div>
      ) : (
        assignedChecklists.map(checklist => {
          const items = getItemsForChecklist(checklist.id);
          return (
            <div key={checklist.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{checklist.title}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 dark:text-gray-500">
                    Nenhum item ativo neste checklist.
                  </div>
                ) : (
                  items.map(item => {
                    const isCompleted = getCompletionStatus(item.id);
                    return (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={isCompleted}
                            onCheckedChange={() => handleToggleCompletion(item.id, isCompleted)}
                            className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                          />
                          <Label htmlFor={`item-${item.id}`} className={`text-sm font-medium leading-none ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                            {item.text}
                          </Label>
                        </div>
                        {item.resource && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenResourceModal(item)}
                            className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition border-brand-200 dark:border-brand-800"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            <span>Como fazer?</span>
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })
      )}
      {selectedResourceItem && (
        <DailyChecklistItemResourceModal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          itemText={selectedResourceItem.text}
          resource={selectedResourceItem.resource}
        />
      )}
    </div>
  );
};