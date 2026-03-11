import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, FileText, Type, MessageSquare, Upload, Image as ImageIcon, Trash2, Video, Music, Link as LinkIcon, XCircle, Plus, ExternalLink, Check, Copy } from 'lucide-react';
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
import { toast } from 'sonner'; // Using Sonner for toasts
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
  onSave: (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Process, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => Promise<void>;
}

const MAX_FILE_SIZE_MB = 500;

const formSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  description: z.string().optional(),
  content: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export const ProcessModal: React.FC<ProcessModalProps> = ({ isOpen, onClose, process, onSave }) => {
  const { deleteProcessAttachment } = useApp();
  const [filesToAdd, setFilesToAdd] = useState<{ file: File, type: string, preview: string }[]>([]);
  const [linksToAdd, setLinksToAdd] = useState<string[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState<ProcessAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: process?.title || '',
        description: process?.description || '',
        content: process?.content || '',
      });
      setFilesToAdd([]);
      setLinksToAdd([]);
      setNewLinkUrl('');
      setCurrentAttachments(process?.attachments || []);
    }
  }, [isOpen, process, reset]);

  const getFileType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'pdf';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: { file: File, type: string, preview: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.error(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
          continue;
        }
        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          type: getFileType(file),
          preview
        });
      }
      setFilesToAdd(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles: { file: File, type: string, preview: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.error(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
          continue;
        }
        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          type: getFileType(file),
          preview
        });
      }
      setFilesToAdd(prev => [...prev, ...newFiles]);
    }
  };

  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      if (!newLinkUrl.startsWith('http://') && !newLinkUrl.startsWith('https://')) {
        toast.warning("URL pode não ser válida. Certifique-se de que começa com http:// ou https://");
      }
      setLinksToAdd(prev => [...prev, newLinkUrl.trim()]);
      setNewLinkUrl('');
    }
  };

  const handleRemoveFileToAdd = (index: number) => {
    setFilesToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveLinkToAdd = (index: number) => {
    setLinksToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    const originalAttachments = [...currentAttachments];
    setCurrentAttachments(prev => prev.filter(att => att.id !== attachmentId));
    toast.promise(
      deleteProcessAttachment(attachmentId),
      {
        loading: "Removendo anexo...",
        success: "Anexo removido com sucesso!",
        error: (err) => {
          setCurrentAttachments(originalAttachments);
          return `Erro ao remover anexo: ${err.message}`;
        },
      }
    );
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const processData: any = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        content: data.content?.trim() || undefined,
        type: 'Documento',
      };

      const filesToUpload = filesToAdd.map(f => ({ file: f.file, type: f.type }));
      const linksToSave = linksToAdd.map(url => ({ url, type: 'link' as const }));

      await onSave(process ? { ...process, ...processData } : processData, filesToUpload, linksToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar processo:", err);
      toast.error(err.message || 'Falha ao salvar o processo.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFilePreview = (file: { file: File, type: string, preview: string }, index: number) => {
    const commonClasses = "w-16 h-16 object-cover rounded-md";
    switch (file.type) {
      case 'image':
        return <img src={file.preview} alt={file.file.name} className={commonClasses} />;
      case 'pdf':
        return <FileText className="w-10 h-10 text-red-500" />;
      case 'video':
        return <Video className="w-10 h-10 text-blue-500" />;
      case 'audio':
        return <Music className="w-10 h-10 text-purple-500" />;
      default:
        return <FileText className="w-10 h-10 text-gray-500" />;
    }
  };

  const debouncedSaveIndicator = useDebouncedCallback(() => {
    if (isDirty && !isSaving) {
      toast.info("Salvando rascunho...", { duration: 1500 });
    }
  }, 3000);

  useEffect(() => {
    if (isDirty && !isSaving) {
      debouncedSaveIndicator();
    }
  }, [isDirty, isSaving, debouncedSaveIndicator]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-0 overflow-hidden flex flex-col max-h-[95vh] shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{process ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
            <DialogDescription>
              {process ? 'Edite os detalhes deste processo.' : 'Crie um novo documento de processo interno.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="grid gap-6 p-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3 }}
                className="border-b border-gray-200 dark:border-slate-700 pb-6"
              >
                <Label className="mb-4 block font-bold text-gray-900 dark:text-white text-base">Anexos e Links de Apoio</Label>
                
                {currentAttachments.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase">Anexos Atuais</p>
                    {currentAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {att.file_type === 'image' ? <ImageIcon className="w-5 h-5 text-green-500" /> :
                           att.file_type === 'pdf' ? <FileText className="w-5 h-5 text-red-500" /> :
                           att.file_type === 'video' ? <Video className="w-5 h-5 text-blue-500" /> :
                           att.file_type === 'audio' ? <Music className="w-5 h-5 text-purple-500" /> :
                           att.file_type === 'link' ? <LinkIcon className="w-5 h-5 text-blue-500" /> :
                           <FileText className="w-5 h-5 text-brand-500" />}
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{att.file_name || att.file_url}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteExistingAttachment(att.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase">Adicionar Arquivos</p>
                  <motion.label 
                    htmlFor="file-upload-zone"
                    className="flex flex-col items-center justify-center px-4 py-6 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700 group"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Upload className="w-8 h-8 mb-2 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">
                      Arraste e solte arquivos aqui ou clique para selecionar (máx. {MAX_FILE_SIZE_MB}MB por arquivo)
                    </span>
                    <input 
                      id="file-upload-zone"
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*,application/pdf,video/*,audio/*" 
                      onChange={handleFileChange} 
                      ref={fileInputRef}
                    />
                  </motion.label>
                  
                  {filesToAdd.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {filesToAdd.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-900/30">
                          <div className="flex items-center space-x-2">
                            {renderFilePreview(f, i)}
                            <span className="text-xs font-medium text-brand-700 dark:text-brand-300 truncate max-w-[300px]">{f.file.name}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveFileToAdd(i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

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
                    <motion.button 
                      type="button" 
                      onClick={handleAddLink} 
                      variant="outline" 
                      className="dark:bg-slate-700 dark:text-white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                  
                  {linksToAdd.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {linksToAdd.map((link, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[400px]">{link}</span>
                          <button type="button" onClick={() => handleRemoveLinkToAdd(i)} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-2"
              >
                <Label htmlFor="title">Título *</Label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="title"
                    {...register('title')}
                    className={`pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600 ${errors.title ? 'border-red-500' : ''}`}
                    placeholder="Ex: Processo de Venda de Consórcio"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="description"
                    {...register('description')}
                    rows={2}
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Uma breve descrição sobre o objetivo deste processo."
                  />
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3, delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="content">Conteúdo do Processo</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="content"
                    {...register('content')}
                    rows={6}
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Descreva o passo a passo do processo aqui..."
                  />
                </div>
              </motion.div>
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0">
            {Object.keys(errors).length > 0 && <p className="text-red-500 text-sm mb-4 flex items-center font-medium"><XCircle className="w-4 h-4 mr-2" />Por favor, corrija os erros no formulário.</p>}
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
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