import React from 'react';
import { X, FileText, Image as ImageIcon, Download, Link as LinkIcon, Copy, Check, Video, Music, ExternalLink, BookText, Paperclip, Share2 } from 'lucide-react';
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
import { toast } from 'sonner';
import YouTube from 'react-youtube';
import { QRCodeGenerator } from '@/components/ui/qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getYouTubeID } from '@/utils/videoUtils';

interface ProcessViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

export const ProcessViewModal: React.FC<ProcessViewModalProps> = ({ isOpen, onClose, process }) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showShareOptions, setShowShareOptions] = React.useState(false);

  if (!isOpen || !process) return null;

  const shareableLink = `${window.location.origin}${window.location.pathname}#/public-process/${process.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2000);
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

  const renderAttachment = (att: ProcessAttachment) => {
    const fileName = att.file_name || att.file_url.split('/').pop() || 'arquivo_anexado';

    switch (att.file_type) {
      case 'video':
        return (
          <motion.div 
            key={att.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="bg-black rounded-xl overflow-hidden shadow-lg"
          >
            <video
              src={att.file_url}
              controls
              className="w-full h-full aspect-video"
            />
            <div className="p-3 bg-gray-800 text-white text-sm font-medium flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-gray-300 hover:text-white">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );
      case 'link':
        const youtubeId = getYouTubeID(att.file_url);
        if (youtubeId) {
          return (
            <motion.div 
              key={att.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4 }}
              className="bg-black rounded-xl overflow-hidden shadow-lg"
            >
              <YouTube
                videoId={youtubeId}
                className="w-full h-full aspect-video"
                iframeClassName="w-full h-full"
                opts={{ playerVars: { rel: 0, autoplay: 0 } }}
              />
              <div className="p-3 bg-gray-800 text-white text-sm font-medium flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>{fileName}</span>
              </div>
            </motion.div>
          );
        }
        return (
          <motion.div 
            key={att.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between"
          >
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
          </motion.div>
        );
      case 'image':
        return (
          <motion.div 
            key={att.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm"
          >
            <img src={att.file_url} alt={fileName} className="w-full h-auto object-cover max-h-96" />
            <div className="p-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-600">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-gray-400 hover:text-brand-500">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );
      case 'pdf':
        return (
          <motion.div 
            key={att.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <FileText className="w-5 h-5 text-red-500 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 truncate">Documento PDF</p>
                <span className="text-xs text-red-600 dark:text-red-400 truncate block">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full" title="Visualizar PDF">
                <ExternalLink className="w-4 h-4" />
              </a>
              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-red-600 hover:text-red-700">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );
      case 'audio':
        return (
          <motion.div 
            key={att.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col space-y-3"
          >
            <div className="flex items-center space-x-3">
              <Music className="w-5 h-5 text-purple-500 shrink-0" />
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 truncate">{fileName}</p>
            </div>
            <audio controls src={att.file_url} className="w-full"></audio>
            <div className="flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-purple-600 hover:text-purple-700">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );
      default:
        return (
          <div key={att.id} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <BookText className="w-5 h-5 text-gray-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fileName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-gray-400 hover:text-brand-500">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-white dark:bg-slate-800 dark:text-white p-0 shadow-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[95vh] overflow-hidden">
        <DialogHeader className="p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <DialogTitle className="text-2xl font-bold">{process.title}</DialogTitle>
          {process.description && (
            <DialogDescription className="text-base text-gray-500 dark:text-gray-400">
              {process.description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 custom-scrollbar">
          <div className="p-6 space-y-8">
            {/* Main Content */}
            {process.content && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-3">
                  <BookText className="w-6 h-6 text-brand-500" />
                  <span>Conteúdo Principal</span>
                </h3>
                <div className="text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner whitespace-pre-wrap">
                  {process.content}
                </div>
              </motion.div>
            )}

            {/* Attachments / Resources */}
            {process.attachments && process.attachments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-3">
                  <Paperclip className="w-6 h-6 text-brand-500" />
                  <span>Recursos de Apoio</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {process.attachments.map(att => renderAttachment(att))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-gray-100 dark:border-slate-700 shrink-0">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
            <LinkIcon className="w-4 h-4 mr-2" /> Link de Compartilhamento
          </h3>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <input
              type="text"
              readOnly
              value={shareableLink}
              className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-xs font-mono w-full"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLink}
              className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition w-full sm:w-auto"
              title="Copiar Link"
            >
              {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition w-full sm:w-auto"
              title="Compartilhar"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>
          <AnimatePresence>
            {showShareOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 flex flex-col items-center space-y-4"
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Compartilhe este processo via QR Code:</p>
                <QRCodeGenerator value={shareableLink} size={160} fgColor="#ff7a00" bgColor="#ffffff" className="p-2 bg-white rounded-lg shadow-md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};