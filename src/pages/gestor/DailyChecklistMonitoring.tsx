import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2, User, CheckCircle2, XCircle, Eye, Video, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DailyChecklistItem, DailyChecklistItemResourceType } from '@/types';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal';
import { Button } from '@/components/ui/button';

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
    toggleDailyChecklistCompletion
  } = useApp();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);

  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedResourceItem, setSelectedResourceItem] = useState<DailyChecklistItem | null>(null);

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // ATUALIZADO: Incluindo 'Secretaria' na lista de membros monitoráveis
  const assignableMembers = useMemo(() => {
    return teamMembers
      .filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado') || m.roles.includes('Secretaria')))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Set initial selected consultant if available
  React.useEffect(() => {
    if (assignableMembers.length > 0 && !selectedConsultantId) {
      setSelectedConsultantId(assignableMembers[0].id);
    }
  }, [assignableMembers, selectedConsultantId]);

  const assignedChecklists = useMemo(() => {
    if (!selectedConsultantId) return [];

    const explicitAssignments = dailyChecklistAssignments
      .filter(assignment => assignment.consultant_id === selectedConsultantId)
      .map(assignment => assignment.daily_checklist_id);

    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAssignments = dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id);
      return !hasAssignments;
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
    await toggleDailyChecklistCompletion(itemId, formattedSelectedDate, !currentStatus, selectedConsultantId);
  };

  const navigateDay = (offset: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    if (!selectedConsultantId) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0 };

    const relevantItems: DailyChecklistItem[] = assignedChecklists.flatMap(checklist => 
      dailyChecklistItems.filter(item => item.daily_checklist_id === checklist.id && item.is_active)
    );

    const total = relevantItems.length;
    const completed = relevantItems.filter(item => 
      dailyChecklistCompletions.some(
        completion =>
          completion.daily_checklist_item_id === item.id &&
          completion.consultant_id === selectedConsultantId &&
          completion.date === formattedSelectedDate &&
          completion.done
      )
    ).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [selectedConsultantId, assignedChecklists, dailyChecklistItems, dailyChecklistCompletions, formattedSelectedDate]);

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
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoramento de Checklists Diários</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso dos checklists diários de seus consultores e secretaria.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <User className="w-5 h-5 text-brand-500" />
          <Select value={selectedConsultantId || ''} onValueChange={setSelectedConsultantId}>
            <SelectTrigger className="w-[220px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <SelectValue placeholder="Selecione o Membro" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
              {assignableMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.roles.join(', ')})
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
          <p className="mt-4 text-gray-500 dark:text-gray-400">Selecione um membro da equipe para visualizar seus checklists.</p>
        </div>
      ) : assignedChecklists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist diário atribuído a este membro ou ativo.</p>
          <p className="text-sm text-gray-400">Verifique as configurações de atribuição de checklists.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Progresso Diário Geral</h2>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{completedDailyTasks}/{totalDailyTasks} Concluídas</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${dailyProgress}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{dailyProgress}% do checklist do dia está completo.</p>
          </div>

          <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
            {assignedChecklists.map(checklist => {
              const items = getItemsForChecklist(checklist.id);
              const completedItemsCount = items.filter(item => getCompletionStatus(item.id)).length;
              const checklistProgress = items.length > 0 ? Math.round((completedItemsCount / items.length) * 100) : 0;

              return (
                <div key={checklist.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-4">
                  <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{checklist.title}</h3>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded">{checklistProgress}% Concluído</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${checklistProgress}%` }}></div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {items.map(item => {
                      const isCompleted = getCompletionStatus(item.id);
                      return (
                        <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
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
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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