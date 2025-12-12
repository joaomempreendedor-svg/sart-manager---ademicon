import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { OnboardingSession, OnboardingVideo } from '@/types';
import { Plus, Trash2, Loader2, Link as LinkIcon, Copy, Check, Upload, Video, XCircle } from 'lucide-react';

export const OnlineOnboarding = () => {
  const { 
    onboardingSessions, 
    addOnlineOnboardingSession, 
    deleteOnlineOnboardingSession,
    addVideoToOnboardingSession,
    deleteVideoFromOnboardingSession
  } = useApp();

  const [newConsultantName, setNewConsultantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null);
  const [copiedLink, setCopiedLink] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    if (selectedSession) {
      const updatedSession = onboardingSessions.find(s => s.id === selectedSession.id);
      setSelectedSession(updatedSession || null);
    }
  }, [onboardingSessions, selectedSession]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultantName.trim()) return;
    setIsCreating(true);
    try {
      const newSession = await addOnlineOnboardingSession(newConsultantName.trim());
      if (newSession) {
        setSelectedSession(newSession);
      }
      setNewConsultantName('');
    } catch (error) {
      alert('Falha ao criar sessão.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta sessão de onboarding? Todos os vídeos serão perdidos.")) {
      await deleteOnlineOnboardingSession(sessionId);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    }
  };

  const handleCopyLink = (sessionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/onboarding/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(sessionId);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !uploadUrl.trim() || !uploadTitle.trim()) return;
    setIsUploading(true);
    try {
      await addVideoToOnboardingSession(selectedSession.id, uploadTitle.trim(), uploadUrl.trim());
      setUploadTitle('');
      setUploadUrl('');
    } catch (error) {
      alert('Falha ao adicionar vídeo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (video: OnboardingVideo) => {
    if (window.confirm(`Tem certeza que deseja excluir o vídeo "${video.title}"?`)) {
      await deleteVideoFromOnboardingSession(video.id, video.video_url);
    }
  };

  const getProgress = (session: OnboardingSession) => {
    const total = session.videos.length;
    if (total === 0) return 0;
    const completed = session.videos.filter(v => v.is_completed).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Onboarding Online</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Crie e gerencie os treinamentos em vídeo para novos consultores.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto flex-shrink-0 custom-scrollbar">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
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
                <span>Criar Sessão</span>
              </button>
            </form>
          </div>
          <div className="p-2">
            {onboardingSessions.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedSession?.id === session.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <div>
                  <p className={`font-medium ${selectedSession?.id === session.id ? 'text-brand-800 dark:text-brand-200' : 'text-gray-800 dark:text-gray-200'}`}>{session.consultant_name}</p>
                  <p className="text-xs text-gray-400">{new Date(session.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-xs font-bold text-brand-600">{getProgress(session)}%</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {selectedSession ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.consultant_name}</h2>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      readOnly
                      value={`${window.location.origin}${window.location.pathname}#/onboarding/${selectedSession.id}`}
                      className="w-full pl-9 p-2 border rounded bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-sm text-gray-500"
                    />
                  </div>
                  <button onClick={() => handleCopyLink(selectedSession.id)} className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300">
                    {copiedLink === selectedSession.id ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDeleteSession(selectedSession.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md hover:bg-red-100">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-semibold mb-4">Adicionar Vídeo</h3>
                <form onSubmit={handleAddVideo} className="space-y-3">
                  <input type="text" placeholder="Título do vídeo" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                  <input type="url" placeholder="Link do YouTube (Ex: https://...)" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                  <button type="submit" disabled={isUploading} className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isUploading ? 'Adicionando...' : 'Adicionar Vídeo'}</span>
                  </button>
                </form>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Vídeos do Onboarding ({selectedSession.videos.length})</h3>
                <div className="space-y-3">
                  {selectedSession.videos.map(video => (
                    <div key={video.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Video className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">{video.title}</span>
                        {video.is_completed && <Check className="w-5 h-5 text-green-500" />}
                      </div>
                      <button onClick={() => handleDeleteVideo(video)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-gray-400">
              <div>
                <p>Selecione uma sessão ao lado</p>
                <p className="text-sm">ou crie uma nova para começar.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};