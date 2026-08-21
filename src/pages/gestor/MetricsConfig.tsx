import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Edit, ExternalLink, GripVertical, PlusCircle, Trash2, UserPlus, Users } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';

import { DailyMetricConfigModal } from '@/components/gestor/DailyMetricConfigModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetricConfig } from '@/types';

interface PublicMetricConsultant {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  order_index: number;
}

const formatTarget = (config: DailyMetricConfig) => {
  if (config.type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(config.target_value / 100);
  }
  return String(config.target_value);
};

const MetricsConfig = () => {
  const { user } = useAuth();
  const { dailyMetricsConfig, updateDailyMetricConfigOrder, deleteDailyMetricConfig } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DailyMetricConfig | null>(null);
  const [consultants, setConsultants] = useState<PublicMetricConsultant[]>([]);
  const [consultantName, setConsultantName] = useState('');
  const [isAddingConsultant, setIsAddingConsultant] = useState(false);

  const publicUrl = useMemo(() => {
    if (!user) return '';
    return `${window.location.origin}${window.location.pathname}#/metricas/${user.id}`;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadConsultants = async () => {
      const { data, error } = await supabase
        .from('public_metric_consultants')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index');

      if (error) {
        toast.error('Não foi possível carregar os consultores do link público.');
        return;
      }
      setConsultants(data || []);
    };

    loadConsultants();
  }, [user]);

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(dailyMetricsConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateDailyMetricConfigOrder(items);
    toast.success('Ordem das métricas atualizada.');
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleEdit = (config: DailyMetricConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta métrica? Os lançamentos relacionados também serão excluídos.')) return;

    try {
      await deleteDailyMetricConfig(id);
      toast.success('Métrica excluída com sucesso.');
    } catch (error) {
      toast.error('Erro ao excluir a métrica.');
      console.error(error);
    }
  };

  const handleAddConsultant = async () => {
    const name = consultantName.trim();
    if (!user || !name) return;

    setIsAddingConsultant(true);
    const { data, error } = await supabase
      .from('public_metric_consultants')
      .insert({ user_id: user.id, name, order_index: consultants.length })
      .select()
      .single();
    setIsAddingConsultant(false);

    if (error) {
      toast.error(error.code === '23505' ? 'Esse consultor já está na lista.' : 'Erro ao adicionar consultor.');
      return;
    }

    setConsultants(prev => [...prev, data]);
    setConsultantName('');
    toast.success('Consultor adicionado ao link público.');
  };

  const handleRemoveConsultant = async (consultant: PublicMetricConsultant) => {
    if (!window.confirm(`Remover ${consultant.name}? Os lançamentos desse consultor também serão excluídos.`)) return;

    const { error } = await supabase.from('public_metric_consultants').delete().eq('id', consultant.id);
    if (error) {
      toast.error('Erro ao remover consultor.');
      return;
    }

    setConsultants(prev => prev.filter(item => item.id !== consultant.id));
    toast.success('Consultor removido.');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Link público copiado!');
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900 dark:from-brand-950/30 dark:to-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ExternalLink className="h-5 w-5 text-brand-600" />
            Link público de métricas
          </CardTitle>
          <CardDescription>
            Compartilhe este endereço. Não é necessário login: o consultor escolhe o próprio nome, informa os resultados e acompanha o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={publicUrl} readOnly className="bg-white dark:bg-slate-900" />
          <Button onClick={handleCopyLink} disabled={!publicUrl} className="shrink-0">
            <Copy className="mr-2 h-4 w-4" /> Copiar link
          </Button>
          <Button variant="outline" asChild className="shrink-0">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" /> Consultores disponíveis
          </CardTitle>
          <CardDescription>Cadastre manualmente os nomes que aparecerão no link público.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={consultantName}
              onChange={event => setConsultantName(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleAddConsultant()}
              placeholder="Nome do consultor, ex: Kaio"
            />
            <Button onClick={handleAddConsultant} disabled={!consultantName.trim() || isAddingConsultant} className="shrink-0">
              <UserPlus className="mr-2 h-4 w-4" />
              {isAddingConsultant ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>

          {consultants.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              Nenhum consultor cadastrado para o link público.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {consultants.map(consultant => (
                <div key={consultant.id} className="flex flex-col rounded-lg border bg-gray-50 px-4 py-3 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{consultant.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveConsultant(consultant)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Métricas e metas da equipe</CardTitle>
            <CardDescription>Defina os campos que cada consultor preencherá e os objetivos totais da equipe.</CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar métrica
          </Button>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="metrics">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {dailyMetricsConfig.map((config, index) => (
                    <Draggable key={config.id} draggableId={config.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <GripVertical className="mr-3 h-5 w-5 text-gray-400" />
                          <div className="flex-grow">
                            <p className="font-medium text-gray-800 dark:text-gray-200">{config.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {config.type === 'currency' ? 'Moeda' : 'Número'} · Meta diária: {formatTarget(config)} · Meta semanal: {formatTarget({ ...config, target_value: config.weekly_target_value })}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(config.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      <DailyMetricConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={editingConfig}
      />
    </div>
  );
};

export default MetricsConfig;
