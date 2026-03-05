import React from 'react';
import { X, FileText, Image as ImageIcon, Download, Link as LinkIcon } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

export const ProcessViewModal: React.FC<ProcessViewModalProps> = ({ isOpen, onClose, process }) => {
  if (!isOpen || !process) return null;

  const renderFilePreview = () => {
    if (!process.file_url) return null;

    if (process.file_type === 'image') {
      return (
        <div className="mt-4">
          <img src={process.file_url} alt="Anexo" className="rounded-lg max-h-80 w-auto mx-auto" />
        </div>
      );
    }

    if (process.file_type === 'pdf') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Documento PDF Anexado</p>
              <a href={process.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Abrir em nova aba
              </a>
            </div>
          </div>
          <a href={process.file_url} download target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="dark:bg-slate-600">
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{process.title}</DialogTitle>
          {process.description && (
            <DialogDescription className="text-base text-gray-500 dark:text-gray-400">
              {process.description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] my-4 pr-4 custom-scrollbar">
          <div className="space-y-4">
            {renderFilePreview()}
            {process.content && (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                {process.content}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};