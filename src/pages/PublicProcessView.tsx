import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Process, ProcessAttachment } from '@/types';
import { Loader2, FileText, Image as ImageIcon, Download, Link as LinkIcon, AlertTriangle, TrendingUp, Video, Music, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import YouTube from 'react-youtube';

const getYouTubeID = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const PublicProcessView = () => {
  const { processId } = useParams<{ processId: string }>();
  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcess = useCallback(async () => {
    if (!processId) {
      setError("ID do processo não encontrado.");
      setLoading(false);
      return;
    }

    try {
      // 1. Busca os dados básicos do processo
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .select('*')
        .eq('id', processId)
        .maybeSingle();

      if (processError) throw processError;
      if (!processData) throw new Error("Processo não encontrado.");

      // 2. Busca os anexos separadamente para evitar erro de relacionamento (join)
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('process_attachments')
        .select('*')
        .eq('process_id', processId);

      if (attachmentsError) {
        console.warn("Erro ao carregar anexos, mas continuando com o processo:", attachmentsError);
      }

      setProcess({
        ...processData,
        attachments: attachmentsData || []
      } as Process);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao carregar o processo.");
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    fetchProcess();
  }, [fetchProcess]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-900/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-red-800 dark:text-red-200">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h2 className="mt-6 text-2xl font-extrabold">Erro ao Carregar Processo</h2>
          <p className="mt-2 text-sm">{error || "Processo não encontrado ou inválido."}</p>
          <p className="mt-4 text-xs text-red-700 dark:text-red-300">Por favor, verifique o link ou entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500 text-white p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos Internos</h1>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{process.title}</h2>
          {process.description && (
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">{process.description}</p>
          )}
          
          <ScrollArea className="h-[calc(100vh-20rem)] pr-4 custom-scrollbar">
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
        </div>
      </main>
    </div>
  );
};