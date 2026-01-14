import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Clock, MessageSquare, Tag } from 'lucide-react';
import { ConsultantEvent } from '@/types';
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

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'> | ConsultantEvent) => Promise<void>;
  event: ConsultantEvent | null; // Null for new event, object for editing
  defaultStartDateTime?: Date; // Prop para a data e hora de início padrão
  userId: string;
}

const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, event, defaultStartDateTime, userId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<'personal_task' | 'training' | 'other'>('personal_task');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        
        const eventStartDate = event.start_time ? new Date(event.start_time) : null;
        const eventEndDate = event.end_time ? new Date(event.end_time) : null;

        setDate(eventStartDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]);
        setStartTime(eventStartDate && !isNaN(eventStartDate.getTime()) ? formatTime(eventStartDate) : '09:00');
        setEndTime(eventEndDate && !isNaN(eventEndDate.getTime()) ? formatTime(eventEndDate) : '10:00');
        setEventType(event.event_type);
      } else {
        // Se for um novo evento, usa defaultStartDateTime se fornecido, senão a data/hora atual
        const initialDate = defaultStartDateTime || new Date();
        setTitle('');
        setDescription('');
        setDate(initialDate.toISOString().split('T')[0]);
        setStartTime(formatTime(initialDate));
        
        const initialEndTime = new Date(initialDate.getTime() + 60 * 60 * 1000); // Adiciona 1 hora
        setEndTime(formatTime(initialEndTime));
        setEventType('personal_task');
      }
      setError('');
    }
  }, [isOpen, event, defaultStartDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !date || !startTime || !endTime) {
      setError("Título, data e horários são obrigatórios.");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError("A hora de início deve ser anterior à hora de término.");
      return;
    }

    setIsSaving(true);
    try {
      const eventToSave: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'> | ConsultantEvent = event
        ? { ...event, title, description, start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(), event_type: eventType }
        : { title, description, start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(), event_type: eventType, user_id: userId };
      
      await onSave(eventToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar evento:", err);
      setError(err.message || 'Falha ao salvar o evento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          <DialogDescription>
            {event ? 'Edite os detalhes deste evento.' : 'Adicione um novo evento à sua agenda pessoal.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Título do Evento</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder="Ex: Treinamento de Produto"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder="Detalhes do evento..."
              />
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Hora de Início</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime">Hora de Término</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="eventType">Tipo de Evento</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select value={eventType} onValueChange={(value: 'personal_task' | 'training' | 'other') => setEventType(value)} required>
                  <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="personal_task">Tarefa Pessoal</SelectItem>
                    <SelectItem value="training">Treinamento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};