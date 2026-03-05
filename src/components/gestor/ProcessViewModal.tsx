import React from 'react';
import { X, FileText, Image as ImageIcon, Download, Link as LinkIcon, Copy, Check } from 'lucide-react';
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
import toast from 'react-hot-toast';

interface ProcessViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

export const ProcessViewModal: React.FC<ProcessViewModalProps> = ({ isOpen, onClose, process }) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen || !process) return null;

  const shareableLink = `${window.location.origin}${window.location.pathname}#/public-process/${process.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Download de "${fileName}" iniciado.`);
    } catch (error) {
      console.error("Erro ao baixar o arquivo:", error);
      toast.error("Falha ao iniciar o download do arquivo.");
    }
  };

  const renderFilePreview = () => {
    if (!process.file_url) return null;

    const fileName = process.file_url.split('/').pop() || 'arquivo_anexado';

    if (process.file_type === 'image') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center space-y-3">
          <img src={process.file_url} alt="Anexo" className="rounded-lg max-h-80 w-auto" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDownloadFile(process.file_url!, fileName)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Imagem
          </Button>
        </div>
      );
    }

    if (process.file_type === 'pdf') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Documento PDF Anexado</p>
              <a href={process.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Abrir em nova aba
              </a>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDownloadFile(process.file_url!, fileName)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
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

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <LinkIcon className="w-5 h-5 mr-2 text-brand-500" /> Link Compartilhável
          </h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              readOnly
              value={shareableLink}
              className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-mono"
            />
            <Button
              onClick={handleCopyLink}
              className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
              title="Copiar Link"
            >
              {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Compartilhe este link para que outras pessoas possam visualizar este processo.
          </p>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};