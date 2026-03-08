import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Process, ProcessFile } from '@/types';
import { Loader2, FileText, Image as ImageIcon, Download, Link as LinkIcon, AlertTriangle, TrendingUp, Video, Music } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

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
      const { data, error: fetchError } = await supabase
        .from('processes')
        .select('*, files:process_files(*)')
        .eq('id', processId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Processo não encontrado.");

      setProcess(data as Process);
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

  const renderFilePreview = (file: ProcessFile) => {
    if (file.file_type === 'image') {
      return (
        <div key={file.id} className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center space-y-3">
          <img src={file.file_url} alt={file.file_name} className="rounded-lg max-h-80 w-auto" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(file.file_url, file.file_name)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar {file.file_name}
          </Button>
        </div>
      );
    }

    if (file.file_type === 'video') {
      return (
        <div key={file.id} className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center space-y-3">
          <video src={file.file_url} controls className="rounded-lg max-h-80 w-full" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(file.file_url, file.file_name)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar {file.file_name}
          </Button>
        </div>
      );
    }

    if (file.file_type === 'audio') {
      return (
        <div key={file.id} className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center space-x-3 w-full">
            <Music className="w-8 h-8 text-purple-500" />
            <audio src={file.file_url} controls className="flex-1" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(file.file_url, file.file_name)}
            className="dark:bg-slate-600 dark:text-white dark:border-slate-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar {file.file_name}
          </Button>
        </div>
      );
    }

    if (file.file_type === 'pdf') {
      return (
        <div key={file.id} className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{file.file_name}</p>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Abrir em nova aba
              </a>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadFile(file.file_url, file.file_name)}
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
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500 text-white p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos Internos</h1>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{process.title}</h2>
          {process.description && (
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">{process.description}</p>
          )}
          
          <ScrollArea className="max-h-[70vh] pr-4 custom-scrollbar">
            <div className="space-y-8">
              {process.files && process.files.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Anexos ({process.files.length})</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {process.files.map(file => renderFilePreview(file))}
                  </div>
                </div>
              )}

              {process.content && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Conteúdo</h4>
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                    {process.content}
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