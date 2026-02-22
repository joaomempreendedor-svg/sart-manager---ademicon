import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, PhoneCall, Play, StopCircle, MessageSquare, Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColdCallLead, ColdCallResult } from '@/types';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

const COLD_CALL_RESULTS: ColdCallResult[] = ['Não atendeu', 'Número inválido', 'Sem interesse', 'Pedir retorno', 'Conversou', 'Demonstrou Interesse', 'Agendar Reunião'];
const MEETING_MODALITIES = ['Online', 'Presencial', 'Telefone'];

interface ColdCallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ColdCallLead | null;
  onSaveLog: (logData: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at'> & { start_time: string; end_time: string; duration_seconds: number; }, leadId: string) => Promise<void>;
  onUpdateLeadStage: (leadId: string, newStage: Partial<ColdCallLead>) => Promise<void>;
  onCreateCrmLeadFromColdCall: (coldCallLead: ColdCallLead, meeting?: { date?: string; time?: string; modality?: string; notes?: string }) => void;
}

export const ColdCallLogModal: React.FC<ColdCallLogModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveLog,
  onUpdateLeadStage,
  onCreateCrmLeadFromColdCall,
}) => {
  const navigate = useNavigate();
  const [callStartTime, setCallStartTime] = useState<string | null>(null);
  const [callEndTime, setCallEndTime] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<ColdCallResult | ''>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingModality, setMeetingModality] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [contactName, setContactName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCallStartTime(null);
      setCallEndTime(null);
      setCallResult('');
      setMeetingDate('');
      setMeetingTime('');
      setMeetingModality('');
      setMeetingNotes('');
      setError('');
      setCallDuration(0);
      setContactName(lead?.name || lead?.phone || '');
    }
  }, [isOpen, lead]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callStartTime && !callEndTime) {
      interval = setInterval(() => {
        setCallDuration(Math.round((new Date().getTime() - new Date(callStartTime).getTime()) / 1000));
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStartTime, callEndTime]);

  const handleStartCall = () => {
    setCallStartTime(new Date().toISOString());
    setCallEndTime(null);
    setCallDuration(0);
    setError('');
  };

  const handleEndCall = () => {
    if (!callStartTime) {
      setError("Inicie a ligação antes de finalizá-la.");
      return;
    }
    const endTime = new Date().toISOString();
    setCallEndTime(endTime);
    setCallDuration(Math.round((new Date(endTime).getTime() - new Date(callStartTime!).getTime()) / 1000));
  };

  const validateForm = () => {
    if (!lead) {
      setError("Lead não selecionado.");
      return false;
    }
    if (!callStartTime || !callEndTime) {
      setError("A ligação precisa ser iniciada e finalizada.");
      return false;
    }
    if (!callResult) {
      setError("O resultado da ligação é obrigatório.");
      return false;
    }
    if (callResult === 'Agendar Reunião') {
      if (!meetingDate || !meetingTime) {
        setError("Informe data e horário da reunião.");
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSaveLogAndStage = async (): Promise<boolean> => {
    if (!validateForm()) {
      setIsSaving(false);
      return false;
    }

    if (!lead) {
      setIsSaving(false);
      return false;
    }

    setIsSaving(true);
    try {
      const durationSeconds = callStartTime && callEndTime ? Math.round((new Date(callEndTime).getTime() - new Date(callStartTime).getTime()) / 1000) : 0;

      const logData: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at'> & { start_time: string; end_time: string; duration_seconds: number; } = {
        cold_call_lead_id: lead.id,
        start_time: callStartTime!,
        end_time: callEndTime!,
        duration_seconds: durationSeconds,
        result: callResult as ColdCallResult,
        meeting_date: callResult === 'Agendar Reunião' ? (meetingDate || undefined) : undefined,
        meeting_time: callResult === 'Agendar Reunião' ? (meetingTime || undefined) : undefined,
        meeting_modality: callResult === 'Agendar Reunião' ? (meetingModality || undefined) : undefined,
        meeting_notes: callResult === 'Agendar Reunião' ? (meetingNotes || undefined) : undefined,
      };

      await onSaveLog(logData, lead.id);

      let newStageValue: ColdCallLead['current_stage'] = lead.current_stage;
      if (callResult === 'Conversou' || callResult === 'Demonstrou Interesse') newStageValue = 'Conversou';
      else if (callResult === 'Agendar Reunião') newStageValue = 'Reunião Agendada';
      else if (callResult === 'Pedir retorno' || callResult === 'Não atendeu' || callResult === 'Número inválido') newStageValue = 'Tentativa de Contato';
      else if (callResult === 'Sem interesse') newStageValue = 'Tentativa de Contato';

      await onUpdateLeadStage(lead.id, { current_stage: newStageValue });
      toast.success("Ligação registrada e etapa atualizada!");
      return true;
    } catch (err: any) {
      console.error("Erro ao registrar ligação:", err);
      setError(err.message || 'Falha ao registrar a ligação.');
      toast.error(`Erro ao registrar ligação: ${err.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCrmLeadClick = async () => {
    if (!lead) return;

    // Exigir nome antes de enviar ao CRM
    if (!contactName.trim()) {
      setError('Informe um nome para o contato antes de enviar ao CRM.');
      return;
    }

    const savedSuccessfully = await handleSaveLogAndStage();
    if (savedSuccessfully) {
      try {
        // Atualiza o nome do lead antes de enviar ao CRM
        await onUpdateLeadStage(lead.id, { name: contactName.trim() });
        // Envia ao CRM com data/horário
        onCreateCrmLeadFromColdCall(
          { ...lead, name: contactName.trim() },
          { date: meetingDate || undefined, time: meetingTime || undefined, modality: meetingModality || undefined, notes: meetingNotes || undefined }
        );
        onClose();
      } catch (e: any) {
        toast.error(`Erro ao atualizar nome do contato: ${e.message}`);
      }
    }
  };

  const handleGoToCrmLead = () => {
    if (lead?.crm_lead_id) {
      onClose();
      navigate('/consultor/crm', { state: { highlightLeadId: lead.crm_lead_id } });
    } else {
      toast.error("ID do Lead no CRM não encontrado.");
    }
  };

  if (!isOpen || !lead) return null;

  const formatDurationDisplay = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const shouldShowCrmActions = (callResult === 'Agendar Reunião' || callResult === 'Demonstrou Interesse');
  const showCreateCrmLeadButton = shouldShowCrmActions && !lead.crm_lead_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Ligação: {lead.name}</DialogTitle>
          <DialogDescription>
            Registre o resultado da ligação e envie ao CRM quando aplicável.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSaveLogAndStage(); }}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <Label>Status da Ligação:</Label>
              {callStartTime && !callEndTime ? (
                <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                  <Play className="w-4 h-4 mr-1" /> Em Andamento
                </span>
              ) : (
                <span className="flex items-center text-gray-500 dark:text-gray-400 font-medium">
                  <StopCircle className="w-4 h-4 mr-1" /> Finalizada
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Button type="button" onClick={handleStartCall} disabled={!!callStartTime} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Play className="w-4 h-4 mr-2" /> Iniciar Ligação
              </Button>
              <Button type="button" onClick={handleEndCall} disabled={!callStartTime || !!callEndTime} variant="destructive">
                <StopCircle className="w-4 h-4 mr-2" /> Finalizar Ligação
              </Button>
            </div>
            {callStartTime && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Duração: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDurationDisplay(callDuration)}</span>
              </div>
            )}
            <div>
              <Label htmlFor="callResult">Resultado da Ligação *</Label>
              <Select value={callResult} onValueChange={(value: ColdCallResult) => setCallResult(value)} required disabled={!callEndTime}>
                <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                  {COLD_CALL_RESULTS.map(result => (
                    <SelectItem key={result} value={result}>{result}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {shouldShowCrmActions && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Nome do contato para CRM *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex: Maria Souza"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Confirme ou edite o nome do contato antes de enviar ao CRM.
                  </p>
                </div>

                {callResult === 'Agendar Reunião' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meetingDate">Data da reunião *</Label>
                      <Input
                        id="meetingDate"
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meetingTime">Horário da reunião *</Label>
                      <Input
                        id="meetingTime"
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="meetingModality">Modalidade</Label>
                      <Select value={meetingModality} onValueChange={setMeetingModality}>
                        <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Selecione a modalidade" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                          {MEETING_MODALITIES.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="meetingNotes">Observações</Label>
                      <Textarea
                        id="meetingNotes"
                        rows={3}
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            {(callResult === 'Agendar Reunião' || callResult === 'Demonstrou Interesse') && lead?.crm_lead_id ? (
              <Button type="button" onClick={handleGoToCrmLead} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                <ChevronRight className="w-4 h-4 mr-2" />
                <span>Ir para CRM</span>
              </Button>
            ) : (callResult === 'Agendar Reunião' || callResult === 'Demonstrou Interesse') && !lead?.crm_lead_id ? (
              <Button
                type="button"
                onClick={handleCreateCrmLeadClick}
                disabled={isSaving || !callEndTime || !contactName.trim()}
                className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                <span>{isSaving ? 'Enviando...' : 'Enviar para CRM'}</span>
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving || !callEndTime} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>{isSaving ? 'Salvando...' : 'Salvar Ligação'}</span>
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};