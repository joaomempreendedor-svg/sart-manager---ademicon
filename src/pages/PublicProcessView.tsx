import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Process, ProcessAttachment } from '@/types';
import { Loader2, FileText, Image as ImageIcon, Download, Link as LinkIcon, AlertTriangle, TrendingUp, Video, Music, ExternalLink, BookText, Paperclip } from 'lucide-react';
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
      case 'link':
        const youtubeId = getYouTubeID(att.file_url);
        if (youtubeId) {
          return (
            <div key={att.id} className="bg-black rounded-xl overflow-hidden shadow-lg">
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
      case 'image':
        return (
          <div key={att.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm">
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
          </div>
        );
      case 'pdf':
        return (
          <div key={att.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 flex items-center justify-between">
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
          </div>
        );
      case 'audio':
        return (
          <div key={att.id} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col space-y-3">
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
          </div>
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
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center"> {/* Aumentado max-w */}
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500 text-white p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos Internos</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"> {/* Aumentado max-w e padding */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-slate-700"> {/* Aumentado padding */}
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{process.title}</h2> {/* Aumentado tamanho do título */}
          {process.description && (
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{process.description}</p> {/* Aumentado tamanho e espaçamento */}
          )}
          
          <ScrollArea className="h-[calc(100vh-20rem)] pr-4 custom-scrollbar">
            <div className="space-y-12"> {/* Aumentado espaçamento entre seções */}
              {/* Main Content */}
              {process.content && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-3"> {/* Aumentado tamanho do subtítulo */}
                    <BookText className="w-6 h-6 text-brand-500" />
                    <span>Conteúdo Principal</span>
                  </h3>
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-8 rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner"> {/* Aumentado padding, adicionado shadow-inner */}
                    {/* Using dangerouslySetInnerHTML for rich text, assuming content might contain HTML */}
                    <div dangerouslySetInnerHTML={{ __html: process.content }} />
                  </div>
                </div>
              )}

              {/* Attachments / Resources */}
              {process.attachments && process.attachments.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-3"> {/* Aumentado tamanho do subtítulo */}
                    <Paperclip className="w-6 h-6 text-brand-500" />
                    <span>Recursos de Apoio</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Aumentado espaçamento do grid */}
                    {process.attachments.map(att => renderAttachment(att))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
};