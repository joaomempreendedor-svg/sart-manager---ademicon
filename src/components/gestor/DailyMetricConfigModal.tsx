import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/context/AppContext';
import { DailyMetricConfig } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

const formSchema = z.object({
  label: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  metric_key: z.string().min(3, 'A chave deve ter pelo menos 3 caracteres.').regex(/^[a-z0-9_]+$/, 'A chave só pode conter letras minúsculas, números e underscores.'),
  type: z.enum(['number', 'currency']),
});

interface DailyMetricConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DailyMetricConfig | null;
}

export const DailyMetricConfigModal: React.FC<DailyMetricConfigModalProps> = ({ isOpen, onClose, config }) => {
  const { addDailyMetricConfig, updateDailyMetricConfig, dailyMetricsConfig } = useApp();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      metric_key: '',
      type: 'number',
    }
  });

  const watchedLabel = watch('label');

  useEffect(() => {
    if (watchedLabel && !config) {
      const newKey = watchedLabel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      setValue('metric_key', newKey);
    }
  }, [watchedLabel, config, setValue]);

  useEffect(() => {
    if (isOpen) {
        if (config) {
          reset({
            label: config.label,
            metric_key: config.metric_key,
            type: config.type,
          });
        } else {
          reset({
            label: '',
            metric_key: '',
            type: 'number',
          });
        }
    }
  }, [config, reset, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (config) {
        await updateDailyMetricConfig(config.id, values);
        toast.success('Métrica atualizada com sucesso!');
      } else {
        if (dailyMetricsConfig.some(c => c.metric_key === values.metric_key)) {
            toast.error('A chave da métrica já existe. Por favor, escolha outra.');
            return;
        }
        const order_index = dailyMetricsConfig.length;
        await addDailyMetricConfig({ ...values, order_index });
        toast.success('Métrica adicionada com sucesso!');
      }
      onClose();
    } catch (error) {
      toast.error('Ocorreu um erro ao salvar a métrica.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config ? 'Editar Métrica' : 'Adicionar Nova Métrica'}</DialogTitle>
          <DialogDescription>
            As métricas aqui definidas aparecerão para os consultores preencherem diariamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="label">Nome da Métrica</Label>
            <Input id="label" {...register('label')} placeholder="Ex: Reuniões Realizadas"/>
            {errors.label && <p className="text-red-500 text-sm mt-1">{errors.label.message}</p>}
          </div>
          <div>
            <Label htmlFor="metric_key">Chave da Métrica</Label>
            <Input id="metric_key" {...register('metric_key')} disabled={!!config} placeholder="Ex: reunioes_realizadas"/>
            <p className="text-xs text-gray-500 mt-1">Usado internamente. Não pode ser alterado após a criação.</p>
            {errors.metric_key && <p className="text-red-500 text-sm mt-1">{errors.metric_key.message}</p>}
          </div>
          <div>
            <Label htmlFor="type">Tipo de Valor</Label>
            <Select onValueChange={(value) => setValue('type', value as 'number' | 'currency')} value={watch('type')}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="currency">Moeda (R$)</SelectItem>
                </SelectContent>
            </Select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};