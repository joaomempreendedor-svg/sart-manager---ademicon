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
    teamMembers,
    toggleDailyChecklistCompletion,
    isDataLoading
  } = useApp();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // --- DEBUG LOGS INÍCIO ---
  useEffect(() => {
    console.log("--- DailyChecklist Component Debug Logs ---");
    console.log("1. Usuário Logado (AuthContext):", {
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
      db_id: tm.db_id,
      name: tm.name,
      email: tm.email,
      roles: tm.roles,
      isActive: tm.isActive,
      isLegacy: tm.isLegacy,
      hasLogin: tm.hasLogin,
    })));
  }, [user, dailyChecklists, dailyChecklistAssignments, teamMembers]);
  // --- DEBUG LOGS FIM ---

  // Encontrar o teamMember correspondente ao usuário logado
  const userTeamMember = useMemo(() => {
    if (!user) return null;
    return teamMembers.find(tm => {
      // 1. TENTA: match exato de ID (TIPO 2)
      if (tm.id === user.id) return true;
      
      // 2. TENTA: match por email (se TIPO 2 tem email)
      if (tm.email && tm.email === user.email) return true;
      
      // 3. TENTA: é legado e podemos assumir pelo nome? (TIPO 1)
      // Para membros legados, o 'id' é um ID temporário ('legacy_...') e o 'email' pode não existir.
      // Precisamos comparar o nome do usuário logado com o nome do membro da equipe.
      if (tm.isLegacy && tm.name === user.name) return true; 
      
      return false;
    });
  }, [user, teamMembers]);

  const assignedChecklists = useMemo(() => {
    if (!user || !userTeamMember) {
      console.log("🚫 Usuário ou membro da equipe não identificado. Nenhum checklist visível.");
      return [];
    }

    console.log("🔧 LÓGICA ROBUSTA ATIVADA");
    console.log("Consultor logado (TeamMember):", userTeamMember);

    // MODO DE EMERGÊNCIA: Se tudo falhou, mostra CHECKLISTS DE TESTE
    if (dailyChecklists.length === 0 && dailyChecklistAssignments.length === 0) {
      console.log("⚠️ MODO EMERGÊNCIA: Nenhum dado carregado, criando dados locais");
      return [
        {
          id: 'emergency-1',
          title: 'Checklist de Teste (Emergência)',
          is_active: true,
          user_id: user.id, // Usar o ID do usuário logado como fallback
          created_at: new Date().toISOString()
        }
      ];
    }

    // LÓGICA NORMAL melhorada
    const explicitAssignments = dailyChecklistAssignments
      .filter(a => a.consultant_id === userTeamMember.id) // Usar o ID do userTeamMember
      .map(a => a.daily_checklist_id);

    const globalChecklists = dailyChecklists
      .filter(c => !dailyChecklistAssignments.some(a => a.daily_checklist_id === c.id))
      .map(c => c.id);

    const relevantIds = new Set([...explicitAssignments, ...globalChecklists]);

    const uniqueActiveChecklists = dailyChecklists
      .filter(c => c.is_active && relevantIds.has(c.id))
      .sort((a, b) => a.title.localeCompare(b.title));

    console.log(`✅ ${uniqueActiveChecklists.length} checklists visíveis`);
    return uniqueActiveChecklists;
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
        completion.consultant_id === userTeamMember.id && // Usar o ID do userTeamMember
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
            console.log("Minhas atribuições:", dailyChecklistAssignments.filter(a => a.consultant_id === userTeamMember?.id));
            console.log("Meu user ID (Auth):", user?.id);
            console.log("Meu user ID (TeamMember):", userTeamMember?.id);
            
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