import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2, Eye, Check, Sparkles } from 'lucide-react';
import { User, DailyChecklistItem } from '@/types';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

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
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const userTeamMember = useMemo(() => {
    if (!user) return null;
    return teamMembers.find(tm => tm.authUserId === user.id);
  }, [user, teamMembers]);

  const assignedChecklists = useMemo(() => {
    if (!user || !userTeamMember) return [];

    const isSecretaria = userTeamMember.roles.includes('SECRETARIA');

    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAnyAssignment = dailyChecklistAssignments.some(
        assignment => assignment.daily_checklist_id === checklist.id
      );
      if (hasAnyAssignment) return false;
      const isSecChecklist = checklist.title.startsWith(SECRETARIA_PREFIX);
      return isSecretaria ? isSecChecklist : !isSecChecklist;
    });

    const specificChecklists = dailyChecklists.filter(checklist => {
      return dailyChecklistAssignments.some(
        assignment =>
          assignment.daily_checklist_id === checklist.id &&
          assignment.consultant_id === user.id
      );
    });

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
    setTogglingItemId(itemId);
    try {
      await toggleDailyChecklistCompletion(itemId, formattedSelectedDate, !currentStatus, user.id);
    } finally {
      setTogglingItemId(null);
    }
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
      const d = new Date(dateStr + 'T00:00:00').getDay();
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

  const isItemRecorrente = (item: DailyChecklistItem) => {
    const rec = item.resource?.recurrence?.type;
    return rec && rec !== 'specific_date';
  };

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
            <div
              key={checklist.id}
              className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-md dark:border-brand-800 dark:from-brand-900/20 dark:to-slate-800"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                      {checklist.title.replace(SECRETARIA_PREFIX, '')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {completedItemsCount} de {items.length} tarefas concluídas
                    </p>
                  </div>
                </div>
                <span className={`text-3xl font-black ${checklistProgress === 100 ? 'text-green-600' : 'text-brand-600'}`}>
                  {checklistProgress}%
                </span>
              </div>

              <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-white dark:bg-slate-700">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${checklistProgress === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>

              {items.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Nenhum item para hoje neste checklist.</p>
              ) : completedItemsCount === items.length ? (
                <div className="flex flex-col items-center justify-center py-6 text-center mb-2">
                  <Check className="h-10 w-10 text-green-500 mb-2" />
                  <p className="font-bold text-green-700 dark:text-green-400">Tudo concluído por hoje! 🎉</p>
                </div>
              ) : null}

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map(item => {
                    const isCompleted = getCompletionStatus(item.id);
                    const isHighlighted = highlightedItemId === item.id && highlightedDate === formattedSelectedDate;
                    const hasResource = item.resource && item.resource.type !== 'none';
                    const recorrente = isItemRecorrente(item);

                    return (
                      <div
                        key={item.id}
                        ref={el => itemRefs.current[item.id] = el}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          isCompleted
                            ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                            : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
                        } ${isHighlighted ? 'ring-4 ring-brand-500/50 dark:ring-brand-400/50 animate-pulse' : ''}`}
                      >
                        <button
                          onClick={() => handleToggleCompletion(item.id, isCompleted)}
                          disabled={togglingItemId === item.id}
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                            isCompleted
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-700'
                          }`}
                        >
                          {isCompleted && <Check className="h-4 w-4" />}
                        </button>

                        <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          recorrente
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {recorrente ? 'RECORRENTE' : 'PONTUAL'}
                        </span>

                        <span className={`text-sm flex-1 truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                          {item.text}
                        </span>

                        {hasResource && (
                          <button
                            onClick={() => handleOpenResourceModal(item)}
                            className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Como fazer?
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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