import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { DailyMetricConfig } from '@/types';
import { DailyMetricConfigModal } from '@/components/gestor/DailyMetricConfigModal';
import toast from 'react-hot-toast';

const MetricsConfig = () => {
  const { dailyMetricsConfig, updateDailyMetricConfigOrder, deleteDailyMetricConfig } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DailyMetricConfig | null>(null);

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(dailyMetricsConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateDailyMetricConfigOrder(items);
    toast.success("Ordem das métricas atualizada.");
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
    if (window.confirm('Tem certeza que deseja excluir esta métrica? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDailyMetricConfig(id);
        toast.success("Métrica excluída com sucesso.");
      } catch (error) {
        toast.error("Erro ao excluir a métrica.");
        console.error(error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configuração de Métricas Diárias</CardTitle>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Métrica
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Defina as métricas que os consultores devem preencher diariamente. Arraste para reordenar.
          </p>
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
                          className="flex items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                          <GripVertical className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="flex-grow">
                            <p className="font-medium text-gray-800 dark:text-gray-200">{config.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Chave: {config.metric_key} | Tipo: {config.type === 'currency' ? 'Moeda (R$)' : 'Número'}
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