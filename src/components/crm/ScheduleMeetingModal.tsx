import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LeadTask, CrmLead, TeamMember, ConsultantEvent } from '@/types';
import { X, Save, Loader2, Calendar, Clock, Users, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  currentMeeting?: LeadTask | null; // NOVO: Prop opcional para edição
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose, lead, currentMeeting }) => {
  const { addLeadTask, updateLeadTask, teamMembers, leadTasks, consultantEvents, crmOwnerUserId } = useApp();
  const [title, setTitle] = useState(currentMeeting?.title || 'Reunião com Lead');
  const [date, setDate] = useState<string>(() => {
    if (currentMeeting?.meeting_start_time) {
      return new Date(currentMeeting.meeting_start_time).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>(() => {
    if (currentMeeting?.meeting_start_time) {
      const d = new Date(currentMeeting.meeting_start_time);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    }
    return '09:00';
  });
  const [endTime, setEndTime] = useState<string>(() => {
    if (currentMeeting?.meeting_end_time) {
      const d = new Date(currentMeeting.meeting_end_time);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    }
    return '10:00';
  });
  const [isSaving, setIsSaving] = useState(false);

  // Define formatTime antes de qualquer uso
  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }

  // NOVO: Seleção de Gestor e agenda do gestor
  const gestores: TeamMember[] = useMemo(() => {
    // Normaliza papéis e garante inclusão do gestor principal via crmOwnerUserId
    const normalized = teamMembers.filter(m => {
      const roles = (m.roles || []).map(r => r.toLowerCase());
      return m.isActive && (roles.includes('gestor') || roles.includes('admin'));
    });

    // Fallback: incluir o gestor principal mesmo que não esteja em teamMembers
    if (crmOwnerUserId && !normalized.some(m => m.id === crmOwnerUserId)) {
      const existente = teamMembers.find(m => m.id === crmOwnerUserId);
      if (existente) {
        normalized.push(existente);
      } else {
        normalized.push({
          id: crmOwnerUserId,
          name: 'Gestor',
          roles: ['Gestor'],
          isActive: true,
        } as TeamMember);
      }
    }

    return normalized;
  }, [teamMembers, crmOwnerUserId]);

  const [selectedGestorId, setSelectedGestorId] = useState<string | null>(gestores[0]?.id || null);

  // Atualiza o gestor selecionado quando a lista mudar e não houver seleção
  useEffect(() => {
    if (!selectedGestorId && gestores.length > 0) {
      setSelectedGestorId(gestores[0].id);
    }
  }, [gestores, selectedGestorId]);

  const [gestorEvents, setGestorEvents] = useState<{ id: string; title: string; start_time: string; end_time: string; description?: string }[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);

  // Utilitário: checa sobreposição de horários
  const hasOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
    return aStart < bEnd && bStart < aEnd;
  };

  // Conflitos do consultor (reuniões de leads e eventos pessoais)
  const selectedStart = useMemo(() => new Date(`${date}T${startTime || '00:00'}:00`), [date, startTime]);
  const selectedEnd = useMemo(() => new Date(`${date}T${endTime || '00:00'}:00`), [date, endTime]);
  const consultantId = lead.consultant_id || '';

  const conflicts = useMemo(() => {
    const items: string[] = [];

    // Conflitos com agenda do gestor (já carregada via função)
    if (selectedGestorId) {
      gestorEvents.forEach(ev => {
        const evStart = new Date(ev.start_time);
        const evEnd = new Date(ev.end_time);
        if (hasOverlap(selectedStart, selectedEnd, evStart, evEnd)) {
          items.push(`Gestor ocupado: ${formatTime(ev.start_time)} - ${formatTime(ev.end_time)} (${ev.title || 'Evento'})`);
        }
      });
    }

    // Conflitos com reuniões do consultor (leadTasks)
    leadTasks.filter(t =>
      t.type === 'meeting' &&
      t.user_id === consultantId &&
      t.meeting_start_time && t.meeting_end_time &&
      new Date(t.meeting_start_time).toISOString().split('T')[0] === date
    ).forEach(t => {
      const tStart = new Date(t.meeting_start_time!);
      const tEnd = new Date(t.meeting_end_time!);
      if (hasOverlap(selectedStart, selectedEnd, tStart, tEnd)) {
        items.push(`Você já tem reunião: ${formatTime(t.meeting_start_time!)} - ${formatTime(t.meeting_end_time!)} (${t.title})`);
      }
    });

    // Conflitos com eventos pessoais do consultor
    consultantEvents.filter(ev =>
      ev.user_id === consultantId &&
      new Date(ev.start_time).toISOString().split('T')[0] === date
    ).forEach(ev => {
      const evStart = new Date(ev.start_time);
      const evEnd = new Date(ev.end_time);
      if (hasOverlap(selectedStart, selectedEnd, evStart, evEnd)) {
        items.push(`Você está ocupado: ${formatTime(ev.start_time)} - ${formatTime(ev.end_time)} (${ev.title})`);
      }
    });

    return items;
  }, [selectedGestorId, gestorEvents, selectedStart, selectedEnd, leadTasks, consultantEvents, consultantId, date]);

  const hasConflicts = conflicts.length > 0;

  useEffect(() => {
    // Carrega agenda do gestor selecionado para o dia
    const loadAgenda = async () => {
      if (!selectedGestorId || !date) {
        setGestorEvents([]);
        return;
      }
      setIsLoadingAgenda(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-manager-availability', {
          body: {
            manager_id: selectedGestorId,
            start_date: date,
            end_date: date,
          },
        });
        if (error) {
          toast.error('Falha ao carregar agenda do gestor.');
          console.error('[ScheduleMeetingModal] invoke error', error);
        } else {
          setGestorEvents((data?.events || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            start_time: e.start_time,
            end_time: e.end_time,
          })));
        }
      } finally {
        setIsLoadingAgenda(false);
      }
    };
    loadAgenda();
  }, [selectedGestorId, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error('Preencha data e horários.');
      return;
    }
    if (hasConflicts) {
      toast.error('Horário indisponível. Ajuste o horário para continuar.');
      return;
    }
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    if (startDateTime >= endDateTime) {
      toast.error('A hora de início deve ser anterior à hora de término.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<LeadTask> = {
        title,
        type: 'meeting',
        meeting_start_time: startDateTime.toISOString(),
        meeting_end_time: endDateTime.toISOString(),
      };

      if (currentMeeting) {
        await updateLeadTask(currentMeeting.id, payload);
        toast.success('Reunião atualizada!');
      } else {
        await addLeadTask({
          lead_id: lead.id,
          user_id: lead.consultant_id || '', // criador/consultor
          title: title || 'Reunião',
          type: 'meeting',
          meeting_start_time: startDateTime.toISOString(),
          meeting_end_time: endDateTime.toISOString(),
        });
        toast.success('Reunião criada!');
      }

      onClose();
    } catch (err: any) {
      console.error('[ScheduleMeetingModal] save error', err);
      toast.error(err.message || 'Falha ao salvar reunião.');
    } finally {
      setIsSaving(false);
    }
  };

  // NOVO: Convidar Gestor (adiciona manager_id e status pendente)
  const handleInviteGestor = async () => {
    if (!selectedGestorId) {
      toast.error('Selecione um gestor para convidar.');
      return;
    }
    if (!date || !startTime || !endTime) {
      toast.error('Preencha data e horários.');
      return;
    }
    if (hasConflicts) {
      toast.error('Horário indisponível. Ajuste o horário para continuar.');
      return;
    }
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    if (startDateTime >= endDateTime) {
      toast.error('A hora de início deve ser anterior à hora de término.');
      return;
    }

    setIsSaving(true);
    try {
      if (currentMeeting) {
        await updateLeadTask(currentMeeting.id, {
          manager_id: selectedGestorId,
          manager_invitation_status: 'pending',
        });
        toast.success('Convite ao gestor enviado!');
      } else {
        await addLeadTask({
          lead_id: lead.id,
          user_id: lead.consultant_id || '',
          title: title || 'Reunião',
          type: 'meeting',
          meeting_start_time: startDateTime.toISOString(),
          meeting_end_time: endDateTime.toISOString(),
          manager_id: selectedGestorId,
          manager_invitation_status: 'pending',
        });
        toast.success('Reunião criada e convite ao gestor enviado!');
      }
      onClose();
    } catch (err: any) {
      console.error('[ScheduleMeetingModal] invite error', err);
      toast.error(err.message || 'Falha ao convidar gestor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>Defina data e horário, veja a agenda do gestor e convide-o se necessário.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </div>
              <div>
                <Label htmlFor="startTime">Início</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime">Término</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </div>
            </div>

            {/* MENSAGEM DE CONFLITO */}
            {hasConflicts && (
              <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Horário indisponível</p>
                <ul className="list-disc list-inside space-y-1">
                  {conflicts.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2">Ajuste o horário ou escolha outro dia.</p>
              </div>
            )}

            {/* NOVO: Selecionar Gestor e ver agenda */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-2">
              <Label>Convidar Gestor</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <Select value={selectedGestorId || 'none'} onValueChange={(val) => setSelectedGestorId(val === 'none' ? null : val)}>
                    <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione um gestor" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                      <SelectItem value="none">Sem gestor</SelectItem>
                      {gestores.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Agenda do Gestor ({date})
                </div>
              </div>

              <div className="mt-2 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-2">
                {isLoadingAgenda ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando agenda...
                  </div>
                ) : selectedGestorId ? (
                  gestorEvents.length === 0 ? (
                    <div className="text-xs text-gray-600 dark:text-gray-400">Sem conflitos na data selecionada.</div>
                  ) : (
                    <ul className="space-y-1">
                      {gestorEvents.map(ev => (
                        <li key={ev.id} className="text-xs flex items-center justify-between">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {formatTime(ev.start_time)} - {formatTime(ev.end_time)}
                          </div>
                          <div className="truncate ml-2 text-gray-700 dark:text-gray-300">{ev.title}</div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="text-xs text-gray-600 dark:text-gray-400">Selecione um gestor para visualizar a agenda.</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={handleInviteGestor} disabled={!selectedGestorId || isSaving || hasConflicts} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Convidar Gestor
                </Button>
              </div>
            </div>

            { /* Mensagem: se houver conflitos visíveis, o consultor pode ajustar horários. */ }
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || hasConflicts} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSaving ? 'Salvando...' : 'Salvar Reunião'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};