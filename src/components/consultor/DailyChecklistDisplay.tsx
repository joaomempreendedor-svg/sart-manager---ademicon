import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2, Eye, Video, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquare, CheckCircle2 } from 'lucide-react';
import { User, DailyChecklistItem, DailyChecklistItemResourceType } from '@/types';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal';
import { Button } from '@/components/ui/button';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

// Prefixo interno para identificar checklists da secretaria sem precisar mudar o banco
const SECRETARIA_PREFIX = "[SEC] ";

interface DailyChecklistDisplayProps {
  user: User | null;
  isDataLoading: boolean;
  highlightedItemId?: string | null;
  highlightedDate?: string | null;
}

export const DailyChecklistDisplay: React.FC<DailyChecklistDisplayProps> = ({ user, isDataLoading, highlightedItemId, highlightedDate }) => {
  const { 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    dailyChecklistCompletions,
    teamMembers,
    toggleDailyChecklistCompletion,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showConfetti, setShowConfetti] = useState(false);
  const prevDailyProgressRef = useRef(0);

  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedResourceItem, setSelectedResourceItem] = useState<DailyChecklistItem | null>(null);

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const userTeamMember = useMemo(() => {
    if (!user) return null;
    return teamMembers.find(tm => tm.authUserId === user.id);
  }, [user, teamMembers]);

  const assignedChecklists = useMemo(() => {
    if (!user || !userTeamMember) {
      return [];
    }

    const isSecretaria = userTeamMember.roles.includes('SECRETARIA');

    // 1. GLOBAIS: checklists SEM atribuição específica
    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAnyAssignment = dailyChecklistAssignments.some(
        assignment => assignment.daily_checklist_id === checklist.id
      );
      if (hasAnyAssignment) return false;

      const isSecChecklist = checklist.title.startsWith(SECRETARIA_PREFIX);
      // Se for Secretaria, vê apenas os unassigned que começam com [SEC]
      // Se for Consultor, vê apenas os unassigned que NÃO começam com [SEC]
      return isSecretaria ? isSecChecklist : !isSecChecklist;
    });

    // 2. ESPECÍFICOS: checklists atribuídos a ESTE usuário
    const specificChecklists = dailyChecklists.filter(checklist => {
      return dailyChecklistAssignments.some(
        assignment => 
          assignment.daily_checklist_id === checklist.id && 
          assignment.consultant_id === user.id
      );
    });

    // 3. COMBINAR ambos (remover duplicados)
    const allChecklists = [...globalChecklists, ...specificChecklists];
    const uniqueChecklists = allChecklists.filter(
      (checklist, index, self) =>
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
    if (!user) return false;
    return dailyChecklistCompletions.some(
      completion =>
        completion.daily_checklist_item_id === itemId &&
        completion.consultant_id === user.id &&
        completion.date === formattedSelectedDate &&
        completion.done
    );
  }, [dailyChecklistCompletions, user, formattedSelectedDate]);

  const handleToggleCompletion = async (itemId: string, currentStatus: boolean) => {
    if (!user) return;
    await toggleDailyChecklistCompletion(itemId, formattedSelectedDate, !currentStatus, user.id);
  };

  const navigateDay = (offset: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  const isItemDueOnDate = useCallback((item: DailyChecklistItem, dateStr: string) => {
    const rec = item.resource?.recurrence;
    if (!rec || rec.type === 'daily') return true;

    const toDate = (s: string) => new Date(s + 'T00:00:00');

    if (rec.type === 'weekly') {
      const d = new Date(dateStr + 'T00:00:00').getDay(); // 0-6
      return d === (rec.dayOfWeek ?? d);
    }

    if (rec.type === 'monthly') {
      const d = new Date(dateStr + 'T00:00:00').getDate();
      return d === (rec.dayOfMonth ?? d);
    }

    if (rec.type === 'every_x_days') {
      const start = rec.startDate ? toDate(rec.startDate) : new Date(item.created_at);
      const target = toDate(dateStr);
      if (target < start) return false;
      const diffMs = target.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const interval = Math.max(2, rec.intervalDays ?? 2);
      return diffDays % interval === 0;
    }

    if (rec.type === 'specific_date') {
      return dateStr === rec.specificDate;
    }

    return true;
  }, []);

  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    if (!user) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0 };

    const relevantItems: DailyChecklistItem[] = assignedChecklists.flatMap(checklist => 
      getItemsForChecklist(checklist.id).filter(item => isItemDueOnDate(item, formattedSelectedDate))
    );

    const total = relevantItems.length;
    const completed = relevantItems.filter(item => getCompletionStatus(item.id)).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [user, assignedChecklists, getItemsForChecklist, isItemDueOnDate, getCompletionStatus, formattedSelectedDate]);

  useEffect(() => {
    if (dailyProgress === 100 && prevDailyProgressRef.current !== 100 && totalDailyTasks > 0) {
      setShowConfetti(true);
    }
    prevDailyProgressRef.current = dailyProgress;
  }, [dailyProgress, totalDailyTasks]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleOpenResourceModal = (item: DailyChecklistItem) => {
    setSelectedResourceItem(item);
    setIsResourceModalOpen(true);
  };

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedItemId && highlightedDate) {
      if (highlightedDate !== formattedSelectedDate) {
        setSelectedDate(new Date(highlightedDate + 'T00:00:00'));
      }
      const timer = setTimeout(() => {
        itemRefs.current[highlightedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, highlightedDate, formattedSelectedDate]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showConfetti && <ConfettiAnimation run={showConfetti} onConfettiComplete={handleConfettiComplete} />}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-col sm:flex-row">
        <button onClick={() => navigateDay(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white my-2 sm:my-0">
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
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist diário atribuído a você.</p>
          <p className="text-sm text-gray-400">Entre em contato com seu gestor para mais informações.</p>
        </div>
      ) : (
        assignedChecklists.map(checklist => {
          const rawItems = getItemsForChecklist(checklist.id);
          const items = rawItems.filter(item => isItemDueOnDate(item, formattedSelectedDate));
          const completedItemsCount = items.filter(item => getCompletionStatus(item.id)).length;
          const checklistProgress = items.length > 0 ? Math.round((completedItemsCount / items.length) * 100) : 0;

          return (
            <div key={checklist.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {checklist.title.replace(SECRETARIA_PREFIX, '')}
                  </h3>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded">{checklistProgress}% Concluído</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                  <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${checklistProgress}%` }}></div>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 dark:text-gray-500">
                    Nenhum item para hoje neste checklist.
                  </div>
                ) : (
                  items.map(item => {
                    const isCompleted = getCompletionStatus(item.id);
                    const isHighlighted = highlightedItemId === item.id && highlightedDate === formattedSelectedDate;
                    
                    let itemClasses = 'p-4 flex flex-col sm:flex-row sm:items-center justify-between';
                    let labelClasses = 'text-sm font-medium leading-none';

                    if (isCompleted) {
                      itemClasses += ' bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                      labelClasses += ' line-through text-gray-400 dark:text-gray-500';
                    } else {
                      itemClasses += ' bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                      labelClasses += ' text-red-800 dark:text-red-200';
                    }
                    if (isHighlighted) {
                      itemClasses += ' ring-4 ring-brand-500/50 dark:ring-brand-400/50 animate-pulse';
                    }

                    return (
                      <div 
                        key={item.id} 
                        ref={el => itemRefs.current[item.id] = el}
                        className={itemClasses}
                      >
                        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={isCompleted}
                            onCheckedChange={() => handleToggleCompletion(item.id, isCompleted)}
                            className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                          />
                          <Label htmlFor={`item-${item.id}`} className={labelClasses}>
                            {item.text}
                            {isCompleted && (
                              <span className="ml-2 text-base text-green-600 dark:text-green-400 font-bold">
                                <CheckCircle2 className="w-4 h-4 inline-block mr-1" /> Concluído
                              </span>
                            )}
                          </Label>
                        </div>
                        {item.resource && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenResourceModal(item)}
                            className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition border-brand-200 dark:border-brand-800 w-full sm:w-auto"
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