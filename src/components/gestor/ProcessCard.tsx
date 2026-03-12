import React from 'react';
import { Process } from '@/types';
import { FileText, Image as ImageIcon, Video, Music, Link as LinkIcon, MoreVertical, Trash2, Edit2, Eye, Paperclip, Clock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRelativeDate } from '@/utils/dateUtils';
import { toast } from 'sonner'; // Importar toast para notificações
import { getYouTubeThumbnail } from '@/utils/videoUtils';

interface ProcessCardProps {
  process: Process;
  onView: (process: Process) => void;
  onEdit: (process: Process) => void;
  onDelete: (e: React.MouseEvent, process: Process) => void;
  index: number; // For stagger animation
}

const getProcessIcon = (process: Process) => {
  const hasAttachments = process.attachments && process.attachments.length > 0;
  if (!hasAttachments) return <FileText className="w-8 h-8 text-brand-500" />;
  
  const firstType = process.attachments![0].file_type;
  switch (firstType) {
    case 'image': return <ImageIcon className="w-8 h-8 text-green-500" />;
    case 'video': return <Video className="w-8 h-8 text-blue-500" />;
    case 'audio': return <Music className="w-8 h-8 text-purple-500" />;
    case 'link': return <LinkIcon className="w-8 h-8 text-blue-400" />;
    default: return <FileText className="w-8 h-8 text-brand-500" />;
  }
};

const getThumbnail = (process: Process): { type: 'image' | 'video', url: string } | undefined => {
  // Prioridade 0: Imagem de capa explícita
  if (process.cover_url) {
    return { type: 'image', url: process.cover_url };
  }

  if (!process.attachments || process.attachments.length === 0) return undefined;

  // Prioridade 1: Anexo de imagem
  const imageAttachment = process.attachments.find(att => att.file_type === 'image');
  if (imageAttachment) return { type: 'image', url: imageAttachment.file_url };

  // Prioridade 2: Thumbnail de vídeo do YouTube
  const videoLinkAttachment = process.attachments.find(att => att.file_type === 'link' && att.file_url.includes('youtu'));
  if (videoLinkAttachment) {
    const thumbnailUrl = getYouTubeThumbnail(videoLinkAttachment.file_url);
    if (thumbnailUrl) return { type: 'image', url: thumbnailUrl };
  }

  // Prioridade 3: Arquivo de vídeo direto
  const videoFileAttachment = process.attachments.find(att => att.file_type === 'video');
  if (videoFileAttachment) {
    return { type: 'video', url: videoFileAttachment.file_url };
  }

  return undefined;
};

const getBackgroundColor = (title: string): string => {
  const colors = ['#ff7a00', '#00b8d4', '#ffc107', '#4caf50', '#9c27b0', '#f44336', '#2196f3'];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash % colors.length);
  return colors[colorIndex];
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const ProcessCard: React.FC<ProcessCardProps> = ({ process, onView, onEdit, onDelete, index }) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const thumbnail = getThumbnail(process);
  const bgColor = getBackgroundColor(process.title);

  const shareableLink = `${window.location.origin}${window.location.pathname}#/public-process/${process.id}`;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique no botão abra o modal de visualização
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      className="relative group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all overflow-hidden"
    >
      {/* Thumbnail or Icon */}
      <div className="h-40 flex items-center justify-center relative overflow-hidden rounded-t-xl bg-gray-200 dark:bg-slate-700">
        {thumbnail ? (
          thumbnail.type === 'image' ? (
            <img src={thumbnail.url} alt={process.title} className="w-full h-full object-cover" />
          ) : (
            <video src={`${thumbnail.url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" muted playsInline />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            {React.cloneElement(getProcessIcon(process), { className: "w-12 h-12 text-white opacity-80" })}
          </div>
        )}
        {/* Overlay for hover actions */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-x-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onView(process); }}
            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            title="Visualizar"
          >
            <Eye className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopyLink}
            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            title="Copiar Link do Processo"
          >
            {copiedLink ? <Check className="w-5 h-5 text-green-500" /> : <LinkIcon className="w-5 h-5" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onEdit(process); }}
            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => onDelete(e, process)}
            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-2" title={process.title}>
          {process.title}
        </h3>
        {process.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {process.description}
          </p>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatRelativeDate(process.updated_at)}
          </span>
          {process.attachments && process.attachments.length > 0 && (
            <span className="flex items-center bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
              <Paperclip className="w-3 h-3 mr-1" /> {process.attachments.length}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};