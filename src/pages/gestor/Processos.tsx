import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckSquare, GitBranch, Loader2, Trash2, Edit2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { Process } from '@/types';

export const Processos = () => {
  const { processes, addProcess, updateProcess, deleteProcess, isDataLoading } = useApp();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'checklist' | 'mindmap'>('checklist');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProcesses = useMemo(() => {
    return processes
      .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.created_at).getTime());
  }, [processes, searchTerm]);

  const handleOpenModal = (process: Process | null) => {
    setEditingProcess(process);
    if (process) {
      setTitle(process.title);
      setDescription(process.description || '');
      setType(process.type);
    } else {
      setTitle('');
      setDescription('');
      setType('checklist');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      const processData = { title, description, type, content: editingProcess?.content || (type === 'checklist' ? [] : {}) };
      if (editingProcess) {
        await updateProcess(editingProcess.id, processData);
        toast.success("Processo atualizado com sucesso!");
      } else {
        await addProcess(processData);
        toast.success("Processo criado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o processo "${process.title}"?`)) {
      try {
        await deleteProcess(process.id);
        toast.success("Processo excluído com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir: ${error.message}`);
      }
    }
  };

  const getIconForType = (type: 'checklist' | 'mindmap') => {
    switch (type) {
      case 'checklist': return <CheckSquare className="w-8 h-8 text-blue-500" />;
      case 'mindmap': return <GitBranch className="w-8 h-8 text-purple-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos Internos</h1>
          <p className="text-gray-500 dark:text-gray-400">Crie e gerencie checklists, mapas mentais e outros processos da equipe.</p>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar processo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button onClick={() => handleOpenModal(null)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Processo</span>
          </Button>
        </div>
      </div>

      {isDataLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
        </div>
      ) : filteredProcesses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
          <FileText className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum processo encontrado.</p>
          <p className="text-sm text-gray-400">Clique em "Novo Processo" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProcesses.map(process => (
            <div
              key={process.id}
              onClick={() => navigate(`/gestor/processos/${process.id}`)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all cursor-pointer flex flex-col group"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                  {getIconForType(process.type)}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(process); }} className="h-8 w-8 text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, process)} className="h-8 w-8 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-4">{process.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{process.description}</p>
              </div>
              <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400 flex justify-between">
                <span>{process.type === 'checklist' ? 'Checklist' : 'Mapa Mental'}</span>
                <span>Atualizado em: {new Date(process.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white">
          <DialogHeader>
            <DialogTitle>{editingProcess ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes abaixo para criar ou editar seu processo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Processo *</Label>
              <Select value={type} onValueChange={(value: 'checklist' | 'mindmap') => setType(value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="mindmap">Mapa Mental</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};