import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, FileText, Type, MessageSquare, Upload, Image as ImageIcon, Trash2, Video, Music } from 'lucide-react';
import { Process } from '@/types';
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

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
  onSave: (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Process, file?: File | null) => Promise<void>;
}

export const ProcessModal: React.FC<ProcessModalProps> = ({ isOpen, onClose, process, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | undefined>(undefined);
  const [removeFile, setRemoveFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(process?.title || '');
      setDescription(process?.description || '');
      setContent(process?.content || '');
      setSelectedFile(null);
      setExistingFileUrl(process?.file_url);
      setRemoveFile(false);
      setError('');
    }
  }, [isOpen, process]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setExistingFileUrl(undefined); // Clear existing file if new one is selected
      setRemoveFile(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExistingFileUrl(undefined);
    setRemoveFile(true);
  };

  const getFileType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'pdf';
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
      const processData = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        type: 'Documento',
        file_url: removeFile ? undefined : existingFileUrl,
        file_type: removeFile ? undefined : (selectedFile ? getFileType(selectedFile) : process?.file_type),
      };

      if (process) {
        await onSave({ ...process, ...processData }, selectedFile);
      } else {
        await onSave(processData, selectedFile);
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

  const getFileIcon = (type?: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'video': return <Video className="w-4 h-4 text-blue-500" />;
      case 'audio': return <Music className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{process ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          <DialogDescription>
            {process ? 'Edite os detalhes deste processo.' : 'Crie um novo documento de processo interno.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
            <div>
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
            <div>
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
            <div>
              <Label htmlFor="content">Conteúdo do Processo</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Descreva o passo a passo do processo aqui..."
                />
              </div>
            </div>
            <div>
              <Label>Anexo (PDF, Imagem, Áudio ou Vídeo)</Label>
              {existingFileUrl && !selectedFile ? (
                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(process?.file_type)}
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{existingFileUrl.split('/').pop()}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                  <Upload className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedFile ? selectedFile.name : 'Selecionar arquivo...'}</span>
                  <input type="file" className="hidden" accept="image/*,application/pdf,video/*,audio/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isSaving ? 'Salvando...' : 'Salvar Processo'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};