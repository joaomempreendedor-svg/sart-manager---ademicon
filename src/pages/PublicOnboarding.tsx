import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingSession } from '@/types';
import { Loader2, CheckCircle2, PlayCircle, TrendingUp, Lock, AlertTriangle } from 'lucide-react';
import YouTube from 'react-youtube';
import toast from 'react-hot-toast'; // Importar toast

const getYouTubeID = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const PublicOnboarding = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [endedVideos, setEndedVideos] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null); // NOVO: Estado para o vídeo ativo

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setError("ID da sessão não encontrado.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .select('*, videos:onboarding_videos(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!data) throw new Error("Sessão não encontrada.");

      const sessionData = {
        ...data,
        videos: data.videos.sort((a: any, b: any) => a.order - b.order)
      } as OnboardingSession;
      
      setSession(sessionData);
      const initialCompleted = new Set(sessionData.videos.filter(v => v.is_completed).map(v => v.id));
      setCompletedVideos(initialCompleted);
      setEndedVideos(initialCompleted); // Also consider completed videos as "ended" initially

      // NOVO: Definir o primeiro vídeo não concluído como ativo
      const firstUncompletedVideo = sessionData.videos.find(v => !initialCompleted.has(v.id));
      setActiveVideoId(firstUncompletedVideo ? firstUncompletedVideo.id : null);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao carregar a sessão.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleMarkAsCompleted = async (videoId: string) => {
    if (completedVideos.has(videoId)) return;

    try {
      const { error: edgeError } = await supabase.functions.invoke('mark-video-completed', {
        body: { videoId },
      });

      if (edgeError) throw edgeError;

      setCompletedVideos(prev => {
        const newSet = new Set(prev).add(videoId);
        // NOVO: Encontrar o próximo vídeo não concluído e ativá-lo
        const currentVideoIndex = session?.videos.findIndex(v => v.id === videoId);
        if (session && currentVideoIndex !== undefined && currentVideoIndex !== -1) {
          const nextVideo = session.videos.slice(currentVideoIndex + 1).find(v => !newSet.has(v.id));
          setActiveVideoId(nextVideo ? nextVideo.id : null);
        }
        return newSet;
      });
      toast.success("Vídeo marcado como concluído! O próximo vídeo foi liberado."); // NOVO: Notificação de sucesso
    } catch (err: any) {
      toast.error("Não foi possível marcar como concluído. Tente novamente.");
      console.error(err);
    }
  };

  const handleVideoEnd = (videoId: string) => {
    setEndedVideos(prev => new Set(prev).add(videoId));
    toast.info("Vídeo finalizado! Clique em 'Marcar como Concluído' para liberar o próximo."); // NOVO: Notificação
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        {error || "Sessão de onboarding inválida."}
      </div>
    );
  }

  const totalVideos = session.videos.length;
  const completedCount = completedVideos.size;
  const progress = totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500 text-white p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Onboarding Online</h1>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Consultor(a)</p>
            <p className="font-semibold text-lg text-brand-600">{session.consultant_name}</p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-2">Seu Progresso</h2>
          <div className="flex items-center space-x-4">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="font-bold text-green-600">{Math.round(progress)}%</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">{completedCount} de {totalVideos} vídeos concluídos.</p>
        </div>

        <div className="space-y-6">
          {session.videos.map((video, index) => {
            const youtubeId = getYouTubeID(video.video_url);
            const isCompleted = completedVideos.has(video.id);
            const hasEnded = endedVideos.has(video.id);
            const isActive = activeVideoId === video.id;
            const isLocked = !isActive && !isCompleted;

            return (
              <div key={video.id} className={`bg-white p-6 rounded-lg shadow-md relative ${isLocked ? 'opacity-70' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded-lg">
                    <Lock className="w-12 h-12 text-white" />
                    <p className="text-white text-lg font-semibold ml-4">Bloqueado</p>
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isCompleted ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'}`}>
                      {isCompleted ? <CheckCircle2 size={24} /> : index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{video.title}</h3>
                  </div>
                  <button
                    onClick={() => handleMarkAsCompleted(video.id)}
                    disabled={isCompleted || !hasEnded || !isActive} // NOVO: Desabilita se não for ativo
                    className={`px-4 py-2 rounded-md font-semibold text-sm flex items-center space-x-2 transition ${
                      (isCompleted || !hasEnded || !isActive)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                    <span>{isCompleted ? 'Concluído' : 'Marcar como Concluído'}</span>
                  </button>
                </div>
                <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden">
                  {youtubeId && isActive ? ( {/* NOVO: Só renderiza o player se for ativo */}
                    <YouTube
                      videoId={youtubeId}
                      className="w-full h-full"
                      iframeClassName="w-full h-full"
                      onEnd={() => handleVideoEnd(video.id)}
                      opts={{
                        playerVars: {
                          rel: 0, // Do not show related videos at the end
                        },
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
                      {isLocked ? (
                        <div className="flex flex-col items-center text-gray-400">
                          <Lock className="w-12 h-12 mb-2" />
                          <p>Assista o vídeo anterior para desbloquear.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <AlertTriangle className="w-12 h-12 mb-2" />
                          <p>Link do vídeo inválido ou não ativo.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};