import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DailyChecklist, DailyChecklistItem, TeamMember, DailyChecklistItemResource, DailyChecklistItemResourceType } from '@/types';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Users, Check, X, ListChecks, Loader2, Video, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquare, Eye, Music, XCircle, BookText } from 'lucide-react'; // Importar BookText icon
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal'; // Importar o novo modal
import toast from 'react-hot-toast'; // Importar toast

// Componente para o modal de criação/edição de Checklist
interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: DailyChecklist | null;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose, checklist }) => {
  const { addDailyChecklist, updateDailyChecklist } = useApp();
  const [title, setTitle] = useState(checklist?.title || '');
  const [isSaving, setIsSaving] = useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      setTitle(checklist?.title || '');
    }
  }, [isOpen, checklist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do checklist é obrigatório.");
      return;
    }
    
    setIsSaving(true);
    try {
      if (checklist) {
        await updateDailyChecklist(checklist.id, { title });
        toast.success(`✅ Checklist "${title}" atualizado com sucesso!`);
      } else {
        await addDailyChecklist(title);
        toast.success(`✅ Checklist "${title}" criado com sucesso!\n\nEle estará disponível para TODOS os consultores.`);
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to save checklist:", error);
      toast.error(`Erro: ${error.message || 'Não foi possível salvar o checklist.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{checklist ? 'Editar Checklist' : 'Novo Checklist'}</DialogTitle>
          <DialogDescription>
            {checklist 
              ? 'Altere o título do checklist.' 
              : 'Crie um novo checklist diário para seus consultores. Ele será global por padrão.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder="Ex: Checklist Matinal"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : checklist ? 'Atualizar' : 'Criar Checklist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para o modal de atribuição de Checklist
interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: DailyChecklist | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, checklist }) => {
  const { teamMembers, dailyChecklistAssignments, assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const consultants = useMemo(() => teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado'))), [teamMembers]);
  const assignedConsultantIds = useMemo(() => 
    new Set(dailyChecklistAssignments.filter(a => a.daily_checklist_id === checklist?.id).map(a => a.consultant_id))
  , [dailyChecklistAssignments, checklist]);

  const handleToggleAssignment = async (consultantId: string, isAssigned: boolean) => {
    if (!checklist) return;
    setIsSaving(true);
    try {
      if (isAssigned) {
        await unassignDailyChecklistFromConsultant(checklist.id, consultantId);
        toast.success("Atribuição removida com sucesso!");
      } else {
        await assignDailyChecklistToConsultant(checklist.id, consultantId);
        toast.success("Atribuição adicionada com sucesso!");
      }
    } catch (error: any) {
      console.error("Failed to update assignment:", error);
      toast.error(`Erro ao atualizar atribuição: ${error.message || 'Verifique o console para mais detalhes.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!checklist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>Atribuir "{checklist.title}"</DialogTitle>
          <DialogDescription>
            Selecione os consultores que receberão este checklist. Se nenhum for selecionado, ele será global.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] py-4 custom-scrollbar">
          <div className="grid gap-3">
            {consultants.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">Nenhum consultor encontrado.</p>
            ) : (
              consultants.map(member => {
                const isAssigned = assignedConsultantIds.has(member.id);
                return (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`consultant-${member.id}`}
                      checked={isAssigned}
                      onCheckedChange={() => handleToggleAssignment(member.id, isAssigned)}
                      disabled={isSaving}
                      className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor={`consultant-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {member.name}
                    </Label>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente para o modal de criação/edição de Item de Checklist
interface ChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  item: DailyChecklistItem | null;
}

const ChecklistItemModal: React.FC<ChecklistItemModalProps> = ({ isOpen, onClose, checklistId, item }) => {
  const { addDailyChecklistItem, updateDailyChecklistItem, dailyChecklistItems } = useApp();
  const [text, setText] = useState(item?.text || '');
  const [resourceType, setResourceType] = useState<DailyChecklistItemResourceType>(item?.resource?.type || 'none'); // Default to 'none'
  const [resourceContent, setResourceContent] = useState(
    item?.resource?.type === 'text_audio' 
      ? (item.resource.content as { text: string; audioUrl: string; }).audioUrl 
      : (item?.resource?.content as string || '')
  );
  const [resourceName, setResourceName] = useState(item?.resource?.name || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // NOVO: Estados para o tipo 'text_audio'
  const [textAudioContentText, setTextAudioContentText] = useState(
    item?.resource?.type === 'text_audio' 
      ? (item.resource.content as { text: string; audioUrl: string; }).text 
      : ''
  );
  const [textAudioContentUrl, setTextAudioContentUrl] = useState(
    item?.resource?.type === 'text_audio' 
      ? (item.resource.content as { text: string; audioUrl: string; }).audioUrl 
      : ''
  );
  const [textAudioSelectedFile, setTextAudioSelectedFile] = useState<File | null>(null);


  React.useEffect(() => {
    if (isOpen) {
      setText(item?.text || '');
      setResourceType(item?.resource?.type || 'none');
      setResourceName(item?.resource?.name || '');
      setSelectedFile(null);
      setError('');

      // Resetar estados específicos para 'text_audio'
      if (item?.resource?.type === 'text_audio') {
        const content = item.resource.content as { text: string; audioUrl: string; };
        setTextAudioContentText(content.text);
        setTextAudioContentUrl(content.audioUrl);
        setResourceContent(content.audioUrl); // Manter resourceContent para compatibilidade se necessário
      } else {
        setResourceContent(item?.resource?.content as string || '');
        setTextAudioContentText('');
        setTextAudioContentUrl('');
      }
      setTextAudioSelectedFile(null);
    }
  }, [isOpen, item]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResourceName(file.name);
      setResourceContent(''); // Clear content, as AppContext will handle URL from upload
    } else {
      setSelectedFile(null);
      // Revert to original name and content if no new file is selected (e.g., user cancels file dialog)
      setResourceName(item?.resource?.name || ''); 
      setResourceContent(item?.resource?.content as string || '');
    }
  };

  const handleTextAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTextAudioSelectedFile(file);
      setResourceName(file.name); // Use this name for the overall resource
      setTextAudioContentUrl(''); // Clear URL, as AppContext will handle URL from upload
    } else {
      setTextAudioSelectedFile(null);
      setResourceName(item?.resource?.name || '');
      setTextAudioContentUrl(item?.resource?.type === 'text_audio' ? (item.resource.content as { text: string; audioUrl: string; }).audioUrl : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called for ChecklistItemModal"); // DEBUG LOG
    setError('');

    if (!text.trim()) {
      setError("O texto da tarefa é obrigatório.");
      console.log("Validation error: text is empty."); // DEBUG LOG
      return;
    }

    let finalResource: DailyChecklistItemResource | undefined;
    let fileToUpload: File | undefined = selectedFile || undefined;

    if (resourceType === 'none') {
      finalResource = undefined; // Explicitly no resource
    } else if (resourceType === 'text') {
      if (!resourceContent.trim()) {
        setError("O conteúdo do texto é obrigatório.");
        console.log("Validation error: text resource content is empty."); // DEBUG LOG
        return;
      }
      finalResource = { type: 'text', content: resourceContent.trim(), name: resourceName.trim() || undefined };
    } else if (resourceType === 'link' || resourceType === 'video' || resourceType === 'audio') {
      if (!resourceContent.trim()) {
        setError(`A URL para ${resourceType === 'link' ? 'o link' : resourceType === 'video' ? 'o vídeo' : 'o áudio'} é obrigatória.`);
        console.log(`Validation error: ${resourceType} resource content is empty.`); // DEBUG LOG
        return;
      }
      finalResource = { type: resourceType, content: resourceContent.trim(), name: resourceName.trim() || undefined };
    } else if (resourceType === 'image' || resourceType === 'pdf') {
      if (selectedFile) {
        finalResource = { type: resourceType, content: '', name: selectedFile.name }; // Content will be filled by upload
      } else if (item?.resource?.type === resourceType && item.resource.content) {
        finalResource = { type: resourceType, content: item.resource.content, name: item.resource.name || undefined };
      } else {
        setError(`Um arquivo (${resourceType}) é obrigatório.`);
        console.log("Validation error: file resource is missing."); // DEBUG LOG
        return;
      }
    } else if (resourceType === 'text_audio') { // NOVO: Lógica para 'text_audio'
      if (!textAudioContentText.trim()) {
        setError("O texto para o recurso 'Texto + Áudio' é obrigatório.");
        return;
      }
      if (!textAudioContentUrl.trim() && !textAudioSelectedFile) {
        setError("A URL do áudio ou um arquivo de áudio é obrigatório para 'Texto + Áudio'.");
        return;
      }

      let audioUrl = textAudioContentUrl.trim();
      if (textAudioSelectedFile) {
        fileToUpload = textAudioSelectedFile; // Set the file to be uploaded
        audioUrl = ''; // Clear URL, it will be set after upload
      }

      finalResource = { 
        type: 'text_audio', 
        content: { text: textAudioContentText.trim(), audioUrl: audioUrl }, 
        name: resourceName.trim() || undefined 
      };
    }
    
    console.log("Validation passed. Attempting to save. finalResource:", finalResource); // DEBUG LOG
    setIsSaving(true);
    try {
      if (item) {
        await updateDailyChecklistItem(item.id, { text: text.trim(), resource: finalResource }, fileToUpload);
        toast.success("Item do checklist atualizado com sucesso!");
      } else {
        const itemsInChecklist = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId);
        const newOrderIndex = itemsInChecklist.length > 0 ? Math.max(...itemsInChecklist.map(i => i.order_index)) + 1 : 0;
        await addDailyChecklistItem(checklistId, text.trim(), newOrderIndex, finalResource, fileToUpload);
        toast.success("Novo item adicionado ao checklist com sucesso!");
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save checklist item:", err); // DEBUG LOG
      setError(err.message || 'Não foi possível salvar o item do checklist.');
      toast.error(`Erro: ${err.message || 'Não foi possível salvar o item do checklist.'}`);
    } finally {
      setIsSaving(false);
      console.log("Saving process finished. isSaving set to false."); // DEBUG LOG
    }
  };

  const getResourceTypeIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 mr-1" />;
      case 'audio': return <Music className="w-4 h-4 mr-1" />;
      case 'text_audio': return <BookText className="w-4 h-4 mr-1" />; // NOVO: Ícone para texto + áudio
      case 'pdf': return <FileText className="w-4 h-4 mr-1" />;
      case 'image': return <ImageIcon className="w-4 h-4 mr-1" />;
      case 'link': return <LinkIcon className="w-4 h-4 mr-1" />;
      case 'text': return <MessageSquare className="w-4 h-4 mr-1" />;
      case 'none': return <X className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {item ? 'Edite os detalhes da tarefa e seu material de apoio.' : 'Adicione uma nova tarefa ao checklist e, opcionalmente, um material de apoio.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500 text-sm px-6 pt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>} {/* Moved error display */}
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] py-4 pr-4 custom-scrollbar">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="itemText" className="w-24 flex-shrink-0">
                  Tarefa *
                </Label>
                <Input
                  id="itemText"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: Fazer 40 contatos diários"
                  required
                />
              </div>

              <div className="col-span-4 border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-brand-500" />
                  Material de Apoio ("Como fazer?")
                </h4>
                <div className="grid gap-2">
                  <Label className="text-left">Tipo de Recurso</Label>
                  <div className="flex flex-wrap gap-2">
                    {['text', 'link', 'video', 'audio', 'text_audio', 'image', 'pdf'].map(type => ( // Adicionado 'text_audio'
                      <Button
                        key={type}
                        type="button"
                        variant={resourceType === type ? 'default' : 'outline'}
                        onClick={() => { setResourceType(type as DailyChecklistItemResourceType); setSelectedFile(null); setResourceContent(''); setResourceName(''); setTextAudioContentText(''); setTextAudioContentUrl(''); setTextAudioSelectedFile(null); }}
                        className={`flex items-center space-x-1 ${resourceType === type ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}
                      >
                        {getResourceTypeIcon(type as DailyChecklistItemResourceType)}
                        <span>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</span>
                      </Button>
                    ))}
                     <Button
                        type="button"
                        variant={resourceType === 'none' ? 'default' : 'outline'} // Highlight 'none'
                        onClick={() => { setResourceType('none'); setResourceContent(''); setResourceName(''); setSelectedFile(null); setTextAudioContentText(''); setTextAudioContentUrl(''); setTextAudioSelectedFile(null); }}
                        className={`flex items-center space-x-1 ${resourceType === 'none' ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        <span>Sem Recurso</span>
                      </Button>
                  </div>
                </div>

                {resourceType === 'text' && (
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="resourceContentText" className="text-left">Conteúdo do Texto *</Label>
                    <textarea
                      id="resourceContentText"
                      value={resourceContent}
                      onChange={(e) => setResourceContent(e.target.value)}
                      rows={5}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Descreva como fazer a tarefa..."
                    />
                  </div>
                )}

                {(resourceType === 'link' || resourceType === 'video' || resourceType === 'audio') && (
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="resourceContentUrl" className="text-left">URL do {resourceType === 'link' ? 'Link' : resourceType === 'video' ? 'Vídeo' : 'Áudio'} *</Label>
                    <Input
                      id="resourceContentUrl"
                      type="url"
                      value={resourceContent}
                      onChange={(e) => setResourceContent(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder={resourceType === 'link' ? "https://exemplo.com" : resourceType === 'video' ? "https://www.youtube.com/watch?v=..." : "https://exemplo.com/audio.mp3"}
                    />
                    <Label htmlFor="resourceNameUrl" className="text-left">Nome/Título (Opcional)</Label>
                    <Input
                      id="resourceNameUrl"
                      type="text"
                      value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Título do link/vídeo/áudio"
                    />
                  </div>
                )}

                {(resourceType === 'image' || resourceType === 'pdf' || resourceType === 'audio') && (
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="resourceFile" className="text-left">Arquivo ({resourceType.toUpperCase()}) *</Label>
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                      {getResourceTypeIcon(resourceType)}
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate ml-2">{selectedFile ? selectedFile.name : (item?.resource?.name || `Selecionar arquivo ${resourceType}...`)}</span>
                      <input type="file" id="resourceFile" className="hidden" accept={resourceType === 'pdf' ? 'application/pdf' : resourceType === 'image' ? 'image/*' : 'audio/*'} onChange={handleFileChange} />
                    </label>
                    <Label htmlFor="resourceFileName" className="text-left">Nome do Arquivo (Opcional)</Label>
                    <Input
                      id="resourceFileName"
                      type="text"
                      value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Nome para exibição do arquivo"
                    />
                  </div>
                )}

                {resourceType === 'text_audio' && ( // NOVO: Campos para 'text_audio'
                  <div className="grid gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="textAudioContentText" className="text-left">Texto *</Label>
                      <textarea
                        id="textAudioContentText"
                        value={textAudioContentText}
                        onChange={(e) => setTextAudioContentText(e.target.value)}
                        rows={5}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                        placeholder="Descreva a tarefa em texto..."
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="textAudioContentUrl" className="text-left">URL do Áudio (Opcional)</Label>
                      <Input
                        id="textAudioContentUrl"
                        type="url"
                        value={textAudioContentUrl}
                        onChange={(e) => setTextAudioContentUrl(e.target.value)}
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                        placeholder="https://exemplo.com/audio.mp3"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="textAudioFile" className="text-left">Ou Upload de Arquivo de Áudio (Opcional)</Label>
                      <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                        <Music className="w-4 h-4 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate ml-2">{textAudioSelectedFile ? textAudioSelectedFile.name : (item?.resource?.type === 'text_audio' && (item.resource.content as { text: string; audioUrl: string; }).audioUrl && !textAudioSelectedFile ? 'Áudio existente' : 'Selecionar arquivo de áudio...')}</span>
                        <input type="file" id="textAudioFile" className="hidden" accept="audio/*" onChange={handleTextAudioFileChange} />
                      </label>
                    </div>
                    <Label htmlFor="resourceNameTextAudio" className="text-left">Nome/Título do Recurso (Opcional)</Label>
                    <Input
                      id="resourceNameTextAudio"
                      type="text"
                      value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Título do recurso (ex: Áudio explicativo)"
                    />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : item ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// Componente principal da página de configuração
export const DailyChecklistConfig = () => {
  const { 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    addDailyChecklistItem, 
    updateDailyChecklistItem, 
    deleteDailyChecklistItem, 
    moveDailyChecklistItem,
    updateDailyChecklist,
    deleteDailyChecklist,
    teamMembers, // Adicionado para o botão de teste
    addDailyChecklist, // Adicionado para o botão de teste
    assignDailyChecklistToConsultant // Adicionado para o botão de teste
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


  const handleAddNewChecklist = () => {
    setEditingChecklist(null);
    setIsChecklistModalOpen(true);
  };

  const handleEditChecklist = (checklist: DailyChecklist) => {
    setEditingChecklist(checklist);
    setIsChecklistModalOpen(true);
  };

  const handleDeleteChecklist = async (checklistId: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o checklist "${title}" e todos os seus itens e atribuições?`)) {
      await deleteDailyChecklist(checklistId);
    }
  };

  const handleToggleChecklistActive = async (checklist: DailyChecklist) => {
    await updateDailyChecklist(checklist.id, { is_active: !checklist.is_active });
  };

  const handleOpenAssignmentModal = (checklist: DailyChecklist) => {
    setSelectedChecklistForAssignment(checklist);
    setIsAssignmentModalOpen(true);
  };

  const handleAddNewItem = (checklist: DailyChecklist) => {
    setSelectedChecklistForItem(checklist);
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: DailyChecklistItem, checklist: DailyChecklist) => {
    setSelectedChecklistForItem(checklist);
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string, text: string) => {
    if (window.confirm(`Tem certeza que deseja remover o item "${text}"?`)) {
      await deleteDailyChecklistItem(itemId);
      toast.success("Item removido com sucesso!");
    }
  };

  const handleMoveItem = async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    await moveDailyChecklistItem(checklistId, itemId, direction);
    toast.success("Item movido com sucesso!");
  };

  const handleOpenResourceModal = (item: DailyChecklistItem) => {
    setSelectedResourceItem(item);
    setIsResourceModalOpen(true);
  };

  const sortedChecklists = useMemo(() => {
    return [...dailyChecklists].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dailyChecklists]);

  const getResourceTypeIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-red-500" />;
      case 'audio': return <Music className="w-4 h-4 text-brand-500" />;
      case 'text_audio': return <BookText className="w-4 h-4 text-orange-500" />; // NOVO: Ícone para texto + áudio
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case 'text': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'none': return <X className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Metas Diárias</h1>
          <p className="text-gray-500 dark:text-gray-400">Crie e gerencie as metas diárias para seus consultores.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddNewChecklist} className="bg-brand-600 hover:bg-brand-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Checklist
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {sortedChecklists.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist criado ainda.</p>
            <p className="text-sm text-gray-400">Clique em "Novo Checklist" para começar.</p>
          </div>
        ) : (
          sortedChecklists.map((checklist) => (
            <div key={checklist.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden ${!checklist.is_active ? 'opacity-60' : ''}`}>
              <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{checklist.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checklist.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}>
                    {checklist.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenAssignmentModal(checklist)} className="flex items-center space-x-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <Users className="w-4 h-4" />
                    <span>Atribuir</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleChecklistActive(checklist)} className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    {checklist.is_active ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditChecklist(checklist)} className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteChecklist(checklist.id, checklist.title)} className="p-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {dailyChecklistItems
                  .filter((item) => item.daily_checklist_id === checklist.id)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item, index, arr) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                      <div className="flex-1 mr-4 flex items-center space-x-2">
                        {item.resource && item.resource.type !== 'none' && ( // Only show icon if resource is not 'none'
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenResourceModal(item)}
                            className="p-1.5 text-gray-400 hover:text-brand-600"
                            title="Ver material de apoio"
                          >
                            {getResourceTypeIcon(item.resource.type)}
                          </Button>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-200">{item.text}</span>
                      </div>

                      <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMoveItem(checklist.id, item.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMoveItem(checklist.id, item.id, 'down')}
                          disabled={index === arr.length - 1}
                          className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditItem(item, checklist)}
                          className="p-1.5 text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteItem(item.id, item.text)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                <div className="p-4 bg-gray-50/50 dark:bg-slate-700/30">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleAddNewItem(checklist)}
                    className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Tarefa
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ChecklistModal 
        isOpen={isChecklistModalOpen} 
        onClose={() => setIsChecklistModalOpen(false)} 
        checklist={editingChecklist} 
      />
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        checklist={selectedChecklistForAssignment}
      />
      {selectedChecklistForItem && (
        <ChecklistItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          checklistId={selectedChecklistForItem.id}
          item={editingItem}
        />
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