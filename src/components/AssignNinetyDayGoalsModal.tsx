import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { TeamMember, GoalStage } from '@/types';
import { X, Save, Loader2, CalendarDays, UserRound, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface AssignNinetyDayGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssignNinetyDayGoalsModal: React.FC<AssignNinetyDayGoalsModalProps> = ({ isOpen, onClose }) => {
  const { teamMembers, consultantGoalsStructure, startNinetyDayPlan, toggleNinetyDayGoalCompletion } = useApp();
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));
  }, [teamMembers]);

  const selectedConsultant = useMemo(() => {
    return teamMembers.find(m => m.id === selectedConsultantId);
  }, [selectedConsultantId, teamMembers]);

  const hasActivePlan = useMemo(() => {
    if (!selectedConsultant?.ninetyDayPlanStartDate) return false;
    const startDate = new Date(selectedConsultant.ninetyDayPlanStartDate);
    const ninetyDaysLater = new Date(startDate);
    ninetyDaysLater.setDate(startDate.getDate() + 90);
    return new Date() <= ninetyDaysLater;
  }, [selectedConsultant]);

  const handleStartPlan = async () => {
    if (!selectedConsultantId) {
      setError("Selecione um consultor para iniciar o plano.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja iniciar o plano de 90 dias para ${selectedConsultant?.name}? Isso resetará qualquer progresso anterior.`)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await startNinetyDayPlan(selectedConsultantId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar o plano de 90 dias.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGoal = async (goalItemId: string) => {
    if (!selectedConsultantId) return;
    setIsSaving(true);
    setError(null);
    try {
      await toggleNinetyDayGoalCompletion(selectedConsultantId, goalItemId);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar o progresso da meta.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Atribuir Plano de 90 Dias</DialogTitle>
          <DialogDescription>
            Inicie ou monitore o plano de metas para os primeiros 90 dias de um consultor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="consultant-select" className="mb-2 block">Selecione o Consultor</Label>
            <Select value={selectedConsultantId || ''} onValueChange={setSelectedConsultantId}>
              <SelectTrigger id="consultant-select" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Escolha um consultor" />
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

          {selectedConsultant && (
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <UserRound className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-lg">{selectedConsultant.name}</h3>
              </div>
              {selectedConsultant.ninetyDayPlanStartDate ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Plano iniciado em: {new Date(selectedConsultant.ninetyDayPlanStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  {hasActivePlan ? (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Plano de 90 dias ativo.
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center mt-1">
                      <X className="w-4 h-4 mr-2" />
                      Plano de 90 dias expirado.
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleStartPlan} 
                    disabled={isSaving}
                    className="mt-4 w-full dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {isSaving ? 'Reiniciando...' : 'Reiniciar Plano de 90 Dias'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleStartPlan} 
                  disabled={isSaving}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-2" />}
                  {isSaving ? 'Iniciando...' : 'Iniciar Plano de 90 Dias'}
                </Button>
              )}
            </div>
          )}

          {selectedConsultant && selectedConsultant.ninetyDayPlanStartDate && (
            <div className="mt-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Progresso do Plano</h3>
              <ScrollArea className="h-[300px] pr-4">
                {consultantGoalsStructure.map(stage => (
                  <div key={stage.id} className="mb-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{stage.title}</h4>
                    <div className="space-y-2">
                      {stage.items.map(item => {
                        const isCompleted = selectedConsultant.ninetyDayGoalsProgress?.[item.id] || false;
                        return (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`goal-${item.id}`}
                              checked={isCompleted}
                              onCheckedChange={() => handleToggleGoal(item.id)}
                              disabled={isSaving}
                              className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                            />
                            <Label htmlFor={`goal-${item.id}`} className={`text-sm ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                              {item.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm font-medium text-red-800 dark:text-red-200 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};