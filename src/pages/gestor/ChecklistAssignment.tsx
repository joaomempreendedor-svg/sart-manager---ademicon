import React, { useState, useMemo, useCallback } from 'react';
import { Search, Users, ListChecks, Check, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useApp } from '@/context/AppContext';
import { TeamRole } from '@/types';

const ALL_CONSULTANT_ROLES: TeamRole[] = ['CONSULTOR', 'Prévia', 'Autorizado'];

export const ChecklistAssignment = () => {
  const {
    teamMembers,
    dailyChecklists,
    dailyChecklistAssignments,
    assignDailyChecklistToConsultant,
    unassignDailyChecklistFromConsultant,
    isDataLoading,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<TeamRole | 'all'>('all');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const consultants = useMemo(() => {
    return teamMembers
      .filter(m => m.isActive && ALL_CONSULTANT_ROLES.some(role => m.roles.includes(role)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  const activeChecklists = useMemo(() => {
    return dailyChecklists
      .filter(checklist => checklist.is_active)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [dailyChecklists]);

  const filteredConsultants = useMemo(() => {
    let filtered = consultants;

    if (filterRole !== 'all') {
      filtered = filtered.filter(c => c.roles.includes(filterRole));
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cpf?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [consultants, searchTerm, filterRole]);

  const getAssignedChecklistsForConsultant = useCallback((consultantId: string) => {
    return new Set(
      dailyChecklistAssignments
        .filter(assignment => assignment.consultant_id === consultantId)
        .map(assignment => assignment.daily_checklist_id)
    );
  }, [dailyChecklistAssignments]);

  const handleToggleAssignment = async (checklistId: string, consultantId: string, isAssigned: boolean) => {
    setIsSavingAssignment(true);
    try {
      if (isAssigned) {
        await unassignDailyChecklistFromConsultant(checklistId, consultantId);
      } else {
        await assignDailyChecklistToConsultant(checklistId, consultantId);
      }
    } catch (error) {
      console.error("Erro ao atualizar atribuição:", error);
      alert("Falha ao atualizar a atribuição. Tente novamente.");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const selectedConsultant = useMemo(() => {
    return consultants.find(c => c.id === selectedConsultantId);
  }, [consultants, selectedConsultantId]);

  const assignedChecklistsToSelected = useMemo(() => {
    if (!selectedConsultantId) return new Set();
    return getAssignedChecklistsForConsultant(selectedConsultantId);
  }, [selectedConsultantId, getAssignedChecklistsForConsultant]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Atribuição de Checklists</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Defina quais checklists cada consultor deve visualizar.</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Consultant List */}
        <aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto flex-shrink-0 custom-scrollbar">
          <div className="p-4 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-gray-100 dark:border-slate-700">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar consultor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 p-2 border rounded bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as TeamRole | 'all')}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Filtrar por Cargo" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Cargos</SelectItem>
                {ALL_CONSULTANT_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-2">
            {filteredConsultants.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum consultor encontrado.</p>
            ) : (
              filteredConsultants.map(consultant => (
                <button
                  key={consultant.id}
                  onClick={() => setSelectedConsultantId(consultant.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${
                    selectedConsultantId === consultant.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <div>
                    <p>{consultant.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{consultant.roles.join(', ')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Pane: Checklist Assignment */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selectedConsultantId ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Users className="w-16 h-16 mb-4" />
              <p className="text-lg">Selecione um consultor para gerenciar seus checklists.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Checklists para {selectedConsultant?.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Marque os checklists que este consultor deve ter acesso. Checklists não atribuídos a ninguém são considerados "globais" e visíveis para todos.
              </p>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                    <ListChecks className="w-5 h-5 mr-2 text-brand-500" />
                    Checklists Ativos
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {activeChecklists.length === 0 ? (
                    <p className="p-6 text-center text-gray-400">Nenhum checklist ativo encontrado.</p>
                  ) : (
                    activeChecklists.map(checklist => {
                      const isAssigned = assignedChecklistsToSelected.has(checklist.id);
                      return (
                        <div key={checklist.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`checklist-${checklist.id}-${selectedConsultantId}`}
                              checked={isAssigned}
                              onCheckedChange={() => handleToggleAssignment(checklist.id, selectedConsultantId, isAssigned)}
                              disabled={isSavingAssignment}
                              className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                            />
                            <Label htmlFor={`checklist-${checklist.id}-${selectedConsultantId}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {checklist.title}
                            </Label>
                          </div>
                          {isSavingAssignment && (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};