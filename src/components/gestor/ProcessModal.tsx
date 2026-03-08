import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, FileText, Type, MessageSquare, Upload, Image as ImageIcon, Trash2, Video, Music, Link as LinkIcon, XCircle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [attachmentType, setAttachmentType] = useState<'none' | 'file' | 'link'>('none');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [existingFileUrl, setExistingFileUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(process?.title || '');
      setDescription(process?.description || '');
      setContent(process?.content || '');
      setSelectedFile(null);
      setExistingFileUrl(process?.file_url);
      
      if (process?.file_type === 'link') {
        setAttachmentType('link');
        setLinkUrl(process.file_url || '');
      } else if (process?.file_url) {
        setAttachmentType('file');
        setLinkUrl('');
      } else {
        setAttachmentType('none');
        setLinkUrl('');
      }
      
      setError('');
    }
  }, [isOpen, process]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setExistingFileUrl(undefined);
    }
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

    if (attachmentType === 'link' && !linkUrl.trim()) {
      setError("A URL do link é obrigatória.");
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

      let fileToUpload: File | null = null;

      if (attachmentType === 'none') {
        processData.file_url = null;
        processData.file_type = null;
      } else if (attachmentType === 'link') {
        processData.file_url = linkUrl.trim();
        processData.file_type = 'link';
      } else if (attachmentType === 'file') {
        if (selectedFile) {
          fileToUpload = selectedFile;
          processData.file_type = getFileType(selectedFile);
        } else {
          processData.file_url = existingFileUrl;
          processData.file_type = process?.file_type;
        }
      }

      if (process) {
        await onSave({ ...process, ...processData }, fileToUpload);
      } else {
        await onSave(processData, fileToUpload);
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
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{process ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          <DialogDescription>
            {process ? 'Edite os detalhes deste processo.' : 'Crie um novo documento de processo interno.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
            <div className="grid gap-4">
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
                    rows={6}
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Descreva o passo a passo do processo aqui..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-2">
                <Label className="mb-3 block font-bold text-gray-900 dark:text-white">Anexo ou Link de Apoio</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant={attachmentType === 'none' ? 'default' : 'outline'}
                    onClick={() => setAttachmentType('none')}
                    className={`flex-1 ${attachmentType === 'none' ? 'bg-brand-600 text-white' : 'dark:bg-slate-700 dark:text-white'}`}
                  >
                    Nenhum
                  </Button>
                  <Button
                    type="button"
                    variant={attachmentType === 'file' ? 'default' : 'outline'}
                    onClick={() => setAttachmentType('file')}
                    className={`flex-1 ${attachmentType === 'file' ? 'bg-brand-600 text-white' : 'dark:bg-slate-700 dark:text-white'}`}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Arquivo
                  </Button>
                  <Button
                    type="button"
                    variant={attachmentType === 'link' ? 'default' : 'outline'}
                    onClick={() => setAttachmentType('link')}
                    className={`flex-1 ${attachmentType === 'link' ? 'bg-brand-600 text-white' : 'dark:bg-slate-700 dark:text-white'}`}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" /> Link
                  </Button>
                </div>

                {attachmentType === 'file' && (
                  <div className="space-y-3 animate-fade-in">
                    {existingFileUrl && !selectedFile ? (
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-brand-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{existingFileUrl.split('/').pop()}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setExistingFileUrl(undefined)} className="text-red-500 hover:text-red-700">
                          Trocar Arquivo
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center">
                          {selectedFile ? selectedFile.name : 'Clique para selecionar Imagem, PDF, Áudio ou Vídeo'}
                        </span>
                        <input type="file" className="hidden" accept="image/*,application/pdf,video/*,audio/*" onChange={handleFileChange} />
                      </label>
                    )}
                    <p className="text-[10px] text-gray-500 text-center">Formatos aceitos: JPG, PNG, PDF, MP3, MP4.</p>
                  </div>
                )}

                {attachmentType === 'link' && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="linkUrl">URL do Link Externo</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="linkUrl"
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        placeholder="https://www.youtube.com/watch?v=... ou link externo"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">Dica: Links do YouTube serão exibidos como player de vídeo.</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          {error && <p className="text-red-500 text-sm mt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
          
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