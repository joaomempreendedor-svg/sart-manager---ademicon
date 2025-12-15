import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2, User, CheckCircle2, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export const DailyChecklistMonitoring = () => {
  const {
    dailyChecklists,
    dailyChecklistItems,
    dailyChecklistAssignments,
    dailyChecklistCompletions,
    teamMembers,
    isDataLoading,
    toggleDailyChecklistCompletion // Gestor pode marcar como concluído também
  } = useApp();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const consultants = useMemo(() => {
    return teamMembers
      .filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Set initial selected consultant if available
  React.useEffect(() => {
    if (consultants.length > 0 && !selectedConsultantId) {
      setSelectedConsultantId(consultants[0].id);
    }
  }, [consultants, selectedConsultantId]);

  const assignedChecklists = useMemo(() => {
    if (!selectedConsultantId) return [];

    // Find checklists explicitly assigned to the selected consultant
    const explicitAssignments = dailyChecklistAssignments
      .filter(assignment => assignment.consultant_id === selectedConsultantId)
      .map(assignment => assignment.daily_checklist_id);

    // Find global checklists (not assigned to anyone specifically)
    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAssignments = dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id);
      return !hasAssignments; // If no assignments exist for this checklist, it's global
    }).map(checklist => checklist.id);

    const relevantChecklistIds = new Set([...explicitAssignments, ...globalChecklists]);

    return dailyChecklists
      .filter(checklist => checklist.is_active && relevantChecklistIds.has(checklist.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [dailyChecklists, dailyChecklistAssignments, selectedConsultantId]);

  const getItemsForChecklist = useCallback((checklistId: string) => {
    return dailyChecklistItems
      .filter(item => item.daily_checklist_id === checklistId && item.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [dailyChecklistItems]);

  const getCompletionStatus = useCallback((itemId: string) => {
    if (!selectedConsultantId) return false;
    return dailyChecklistCompletions.some(
      completion =>
        completion.daily_checklist_item_id === itemId &&
        completion.consultant_id === selectedConsultantId &&
        completion.date === formattedSelectedDate &&
        completion.done
    );
  }, [dailyChecklistCompletions, selectedConsultantId, formattedSelectedDate]);

  const handleToggleCompletion = async (itemId: string, currentStatus: boolean) => {
    if (!selectedConsultantId) return;
    await toggleDailyChecklistCompletion(itemId, formattedSelectedDate, !currentStatus);
  };

  const navigateDay = (offset: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoramento de Checklists Diários</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso dos checklists diários de seus consultores.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <User className="w-5 h-5 text-brand-500" />
          <Select value={selectedConsultantId || ''} onValueChange={setSelectedConsultantId}>
            <SelectTrigger className="w-[180px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <SelectValue placeholder="Selecione o Consultor" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
              {consultants.map(consultant => (
                <SelectItem key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto">
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
      </div>

      {!selectedConsultantId ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <User className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Selecione um consultor para visualizar seus checklists.</p>
        </div>
      ) : assignedChecklists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist diário atribuído a este consultor ou ativo.</p>
          <p className="text-sm text-gray-400">Verifique as configurações de atribuição de checklists.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignedChecklists.map(checklist => (
            <div key={checklist.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{checklist.title}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {getItemsForChecklist(checklist.id).map(item => {
                  const isCompleted = getCompletionStatus(item.id);
                  return (
                    <div key={item.id} className="p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <Checkbox
                        id={`item-${item.id}-${selectedConsultantId}`}
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleCompletion(item.id, isCompleted)}
                        className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                      />
                      <Label htmlFor={`item-${item.id}-${selectedConsultantId}`} className={`text-sm font-medium leading-none ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                        {item.text}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};