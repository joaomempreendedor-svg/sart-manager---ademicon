import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Loader2 } from 'lucide-react';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export const DailyChecklist = () => {
  const { 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    dailyChecklistCompletions,
    teamMembers, // Adicionado para logs
    toggleDailyChecklistCompletion,
    isDataLoading
  } = useApp();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // --- DEBUG LOGS INÍCIO ---
  useEffect(() => {
    console.log("--- DailyChecklist Component Debug Logs ---");
    console.log("1. Usuário Logado:", {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      isActive: user?.isActive,
    });
    console.log("2. Todos os DailyChecklists existentes:", dailyChecklists.map(cl => ({
      id: cl.id,
      title: cl.title,
      is_active: cl.is_active,
      user_id: cl.user_id,
    })));
    console.log("3. Todas as DailyChecklistAssignments:", dailyChecklistAssignments.map(assign => ({
      id: assign.id,
      daily_checklist_id: assign.daily_checklist_id,
      consultant_id: assign.consultant_id,
    })));
    console.log("4. Consultores disponíveis na equipe (teamMembers):", teamMembers.map(tm => ({
      id: tm.id,
      name: tm.name,
      roles: tm.roles,
      isActive: tm.isActive,
    })));
  }, [user, dailyChecklists, dailyChecklistAssignments, teamMembers]);
  // --- DEBUG LOGS FIM ---

  // Adicione após o useEffect dos logs:
  console.log("6. Verificando match de IDs:");
  console.log("ID do usuário logado:", user?.id);
  console.log("IDs dos teamMembers:", teamMembers.map(tm => ({ id: tm.id, name: tm.name })));

  const isUserInTeam = teamMembers.some(tm => tm.id === user?.id);
  console.log("Usuário está na lista de teamMembers?", isUserInTeam);

  if (isUserInTeam) {
    const userTeamMember = teamMembers.find(tm => tm.id === user?.id);
    console.log("Detalhes do usuário em teamMembers:", userTeamMember);
  }

  const assignedChecklists = useMemo(() => {
    if (!user) {
      console.log("Usuário não logado");
      return [];
    }

    console.log("⚠️ MODO TEMPORÁRIO ATIVADO: Ignorando verificação de teamMembers devido a erros 500");
    console.log("ID do usuário:", user.id);

    // 1. Checklists explicitamente atribuídos ao usuário
    const explicitAssignments = dailyChecklistAssignments
      .filter(assignment => {
        const match = assignment.consultant_id === user.id;
        if (match) {
          console.log(`✅ Checklist atribuído: ${assignment.daily_checklist_id}`);
        }
        return match;
      })
      .map(assignment => assignment.daily_checklist_id);

    console.log("IDs de checklists atribuídos explicitamente:", explicitAssignments);

    // 2. Checklists GLOBAIS (sem atribuição específica)
    const globalChecklists = dailyChecklists.filter(checklist => {
      const hasAnyAssignment = dailyChecklistAssignments.some(
        a => a.daily_checklist_id === checklist.id
      );
      
      if (!hasAnyAssignment) {
        console.log(`🌍 Checklist global encontrado: ${checklist.title} (ID: ${checklist.id})`);
      }
      
      return !hasAnyAssignment;
    }).map(checklist => checklist.id);

    console.log("IDs de checklists globais:", globalChecklists);

    // 3. Combinar ambas as listas
    const relevantChecklistIds = new Set([...explicitAssignments, ...globalChecklists]);
    console.log("Total de IDs relevantes:", Array.from(relevantChecklistIds));

    // 4. Filtrar checklists ativos
    const finalChecklists = dailyChecklists
      .filter(checklist => {
        const isActive = checklist.is_active;
        const isRelevant = relevantChecklistIds.has(checklist.id);
        
        if (isActive && isRelevant) {
          console.log(`🎯 INCLUÍDO: ${checklist.title} (Ativo: ${isActive}, Relevante: ${isRelevant})`);
        }
        
        return isActive && isRelevant;
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    console.log("✅ CHECKLISTS FINAIS para mostrar:", finalChecklists.map(c => c.title));
    console.log("Total de checklists para exibir:", finalChecklists.length);

    return finalChecklists;
  }, [dailyChecklists, dailyChecklistAssignments, user]);

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
    <div className="p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Checklist Diário</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe suas tarefas e metas do dia.</p>
        {/* ADICIONE APÓS O TÍTULO DA PÁGINA */}
        <button 
          onClick={() => {
            console.log("=== TESTE FORÇADO ===");
            console.log("Todos checklists ativos:", dailyChecklists.filter(c => c.is_active));
            console.log("Minhas atribuições:", dailyChecklistAssignments.filter(a => a.consultant_id === user?.id));
            console.log("Meu user ID:", user?.id);
            
            // Mostrar todos checklists ativos na tela (forçado)
            const allActive = dailyChecklists.filter(c => c.is_active);
            alert(`Checklists ativos no sistema: ${allActive.length}\n${allActive.map(c => c.title).join(', ')}`);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded-lg mt-4"
        >
          TESTE: Ver Todos Checklists
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex items-center justify-between">
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

      <div className="space-y-6">
        {assignedChecklists.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist diário atribuído a você ou ativo.</p>
            <p className="text-sm text-gray-400">Entre em contato com seu gestor para mais informações.</p>
          </div>
        ) : (
          assignedChecklists.map(checklist => (
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
                        id={`item-${item.id}`}
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleCompletion(item.id, isCompleted)}
                        className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                      />
                      <Label htmlFor={`item-${item.id}`} className={`text-sm font-medium leading-none ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                        {item.text}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};