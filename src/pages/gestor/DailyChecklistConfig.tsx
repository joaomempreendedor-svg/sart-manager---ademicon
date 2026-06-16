import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { DailyChecklist, DailyChecklistItem, DailyChecklistItemResource, DailyChecklistItemResourceType } from '@/types';

import {
  Plus, Edit2, Trash2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
  Users, X, ListChecks, Loader2, Video, FileText, Image as ImageIcon,
  Link as LinkIcon, MessageSquare, Eye, Music, XCircle, BookText,
  ShieldCheck, CheckCircle2, Clock, RotateCcw, Calendar, User,
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal';
import toast from 'react-hot-toast';

const SECRETARIA_PREFIX = "[SEC] ";

// ─── Modal: Criar/Editar Checklist ───────────────────────────────────────────
interface ChecklistModalProps { isOpen: boolean; onClose: () => void; checklist: DailyChecklist | null; }

const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose, checklist }) => {
  const { addDailyChecklist, updateDailyChecklist } = useApp();
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const displayTitle = checklist?.title.startsWith(SECRETARIA_PREFIX)
        ? checklist.title.replace(SECRETARIA_PREFIX, '') : checklist?.title || '';
      setTitle(displayTitle);
    }
  }, [isOpen, checklist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("O título do checklist é obrigatório."); return; }
    setIsSaving(true);
    try {
      const finalTitle = `${SECRETARIA_PREFIX}${title.trim()}`;
      if (checklist) { await updateDailyChecklist(checklist.id, { title: finalTitle }); toast.success('✅ Checklist atualizado!'); }
      else { await addDailyChecklist(finalTitle); toast.success('✅ Checklist criado!'); }
      onClose();
    } catch (error: any) { toast.error(`Erro: ${error.message}`); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{checklist ? 'Editar Checklist' : 'Novo Checklist'}</DialogTitle>
          <DialogDescription>Checklist exclusivo para a equipe de SECRETARIA.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder="Ex: Rotina Diária" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : checklist ? 'Atualizar' : 'Criar Checklist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Modal: Atribuir Checklist ────────────────────────────────────────────────
interface AssignmentModalProps { isOpen: boolean; onClose: () => void; checklist: DailyChecklist | null; }

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, checklist }) => {
  const { teamMembers, dailyChecklistAssignments, assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const assignableMembers = useMemo(() =>
    teamMembers.filter((m) => m.isActive && m.roles.includes('SECRETARIA')), [teamMembers]);

  const assignedMemberIds = useMemo(() =>
    new Set(dailyChecklistAssignments.filter(a => a.daily_checklist_id === checklist?.id).map(a => a.consultant_id)),
    [dailyChecklistAssignments, checklist]);

  const handleToggleAssignment = async (memberAuthId: string | null | undefined, isAssigned: boolean) => {
    if (!checklist || !memberAuthId) return;
    setIsSaving(true);
    try {
      if (isAssigned) { await unassignDailyChecklistFromConsultant(checklist.id, memberAuthId); toast.success("Atribuição removida!"); }
      else { await assignDailyChecklistToConsultant(checklist.id, memberAuthId); toast.success("Atribuição adicionada!"); }
    } catch (error: any) { toast.error(`Erro: ${error.message}`); }
    finally { setIsSaving(false); }
  };

  if (!checklist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>Atribuir Checklist</DialogTitle>
          <DialogDescription>Selecione quem deve visualizar este checklist.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] py-4 custom-scrollbar">
          <div className="grid gap-3">
            {assignableMembers.length === 0 ? (
              <div className="p-4 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">Nenhum membro compatível encontrado.</p></div>
            ) : assignableMembers.map(member => {
              const authId = member.authUserId || null;
              const isAssigned = authId ? assignedMemberIds.has(authId) : false;
              return (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox id={`member-${member.id}`} checked={isAssigned}
                    onCheckedChange={() => handleToggleAssignment(authId, isAssigned)}
                    disabled={isSaving || !authId}
                    className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white" />
                  <Label htmlFor={`member-${member.id}`} className="text-sm font-medium">
                    {member.name}{!authId ? ' (sem login)' : ''}
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Modal: Criar/Editar Item ─────────────────────────────────────────────────
interface ChecklistItemModalProps { isOpen: boolean; onClose: () => void; checklistId: string; item: DailyChecklistItem | null; }

const ChecklistItemModal: React.FC<ChecklistItemModalProps> = ({ isOpen, onClose, checklistId, item }) => {
  const { addDailyChecklistItem, updateDailyChecklistItem, dailyChecklistItems } = useApp();
  const [text, setText] = useState('');
  const [resourceType, setResourceType] = useState<DailyChecklistItemResourceType>('none');
  const [resourceName, setResourceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'every_x_days' | 'specific_date'>('daily');
  const [weeklyDayOfWeek, setWeeklyDayOfWeek] = useState(new Date().getDay());
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [intervalDays, setIntervalDays] = useState(2);
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleFileContent, setSingleFileContent] = useState('');
  const [singleSelectedFile, setSingleSelectedFile] = useState<File | null>(null);
  const [textAudioContentText, setTextAudioContentText] = useState('');
  const [textAudioContentUrl, setTextAudioContentUrl] = useState('');
  const [textAudioSelectedFile, setTextAudioSelectedFile] = useState<File | null>(null);
  const [textAudioImageContentText, setTextAudioImageContentText] = useState('');
  const [textAudioImageContentAudioUrl, setTextAudioImageContentAudioUrl] = useState('');
  const [textAudioImageContentImageUrl, setTextAudioImageContentImageUrl] = useState('');
  const [textAudioImageSelectedAudioFile, setTextAudioImageSelectedAudioFile] = useState<File | null>(null);
  const [textAudioImageSelectedImageFile, setTextAudioImageSelectedImageFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setText(item?.text || '');
      setResourceType(item?.resource?.type || 'none');
      setResourceName(item?.resource?.name || '');
      setError('');
      setSingleFileContent(''); setSingleSelectedFile(null);
      setTextAudioContentText(''); setTextAudioContentUrl(''); setTextAudioSelectedFile(null);
      setTextAudioImageContentText(''); setTextAudioImageContentAudioUrl(''); setTextAudioImageContentImageUrl('');
      setTextAudioImageSelectedAudioFile(null); setTextAudioImageSelectedImageFile(null);

      if (item?.resource) {
        if (item.resource.type === 'text_audio') {
          const c = item.resource.content as { text: string; audioUrl: string };
          setTextAudioContentText(c.text); setTextAudioContentUrl(c.audioUrl);
        } else if (item.resource.type === 'text_audio_image') {
          const c = item.resource.content as { text: string; audioUrl: string; imageUrl: string };
          setTextAudioImageContentText(c.text); setTextAudioImageContentAudioUrl(c.audioUrl); setTextAudioImageContentImageUrl(c.imageUrl);
        } else if (item.resource.type !== 'none') {
          setSingleFileContent(item.resource.content as string);
        }
      }

      const rec = item?.resource?.recurrence;
      if (rec) {
        setRecurrenceType(rec.type as any);
        if (rec.type === 'weekly') setWeeklyDayOfWeek(rec.dayOfWeek ?? new Date().getDay());
        if (rec.type === 'monthly') setMonthlyDay(rec.dayOfMonth ?? 1);
        if (rec.type === 'every_x_days') setIntervalDays(rec.intervalDays ?? 2);
        if (rec.type === 'specific_date') setSpecificDate(rec.specificDate ?? new Date().toISOString().split('T')[0]);
      } else {
        setRecurrenceType('daily');
      }
    }
  }, [isOpen, item]);

  const getResourceTypeIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 mr-1" />;
      case 'audio': return <Music className="w-4 h-4 mr-1" />;
      case 'text_audio': return <BookText className="w-4 h-4 mr-1" />;
      case 'text_audio_image': return <ImageIcon className="w-4 h-4 mr-1" />;
      case 'pdf': return <FileText className="w-4 h-4 mr-1" />;
      case 'image': return <ImageIcon className="w-4 h-4 mr-1" />;
      case 'link': return <LinkIcon className="w-4 h-4 mr-1" />;
      case 'text': return <MessageSquare className="w-4 h-4 mr-1" />;
      case 'none': return <X className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) { setError("O texto da tarefa é obrigatório."); return; }
    if (recurrenceType === 'monthly' && (isNaN(monthlyDay) || monthlyDay < 1 || monthlyDay > 31)) { setError("Informe um dia do mês válido (1 a 31)."); return; }
    if (recurrenceType === 'every_x_days' && (isNaN(intervalDays) || intervalDays < 2)) { setError("Para 'A cada X dias', informe um intervalo de pelo menos 2 dias."); return; }
    if (recurrenceType === 'specific_date' && !specificDate) { setError("Selecione a data específica."); return; }

    let finalResource: DailyChecklistItemResource | undefined;
    let audioFileToUpload: File | undefined;
    let imageFileToUpload: File | undefined;
    const nowDate = new Date().toISOString().split('T')[0];

    const recurrence: DailyChecklistItemResource['recurrence'] =
      recurrenceType === 'daily' ? { type: 'daily' } :
      recurrenceType === 'weekly' ? { type: 'weekly', dayOfWeek: weeklyDayOfWeek } :
      recurrenceType === 'monthly' ? { type: 'monthly', dayOfMonth: monthlyDay } :
      recurrenceType === 'every_x_days' ? { type: 'every_x_days', intervalDays, startDate: item?.created_at?.split('T')[0] || nowDate } :
      { type: 'specific_date', specificDate };

    if (resourceType === 'none') {
      finalResource = { type: 'none', content: '', name: resourceName.trim() || undefined, recurrence };
    } else if (resourceType === 'text') {
      if (!singleFileContent.trim()) { setError("O conteúdo do texto é obrigatório."); return; }
      finalResource = { type: 'text', content: singleFileContent.trim(), name: resourceName.trim() || undefined, recurrence };
    } else if (resourceType === 'link' || resourceType === 'video' || resourceType === 'audio') {
      if (!singleFileContent.trim()) { setError(`A URL é obrigatória.`); return; }
      finalResource = { type: resourceType, content: singleFileContent.trim(), name: resourceName.trim() || undefined, recurrence };
    } else if (resourceType === 'image' || resourceType === 'pdf') {
      if (singleSelectedFile) { imageFileToUpload = singleSelectedFile; finalResource = { type: resourceType, content: '', name: singleSelectedFile.name, recurrence }; }
      else if (item?.resource?.type === resourceType && item.resource.content) { finalResource = { type: resourceType, content: item.resource.content, name: item.resource.name || undefined, recurrence }; }
      else { setError(`Um arquivo (${resourceType}) é obrigatório.`); return; }
    } else if (resourceType === 'text_audio') {
      if (!textAudioContentText.trim()) { setError("O texto é obrigatório."); return; }
      if (!textAudioContentUrl.trim() && !textAudioSelectedFile) { setError("A URL do áudio ou um arquivo é obrigatório."); return; }
      audioFileToUpload = textAudioSelectedFile || undefined;
      finalResource = { type: 'text_audio', content: { text: textAudioContentText.trim(), audioUrl: textAudioContentUrl.trim() }, name: resourceName.trim() || undefined, recurrence };
    } else if (resourceType === 'text_audio_image') {
      if (!textAudioImageContentText.trim()) { setError("O texto é obrigatório."); return; }
      if (!textAudioImageContentAudioUrl.trim() && !textAudioImageSelectedAudioFile) { setError("A URL do áudio é obrigatória."); return; }
      if (!textAudioImageContentImageUrl.trim() && !textAudioImageSelectedImageFile) { setError("A URL da imagem é obrigatória."); return; }
      audioFileToUpload = textAudioImageSelectedAudioFile || undefined;
      imageFileToUpload = textAudioImageSelectedImageFile || undefined;
      finalResource = { type: 'text_audio_image', content: { text: textAudioImageContentText.trim(), audioUrl: textAudioImageContentAudioUrl.trim(), imageUrl: textAudioImageContentImageUrl.trim() }, name: resourceName.trim() || undefined, recurrence };
    }

    setIsSaving(true);
    try {
      if (item) {
        await updateDailyChecklistItem(item.id, { text: text.trim(), resource: finalResource }, audioFileToUpload, imageFileToUpload);
        toast.success("Item atualizado!");
      } else {
        const itemsInChecklist = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId);
        const newOrderIndex = itemsInChecklist.length > 0 ? Math.max(...itemsInChecklist.map(i => i.order_index)) + 1 : 0;
        await addDailyChecklistItem(checklistId, text.trim(), newOrderIndex, finalResource, audioFileToUpload, imageFileToUpload);
        toast.success("Item adicionado!");
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar.');
      toast.error(`Erro: ${err.message}`);
    } finally { setIsSaving(false); }
  };

  const resetResourceFields = () => {
    setSingleSelectedFile(null); setSingleFileContent(''); setResourceName('');
    setTextAudioContentText(''); setTextAudioContentUrl(''); setTextAudioSelectedFile(null);
    setTextAudioImageContentText(''); setTextAudioImageContentAudioUrl(''); setTextAudioImageContentImageUrl('');
    setTextAudioImageSelectedAudioFile(null); setTextAudioImageSelectedImageFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>{item ? 'Edite os detalhes da tarefa.' : 'Adicione uma nova tarefa ao checklist.'}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500 text-sm px-6 pt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] py-4 pr-4 custom-scrollbar">
            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="itemText" className="w-full sm:w-24 flex-shrink-0 text-left sm:text-right">Tarefa *</Label>
                <Input id="itemText" value={text} onChange={(e) => setText(e.target.value)}
                  className="flex-1 dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full"
                  placeholder="Ex: Fazer 40 contatos diários" required />
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recorrência da Tarefa</h4>
                <div className="grid gap-2">
                  <Label>Tipo de Recorrência</Label>
                  <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white">
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="every_x_days">A cada X dias</option>
                    <option value="specific_date">Data específica</option>
                  </select>
                  {recurrenceType === 'weekly' && (
                    <div className="grid gap-2 mt-2">
                      <Label>Dia da Semana</Label>
                      <select value={weeklyDayOfWeek} onChange={(e) => setWeeklyDayOfWeek(parseInt(e.target.value, 10))}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white">
                        <option value={0}>Domingo</option><option value={1}>Segunda-feira</option>
                        <option value={2}>Terça-feira</option><option value={3}>Quarta-feira</option>
                        <option value={4}>Quinta-feira</option><option value={5}>Sexta-feira</option><option value={6}>Sábado</option>
                      </select>
                    </div>
                  )}
                  {recurrenceType === 'monthly' && (
                    <div className="grid gap-2 mt-2">
                      <Label>Dia do Mês</Label>
                      <Input type="number" min={1} max={31} value={monthlyDay} onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10) || 1)}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" placeholder="Ex: 15" />
                    </div>
                  )}
                  {recurrenceType === 'every_x_days' && (
                    <div className="grid gap-2 mt-2">
                      <Label>Intervalo (dias)</Label>
                      <Input type="number" min={2} value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value, 10) || 2)}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" placeholder="Ex: 3" />
                    </div>
                  )}
                  {recurrenceType === 'specific_date' && (
                    <div className="grid gap-2 mt-2">
                      <Label>Data específica</Label>
                      <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-brand-500" />Material de Apoio
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(['text', 'link', 'video', 'audio', 'text_audio', 'text_audio_image', 'image', 'pdf'] as DailyChecklistItemResourceType[]).map(type => (
                    <Button key={type} type="button" variant={resourceType === type ? 'default' : 'outline'}
                      onClick={() => { setResourceType(type); resetResourceFields(); }}
                      className={`flex items-center justify-center space-x-1 ${resourceType === type ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}>
                      {getResourceTypeIcon(type)}
                      <span>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</span>
                    </Button>
                  ))}
                  <Button type="button" variant={resourceType === 'none' ? 'default' : 'outline'}
                    onClick={() => { setResourceType('none'); resetResourceFields(); }}
                    className={`flex items-center space-x-1 ${resourceType === 'none' ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}>
                    <X className="w-4 h-4 mr-1" /><span>Sem Recurso</span>
                  </Button>
                </div>

                {resourceType === 'text' && (
                  <div className="grid gap-2 mt-4">
                    <Label>Conteúdo do Texto *</Label>
                    <textarea value={singleFileContent} onChange={(e) => setSingleFileContent(e.target.value)} rows={5}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Descreva como fazer a tarefa..." />
                  </div>
                )}
                {(resourceType === 'link' || resourceType === 'video' || resourceType === 'audio') && (
                  <div className="grid gap-2 mt-4">
                    <Label>URL *</Label>
                    <Input type="url" value={singleFileContent} onChange={(e) => setSingleFileContent(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="https://..." />
                    <Label>Nome/Título (Opcional)</Label>
                    <Input type="text" value={resourceName} onChange={(e) => setResourceName(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                  </div>
                )}
                {(resourceType === 'image' || resourceType === 'pdf') && (
                  <div className="grid gap-2 mt-4">
                    <Label>Arquivo ({resourceType.toUpperCase()}) *</Label>
                    <label className="flex items-center justify-center px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600">
                      {getResourceTypeIcon(resourceType)}
                      <span className="text-sm text-gray-600 dark:text-gray-300 ml-2 truncate">
                        {singleSelectedFile ? singleSelectedFile.name : item?.resource?.name || `Selecionar ${resourceType}...`}
                      </span>
                      <input type="file" className="hidden" accept={resourceType === 'pdf' ? 'application/pdf' : 'image/*'}
                        onChange={(e) => { const f = e.target.files?.[0]; setSingleSelectedFile(f || null); if (f) setResourceName(f.name); }} />
                    </label>
                  </div>
                )}
                {resourceType === 'text_audio' && (
                  <div className="grid gap-4 mt-4">
                    <div><Label>Texto *</Label>
                      <textarea value={textAudioContentText} onChange={(e) => setTextAudioContentText(e.target.value)} rows={4}
                        className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" /></div>
                    <div><Label>URL do Áudio</Label>
                      <Input type="url" value={textAudioContentUrl} onChange={(e) => setTextAudioContentUrl(e.target.value)}
                        className="mt-1 w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" /></div>
                  </div>
                )}
                {resourceType === 'text_audio_image' && (
                  <div className="grid gap-4 mt-4">
                    <div><Label>Texto *</Label>
                      <textarea value={textAudioImageContentText} onChange={(e) => setTextAudioImageContentText(e.target.value)} rows={4}
                        className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" /></div>
                    <div><Label>URL do Áudio</Label>
                      <Input type="url" value={textAudioImageContentAudioUrl} onChange={(e) => setTextAudioImageContentAudioUrl(e.target.value)}
                        className="mt-1 w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" /></div>
                    <div><Label>URL da Imagem</Label>
                      <Input type="url" value={textAudioImageContentImageUrl} onChange={(e) => setTextAudioImageContentImageUrl(e.target.value)}
                        className="mt-1 w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" /></div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : item ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export const DailyChecklistConfig = () => {
  const {
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments,
    dailyChecklistCompletions, teamMembers,
    deleteDailyChecklistItem, moveDailyChecklistItem,
    updateDailyChecklist, deleteDailyChecklist,
  } = useApp();

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<DailyChecklist | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedChecklistForAssignment, setSelectedChecklistForAssignment] = useState<DailyChecklist | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyChecklistItem | null>(null);
  const [selectedChecklistForItem, setSelectedChecklistForItem] = useState<DailyChecklist | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedResourceItem, setSelectedResourceItem] = useState<DailyChecklistItem | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const secretarias = useMemo(() =>
    teamMembers.filter(m => m.isActive && m.roles.includes('SECRETARIA') && m.authUserId),
    [teamMembers]);

  const filteredChecklists = useMemo(() =>
    dailyChecklists
      .filter(c => c.title.startsWith(SECRETARIA_PREFIX))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [dailyChecklists]);

  const isItemRecorrente = (item: DailyChecklistItem) => {
    const rec = item.resource?.recurrence?.type;
    return rec && rec !== 'specific_date';
  };

  const getRecorrenciaLabel = (item: DailyChecklistItem) => {
    const rec = item.resource?.recurrence;
    if (!rec) return 'Diária';
    switch (rec.type) {
      case 'daily': return 'Diária';
      case 'weekly': return `Semanal`;
      case 'monthly': return `Mensal`;
      case 'every_x_days': return `A cada ${rec.intervalDays}d`;
      case 'specific_date': return `${rec.specificDate}`;
      default: return 'Diária';
    }
  };

  // Progresso por secretaria por checklist
  const getProgressoSecretaria = (checklistId: string, secretariaAuthId: string) => {
    const items = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId && i.is_active);
    if (items.length === 0) return { total: 0, concluidas: 0, pct: 0 };
    const concluidas = items.filter(item =>
      dailyChecklistCompletions.some(c =>
        c.daily_checklist_item_id === item.id &&
        c.consultant_id === secretariaAuthId &&
        c.date === todayStr &&
        c.done
      )
    ).length;
    return { total: items.length, concluidas, pct: Math.round((concluidas / items.length) * 100) };
  };

  const getResourceTypeIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-red-500" />;
      case 'audio': return <Music className="w-4 h-4 text-brand-500" />;
      case 'text_audio': return <BookText className="w-4 h-4 text-orange-500" />;
      case 'text_audio_image': return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case 'text': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const handleDeleteItem = async (itemId: string, text: string) => {
    if (window.confirm(`Tem certeza que deseja remover o item "${text}"?`)) {
      await deleteDailyChecklistItem(itemId);
      toast.success("Item removido!");
    }
  };

  const handleMoveItem = async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    await moveDailyChecklistItem(checklistId, itemId, direction);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <ShieldCheck className="h-7 w-7 text-brand-500" />
            Metas Diárias da Secretaria
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Configure e acompanhe o progresso diário de cada secretaria.</p>
        </div>
        <Button onClick={() => { setEditingChecklist(null); setIsChecklistModalOpen(true); }}
          className="bg-brand-600 hover:bg-brand-700 text-white">
          <Plus className="w-4 h-4 mr-2" />Novo Checklist
        </Button>
      </div>

      {filteredChecklists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist criado ainda.</p>
          <p className="text-sm text-gray-400">Clique em "Novo Checklist" para começar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredChecklists.map((checklist) => {
            const items = dailyChecklistItems
              .filter(i => i.daily_checklist_id === checklist.id)
              .sort((a, b) => a.order_index - b.order_index);

            const recorrentes = items.filter(i => isItemRecorrente(i));
            const pontuais = items.filter(i => !isItemRecorrente(i));

            const assignedSecretarias = secretarias.filter(s =>
              dailyChecklistAssignments.some(a =>
                a.daily_checklist_id === checklist.id && a.consultant_id === s.authUserId
              )
            );

            return (
              <div key={checklist.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden ${!checklist.is_active ? 'opacity-60' : ''}`}>

                {/* Header do checklist */}
                <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {checklist.title.replace(SECRETARIA_PREFIX, '')}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checklist.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}>
                        {checklist.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedChecklistForAssignment(checklist); setIsAssignmentModalOpen(true); }}
                        className="flex items-center space-x-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <Users className="w-4 h-4" /><span>Atribuir</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateDailyChecklist(checklist.id, { is_active: !checklist.is_active })}
                        className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        {checklist.is_active ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingChecklist(checklist); setIsChecklistModalOpen(true); }}
                        className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm"
                        onClick={() => window.confirm(`Excluir "${checklist.title}"?`) && deleteDailyChecklist(checklist.id)}
                        className="p-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Progresso das secretarias hoje */}
                {assignedSecretarias.length > 0 && items.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-brand-50/50 dark:bg-brand-900/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 mb-3 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Progresso de hoje
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {assignedSecretarias.map(s => {
                        const prog = getProgressoSecretaria(checklist.id, s.authUserId!);
                        return (
                          <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black text-xs">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                                <p className="text-[10px] text-gray-400">{prog.concluidas}/{prog.total} tarefas</p>
                              </div>
                              <span className={`text-xs font-black ${prog.pct === 100 ? 'text-green-600 dark:text-green-400' : 'text-brand-600 dark:text-brand-400'}`}>
                                {prog.pct}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${prog.pct === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                                style={{ width: `${prog.pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção: Atividades Recorrentes */}
                <div className="px-6 pt-5 pb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Recorrentes</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 ml-1">{recorrentes.length}</span>
                    </div>
                  </div>

                  {recorrentes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic mb-4">Nenhuma atividade recorrente.</p>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {recorrentes.map((item, index, arr) => (
                        <div key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 group transition-all">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.resource && item.resource.type !== 'none' && (
                              <button onClick={() => { setSelectedResourceItem(item); setIsResourceModalOpen(true); }}
                                className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0">
                                {getResourceTypeIcon(item.resource.type)}
                              </button>
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.text}</span>
                            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {getRecorrenciaLabel(item)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1 sm:mt-0">
                            <Button variant="ghost" size="sm" onClick={() => handleMoveItem(checklist.id, item.id, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleMoveItem(checklist.id, item.id, 'down')} disabled={index === arr.length - 1} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedChecklistForItem(checklist); setEditingItem(item); setIsItemModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id, item.text)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seção: Atividades Pontuais */}
                <div className="px-6 pb-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">Pontuais</span>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400 ml-1">{pontuais.length}</span>
                    </div>
                  </div>

                  {pontuais.length === 0 ? (
                    <p className="text-xs text-gray-400 italic mb-4">Nenhuma atividade pontual.</p>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {pontuais.map((item, index, arr) => (
                        <div key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl hover:bg-orange-50/50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-900 group transition-all">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.resource && item.resource.type !== 'none' && (
                              <button onClick={() => { setSelectedResourceItem(item); setIsResourceModalOpen(true); }}
                                className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0">
                                {getResourceTypeIcon(item.resource.type)}
                              </button>
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.text}</span>
                            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                              {getRecorrenciaLabel(item)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1 sm:mt-0">
                            <Button variant="ghost" size="sm" onClick={() => handleMoveItem(checklist.id, item.id, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleMoveItem(checklist.id, item.id, 'down')} disabled={index === arr.length - 1} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedChecklistForItem(checklist); setEditingItem(item); setIsItemModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id, item.text)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adicionar tarefa */}
                <div className="px-6 pb-5">
                  <Button variant="ghost"
                    onClick={() => { setSelectedChecklistForItem(checklist); setEditingItem(null); setIsItemModalOpen(true); }}
                    className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700">
                    <Plus className="w-4 h-4 mr-1" />Adicionar Tarefa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ChecklistModal isOpen={isChecklistModalOpen} onClose={() => setIsChecklistModalOpen(false)} checklist={editingChecklist} />
      <AssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} checklist={selectedChecklistForAssignment} />
      {selectedChecklistForItem && (
        <ChecklistItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)}
          checklistId={selectedChecklistForItem.id} item={editingItem} />
      )}
      {selectedResourceItem && (
        <DailyChecklistItemResourceModal isOpen={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)}
          itemText={selectedResourceItem.text} resource={selectedResourceItem.resource} />
      )}
    </div>
  );
};