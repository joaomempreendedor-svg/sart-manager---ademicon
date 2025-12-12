import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { OnboardingSession, OnboardingVideoTemplate } from '@/types';
import { Plus, Trash2, Loader2, Link as LinkIcon, Copy, Check, Video, XCircle, ListVideo } from 'lucide-react';

export const OnlineOnboarding = () => {
  const { 
    onboardingSessions, 
    onboardingTemplateVideos,
    addOnlineOnboardingSession, 
    deleteOnlineOnboardingSession,
    addVideoToTemplate,
    deleteVideoFromTemplate
  } = useApp();

  const [newConsultantName, setNewConsultantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedLink, setCopiedLink] = useState('');

  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultantName.trim()) return;
    if (onboardingTemplateVideos.length === 0) {
      alert("Adicione pelo menos um vídeo ao template padrão antes de criar uma sessão.");
      return;
    }
    setIsCreating(true);
    try {
      await addOnlineOnboardingSession(newConsultantName.trim());
      setNewConsultantName('');
    } catch (error) {
      alert('Falha ao criar sessão.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta sessão de onboarding?")) {
      await deleteOnlineOnboardingSession(sessionId);
    }
  };

  const handleCopyLink = (sessionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/onboarding/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(sessionId);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const handleAddVideoToTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) return;
    setIsAddingVideo(true);
    try {
      await addVideoToTemplate(newVideoTitle.trim(), newVideoUrl.trim());
      setNewVideoTitle('');
      setNewVideoUrl('');
    } catch (error) {
      alert('Falha ao adicionar vídeo ao template.');
    } finally {
      setIsAddingVideo(false);
    }
  };

  const getProgress = (session: OnboardingSession) => {
    const total = session.videos.length;
    if (total === 0) return 0;
    const completed = session.videos.filter(v => v.is_completed).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onboarding Online</h1>
        <p className="text-gray-500 dark:text-gray-400">Crie e gerencie os treinamentos em vídeo para novos consultores.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gerenciar Template */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><ListVideo className="w-5 h-5 mr-2 text-brand-500" />Template Padrão de Vídeos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Esta é a lista de vídeos que será copiada para cada novo consultor.</p>
          </div>
          
          <div className="space-y-3">
            {onboardingTemplateVideos.map(video => (
              <div key={video.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-sm">{video.title}</span>
                </div>
                <button onClick={() => deleteVideoFromTemplate(video.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
            {onboardingTemplateVideos.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum vídeo no template.</p>
            )}
          </div>

          <form onSubmit={handleAddVideoToTemplate} className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-sm">Adicionar Vídeo ao Template</h3>
            <input type="text" placeholder="Título do vídeo" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            <input type="url" placeholder="Link do YouTube (Ex: https://...)" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            <button type="submit" disabled={isAddingVideo} className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50">
              {isAddingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isAddingVideo ? 'Adicionando...' : 'Adicionar Vídeo'}</span>
            </button>
          </form>
        </div>

        {/* Sessões dos Consultores */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sessões dos Consultores</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Crie uma sessão para um novo consultor para que ele possa iniciar o treinamento.</p>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-2">
            <input
              type="text"
              value={newConsultantName}
              onChange={e => setNewConsultantName(e.target.value)}
              placeholder="Nome do novo consultor"
              className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600"
            />
            <button type="submit" disabled={isCreating} className="w-full flex items-center justify-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Criar e Enviar Sessão</span>
            </button>
          </form>

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            {onboardingSessions.map(session => (
              <div key={session.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{session.consultant_name}</p>
                    <p className="text-xs text-gray-400">Criado em: {new Date(session.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-brand-600">{getProgress(session)}%</span>
                    <button onClick={() => handleCopyLink(session.id)} className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300" title="Copiar link">
                      {copiedLink === session.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteSession(session.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md hover:bg-red-100" title="Excluir sessão">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};