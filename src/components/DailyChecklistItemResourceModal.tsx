import React from 'react';
import { X, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquare, Video, Music, BookText } from 'lucide-react'; // Importar BookText icon
import { DailyChecklistItemResource } from '@/types';
import YouTube from 'react-youtube';

interface DailyChecklistItemResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemText: string;
  resource: DailyChecklistItemResource | undefined;
}

const getYouTubeID = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const DailyChecklistItemResourceModal: React.FC<DailyChecklistItemResourceModalProps> = ({
  isOpen,
  onClose,
  itemText,
  resource,
}) => {
  if (!isOpen || !resource) return null;

  const renderContent = () => {
    switch (resource.type) {
      case 'video':
        const youtubeId = getYouTubeID(resource.content as string); // Cast content to string
        if (youtubeId) {
          return (
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
              <YouTube
                videoId={youtubeId}
                className="w-full h-full"
                iframeClassName="w-full h-full"
                opts={{
                  playerVars: {
                    autoplay: 1,
                    rel: 0,
                  },
                }}
              />
            </div>
          );
        }
        return <p className="text-red-500">Link de vídeo inválido.</p>;
      case 'audio':
        return (
          <div className="w-full flex flex-col items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <Music className="w-12 h-12 text-brand-500 mb-3" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{resource.name || "Áudio"}</p>
            <audio controls src={resource.content as string} className="w-full max-w-md"></audio> {/* Cast content to string */}
          </div>
        );
      case 'text_audio': // NOVO: Caso para texto + áudio
        const textAudioContent = resource.content as { text: string; audioUrl: string; };
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Texto</h4>
              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {textAudioContent.text}
              </div>
            </div>
            {textAudioContent.audioUrl && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center"><Music className="w-4 h-4 mr-2" /> Áudio</h4>
                <div className="w-full flex flex-col items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <audio controls src={textAudioContent.audioUrl} className="w-full max-w-md"></audio>
                </div>
              </div>
            )}
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={resource.content as string} // Cast content to string
            className="w-full h-[500px] border-0 rounded-lg"
            title={resource.name || "Documento PDF"}
          ></iframe>
        );
      case 'image':
        return <img src={resource.content as string} alt={resource.name || "Imagem"} className="max-w-full h-auto rounded-lg" />; // Cast content to string
      case 'link':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <LinkIcon className="w-12 h-12 text-blue-500 mb-3" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{resource.name || "Link Externo"}</p>
            <a
              href={resource.content as string} // Cast content to string
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
            >
              {resource.content as string}
            </a>
          </div>
        );
      case 'text':
        return (
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {resource.content as string}
          </div>
        );
      default:
        return <p className="text-gray-500">Tipo de recurso não suportado.</p>;
    }
  };

  const getIcon = (type: DailyChecklistItemResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-red-500" />;
      case 'audio': return <Music className="w-5 h-5 text-brand-500" />;
      case 'text_audio': return <BookText className="w-5 h-5 text-orange-500" />; // NOVO: Ícone para texto + áudio
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-blue-500" />;
      case 'text': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      default: return <X className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center space-x-2">
            {getIcon(resource.type)}
            <span>Como fazer: {itemText}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {renderContent()}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};