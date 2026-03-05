import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Process } from '@/types';
import { Loader2, FileText, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export const Processos = () => {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProcesses = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar processos.');
        console.error(error);
      } else {
        setProcesses(data as Process[]);
      }
      setIsLoading(false);
    };
    fetchProcesses();
  }, [user]);

  const handleAddProcess = async () => {
    if (!user) return;
    const title = prompt('Digite o título do novo processo:');
    if (title && title.trim()) {
      const { data, error } = await supabase
        .from('processes')
        .insert({ title: title.trim(), user_id: user.id, type: 'Documento' })
        .select()
        .single();
      
      if (error) {
        toast.error('Erro ao criar processo.');
      } else if (data) {
        setProcesses(prev => [data as Process, ...prev]);
        toast.success('Processo criado com sucesso!');
      }
    }
  };

  const filteredProcesses = processes.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos da Equipe</h1>
          <p className="text-gray-500 dark:text-gray-400">Crie e gerencie documentos e processos internos.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar processo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
            />
          </div>
          <button
            onClick={handleAddProcess}
            className="flex items-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Processo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcesses.map(process => (
          <Link
            key={process.id}
            to={`/gestor/processos/${process.id}`}
            className="block bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all group"
          >
            <FileText className="w-8 h-8 text-brand-500 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600">{process.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{process.description || 'Nenhuma descrição'}</p>
            <p className="text-xs text-gray-400 mt-3">Criado em: {new Date(process.created_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
      {filteredProcesses.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
          <FileText className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum processo encontrado.</p>
          <p className="text-sm text-gray-400">Clique em "Novo Processo" para começar.</p>
        </div>
      )}
    </div>
  );
};