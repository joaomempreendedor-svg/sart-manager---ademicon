import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, FileText, Type, MessageSquare, Upload, Image as ImageIcon, Trash2, Video, Music, Link as LinkIcon, XCircle, Plus, ExternalLink } from 'lucide-react';
import { Process, ProcessAttachment } from '@/types';
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
import { useApp } from '@/context/AppContext';

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
  onSave: (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Process, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => Promise<void>;
}

export const ProcessModal: React.FC<ProcessModalProps> = ({ isOpen, onClose, process, onSave }) => {
  const { deleteProcessAttachment } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  
  const [filesToAdd, setFilesToAdd] = useState<{ file: File, type: string }[]>([]);
  const [linksToAdd, setLinksToAdd] = useState<{ url: string, type: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(process?.title || '');
      setDescription(process?.description || '');
      setContent(process?.content || '');
      setFilesToAdd([]);
      setLinksToAdd([]);
      setNewLinkUrl('');
      setError('');
    }
  }, [isOpen, process]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map(file => ({
        file,
        type: getFileType(file)
      }));
      setFilesToAdd(prev => [...prev, ...newFiles]);
    }
  };

  const getFileType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'pdf';
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setLinksToAdd(prev => [...prev, { url: newLinkUrl.trim(), type: 'link' }]);
    setNewLinkUrl('');
  };

  const handleRemoveFileToAdd = (index: number) => {
    setFilesToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveLinkToAdd = (index: number) => {
    setLinksToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    if (window.confirm("Deseja remover este anexo permanentemente?")) {
      try {
        await deleteProcessAttachment(attachmentId);
      } catch (err: any) {
        alert("Erro ao remover anexo.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError("O título do processo é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const processData: any = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        type: 'Documento',
      };

      if (process) {
        await onSave({ ...process, ...processData }, filesToAdd, linksToAdd);
      } else {
        await onSave(processData, filesToAdd, linksToAdd);
      }
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar processo:", err);
      setError(err.message || 'Falha ao salvar o processo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <DialogHeader>
            <DialogTitle>{process ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
            <DialogDescription>
              {process ? 'Edite os detalhes deste processo.' : 'Crie um novo documento de processo interno.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid gap-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Ex: Processo de Venda de Consórcio"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Uma breve descrição sobre o objetivo deste processo."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo do Processo</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Descreva o passo a passo do processo aqui..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <Label className="mb-4 block font-bold text-gray-900 dark:text-white text-base">Anexos e Links de Apoio</Label>
                
                {/* Lista de Anexos Existentes */}
                {process?.attachments && process.attachments.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase">Anexos Atuais</p>
                    {process.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {att.file_type === 'link' ? <LinkIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-brand-500" />}
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{att.file_name || att.file_url}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteExistingAttachment(att.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar Novos Arquivos */}
                <div className="space-y-4 mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase">Adicionar Arquivos</p>
                  <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700 group">
                    <Upload className="w-8 h-8 mb-2 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">
                      Clique para selecionar Imagem, PDF, Áudio ou Vídeo
                    </span>
                    <input type="file" className="hidden" multiple accept="image/*,application/pdf,video/*,audio/*" onChange={handleFileChange} />
                  </label>
                  
                  {filesToAdd.length > 0 && (
                    <div className="space-y-2">
                      {filesToAdd.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-900/30">
                          <span className="text-xs font-medium text-brand-700 dark:text-brand-300 truncate max-w-[400px]">{f.file.name}</span>
                          <button type="button" onClick={() => handleRemoveFileToAdd(i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adicionar Novos Links */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Adicionar Links</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="button" onClick={handleAddLink} variant="outline" className="dark:bg-slate-700 dark:text-white">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {linksToAdd.length > 0 && (
                    <div className="space-y-2">
                      {linksToAdd.map((l, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[400px]">{l.url}</span>
                          <button type="button" onClick={() => handleRemoveLinkToAdd(i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0">
            {error && <p className="text-red-500 text-sm mb-4 flex items-center font-medium"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white min-w-[140px] w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>{isSaving ? 'Salvando...' : 'Salvar Processo'}</span>
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};