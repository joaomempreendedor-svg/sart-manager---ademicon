import React from 'react';
import { X, FileText, Image as ImageIcon, Download, Link as LinkIcon, Copy, Check, Video, Music, ExternalLink } from 'lucide-react';
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
      link.removeChild(link); // Remove the element after click
      window.URL.revokeObjectURL(url);

      toast.success(`Download de "${fileName}" iniciado.`);
    } catch (error) {
      console.error("Erro ao baixar o arquivo:", error);
      toast.error("Falha ao iniciar o download do arquivo.");
    }
  };

  const renderAttachment = (att: ProcessAttachment) => {
    const fileName = att.file_name || att.file_url.split('/').pop() || 'arquivo_anexado';

    if (att.file_type === 'link') {
      const youtubeId = getYouTubeID(att.file_url);
      if (youtubeId) {
        return (
          <div key={att.id} className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg">
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
        <div key={att.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <LinkIcon className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">Link Externo</p>
              <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">
                {att.file_url}
              </a>
            </div>
          </div>
          <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      );
    }

    const iconMap = {
      image: <ImageIcon className="w-6 h-6 text-green-500" />,
      video: <Video className="w-6 h-6 text-blue-500" />,
      audio: <Music className="w-6 h-6 text-purple-500" />,
      pdf: <FileText className="w-6 h-6 text-red-500" />,
    };

    return (
      <div key={att.id} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            {iconMap[att.file_type as keyof typeof iconMap] || <FileText className="w-6 h-6 text-gray-500" />}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fileName}</p>
            <p className="text-[10px] text-gray-500 uppercase">{att.file_type}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {att.file_type === 'image' && (
            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-brand-500 rounded-full">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {att.file_type === 'video' && (
            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-brand-500 rounded-full">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDownloadFile(att.file_url, fileName)}
            className="text-gray-400 hover:text-brand-500"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        {att.file_type === 'video' && (
          <video controls src={att.file_url} className="w-full max-h-64 object-contain rounded-lg mt-4"></video>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-white dark:bg-slate-800 dark:text-white p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <DialogTitle className="text-2xl font-bold">{process.title}</DialogTitle>
          {process.description && (
            <DialogDescription className="text-base text-gray-500 dark:text-gray-400">
              {process.description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 py-4 px-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Render all attachments */}
            {process.attachments && process.attachments.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {process.attachments.map(att => renderAttachment(att))}
              </div>
            )}
            
            {process.content && (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-6 rounded-xl border border-gray-100 dark:border-slate-700">
                {process.content}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 pt-4 border-t border-gray-100 dark:border-slate-700 shrink-0">
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

        <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};