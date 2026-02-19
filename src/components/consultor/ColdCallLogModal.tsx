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
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

const COLD_CALL_RESULTS: ColdCallResult[] = ['Não atendeu', 'Número inválido', 'Sem interesse', 'Pedir retorno', 'Conversou', 'Agendar Reunião'];
const MEETING_MODALITIES = ['Online', 'Presencial', 'Telefone'];

interface ColdCallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ColdCallLead | null;
  onSaveLog: (logData: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at'> & { start_time: string; end_time: string; duration_seconds: number; }, leadId: string) => Promise<void>;
  onUpdateLeadStage: (leadId: string, newStage: Partial<ColdCallLead>) => Promise<void>;
  onCreateCrmLeadFromColdCall: (coldCallLead: ColdCallLead) => void; // NOVO: Tipo de retorno alterado
}

export const ColdCallLogModal: React.FC<ColdCallLogModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveLog,
  onUpdateLeadStage,
  onCreateCrmLeadFromColdCall,
}) => {
  const navigate = useNavigate(); // Inicializar useNavigate
  const [callStartTime, setCallStartTime] = useState<string | null>(null);
  const [callEndTime, setCallEndTime] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<ColdCallResult | ''>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingModality, setMeetingModality] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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
    }
  }, [isOpen]);

  const handleStartCall = () => {
    setCallStartTime(new Date().toISOString());
    setCallEndTime(null);
    setError('');
  };

  const handleEndCall = () => {
    if (!callStartTime) {
      setError("Inicie a ligação antes de finalizá-la.");
      return;
    }
    setCallEndTime(new Date().toISOString());
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
      if (!meetingDate || !meetingTime || !meetingModality) {
        setError("Data, hora e modalidade da reunião são obrigatórios.");
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSaveLogAndStage = async (): Promise<boolean> => { // Retorna Promise<boolean>
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
        meeting_date: meetingDate || undefined,
        meeting_time: meetingTime || undefined,
        meeting_modality: meetingModality || undefined,
        meeting_notes: meetingNotes.trim() || undefined,
      };
      
      await onSaveLog(logData, lead.id);

      let newStageValue: ColdCallLead['current_stage'] = lead.current_stage;
      if (callResult === 'Conversou') newStageValue = 'Conversou';
      else if (callResult === 'Agendar Reunião') newStageValue = 'Reunião Agendada';
      else if (callResult === 'Pedir retorno' || callResult === 'Não atendeu') newStageValue = 'Tentativa de Contato';
      else if (callResult === 'Sem interesse' || callResult === 'Número inválido') newStageValue = 'Base Fria';

      await onUpdateLeadStage(lead.id, { current_stage: newStageValue });
      toast.success("Ligação registrada e etapa atualizada!");
      
      return true; // Indica sucesso
    } catch (err: any) {
      console.error("Erro ao registrar ligação:", err);
      setError(err.message || 'Falha ao registrar a ligação.');
      toast.error(`Erro ao registrar ligação: ${err.message}`);
      return false; // Indica falha
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCrmLeadClick = async () => { // Made async
    if (!lead) return;

    const savedSuccessfully = await handleSaveLogAndStage(); // Primeiro, salva o log
    if (savedSuccessfully) {
      onCreateCrmLeadFromColdCall(lead); // Em seguida, chama o handler do ColdCallPage
      onClose(); // Fecha este modal
    }
  };

  if (!isOpen || !lead) return null;

  const durationSeconds = callStartTime && callEndTime ? Math.round((new Date(callEndTime).getTime() - new Date(callStartTime).getTime()) / 1000) : 0;
  // O botão "Criar Lead no CRM" aparece se o resultado for "Agendar Reunião" E o lead ainda não tiver um crm_lead_id
  const showCreateCrmLeadButton = callResult === 'Agendar Reunião' && !lead.crm_lead_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Ligação: {lead.name}</DialogTitle>
          <DialogDescription>
            Registre o resultado da ligação e agende uma reunião, se aplicável.
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
            {callStartTime && callEndTime && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Duração: {durationSeconds} segundos
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

            {callResult === 'Agendar Reunião' && (
              <div className="grid gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Detalhes da Reunião</h3>
                <div>
                  <Label htmlFor="meetingDate">Data da Reunião *</Label>
                  <Input id="meetingDate" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
                <div>
                  <Label htmlFor="meetingTime">Hora da Reunião *</Label>
                  <Input id="meetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
                <div>
                  <Label htmlFor="meetingModality">Modalidade *</Label>
                  <Select value={meetingModality} onValueChange={setMeetingModality} required>
                    <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                        {MEETING_MODALITIES.map(modality => (
                          <SelectItem key={modality} value={modality}>{modality}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="meetingNotes">Observações (Opcional)</Label>
                    <Textarea id="meetingNotes" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} rows={3} className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600" placeholder="Anotações sobre a reunião..." />
                  </div>
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
                Cancelar
              </Button>
              {showCreateCrmLeadButton ? (
                <Button type="button" onClick={handleCreateCrmLeadClick} disabled={isSaving || !callEndTime} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                  <span>{isSaving ? 'Criando Lead...' : 'Criar Lead no CRM'}</span>
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