import React from 'react';
import { X, FileText, Image as ImageIcon, Download, Link as LinkIcon, Copy, Check, Video, Music, ExternalLink } from 'lucide-react';
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
import YouTube from 'react-youtube';

interface ProcessViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

const getYouTubeID = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

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

    if (process.file_type === 'link') {
      const youtubeId = getYouTubeID(process.file_url);
      if (youtubeId) {
        return (
          <div className="mt-4 aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg">
            <YouTube
              videoId={youtubeId}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              opts={{ playerVars: { rel: 0 } }}
            />
          </div>
        );
      }
      return (
        <div className="mt-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center text-center">
          <LinkIcon className="w-10 h-10 text-blue-500 mb-3" />
          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Link Externo de Apoio</p>
          <a 
            href={process.file_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center"
          >
            {process.file_url} <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      );
    }

    if (process.file_type === 'image') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center space-y-3">
          <img src={process.file_url} alt="Anexo" className="rounded-lg max-h-96 w-auto shadow-sm" />
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

    if (process.file_type === 'video') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center space-y-3">
          <video src={process.file_url} controls className="rounded-lg max-h-96 w-full shadow-sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(process.file_url!, fileName)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Vídeo
          </Button>
        </div>
      );
    }

    if (process.file_type === 'audio') {
      return (
        <div className="mt-4 p-6 bg-gray-100 dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-4 w-full">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full">
              <Music className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <audio src={process.file_url} controls className="flex-1" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(process.file_url!, fileName)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Áudio
          </Button>
        </div>
      );
    }

    if (process.file_type === 'pdf') {
      return (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-xl flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full">
              <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Documento PDF Anexado</p>
              <a href={process.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                Abrir em nova aba <ExternalLink className="w-2 h-2 ml-1" />
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
          <div className="space-y-6">
            {renderFilePreview()}
            {process.content && (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                {process.content}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
            <LinkIcon className="w-4 h-4 mr-2" /> Link de Compartilhamento
          </h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              readOnly
              value={shareableLink}
              className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-xs font-mono"
            />
            <Button
              onClick={handleCopyLink}
              className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
              title="Copiar Link"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};