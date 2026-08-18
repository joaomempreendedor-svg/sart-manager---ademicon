import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/context/AppContext';
import { DailyMetricConfig } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBRLFromCents, parseBRLInputToCents } from '@/utils/currencyUtils';
import toast from 'react-hot-toast';

const formSchema = z.object({
  label: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  metric_key: z.string().min(3, 'A chave deve ter pelo menos 3 caracteres.').regex(/^[a-z0-9_]+$/, 'A chave só pode conter letras minúsculas, números e underscores.'),
  type: z.enum(['number', 'currency']),
  target_value: z.coerce.number().min(0, 'A meta não pode ser negativa.'),
  weekly_target_value: z.coerce.number().min(0, 'A meta semanal não pode ser negativa.'),
});

interface DailyMetricConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DailyMetricConfig | null;
}

export const DailyMetricConfigModal: React.FC<DailyMetricConfigModalProps> = ({ isOpen, onClose, config }) => {
  const { addDailyMetricConfig, updateDailyMetricConfig, dailyMetricsConfig } = useApp();

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      metric_key: '',
      type: 'number',
      target_value: 0,
      weekly_target_value: 0,
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
            target_value: config.type === 'currency' ? config.target_value / 100 : config.target_value,
            weekly_target_value: config.type === 'currency' ? config.weekly_target_value / 100 : config.weekly_target_value,
          });
        } else {
          reset({
            label: '',
            metric_key: '',
            type: 'number',
            target_value: 0,
            weekly_target_value: 0,
          });
        }
    }
  }, [config, reset, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        ...values,
        target_value: values.type === 'currency' ? Math.round(values.target_value * 100) : Math.round(values.target_value),
        weekly_target_value: values.type === 'currency' ? Math.round(values.weekly_target_value * 100) : Math.round(values.weekly_target_value),
      };

      if (config) {
        await updateDailyMetricConfig(config.id, payload);
        toast.success('Métrica atualizada com sucesso!');
      } else {
        if (dailyMetricsConfig.some(c => c.metric_key === values.metric_key)) {
            toast.error('A chave da métrica já existe. Por favor, escolha outra.');
            return;
        }
        const order_index = dailyMetricsConfig.length;
        await addDailyMetricConfig({ ...payload, order_index, is_active: true });
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
          <div>
            <Label htmlFor="target_value">
              Meta diária da equipe {watch('type') === 'currency' ? '(R$)' : ''}
            </Label>
            {watch('type') === 'currency' ? (
              <Controller
                name="target_value"
                control={control}
                render={({ field }) => (
                  <Input
                    id="target_value"
                    type="text"
                    inputMode="numeric"
                    value={formatBRLFromCents(Math.round(Number(field.value || 0) * 100))}
                    onChange={event => field.onChange(parseBRLInputToCents(event.target.value) / 100)}
                    placeholder="R$ 0,00"
                  />
                )}
              />
            ) : (
              <Input id="target_value" type="number" min="0" step="1" {...register('target_value')} placeholder="Ex: 20" />
            )}
            <p className="text-xs text-gray-500 mt-1">É o objetivo total da equipe; cada consultor informa sua contribuição.</p>
            {errors.target_value && <p className="text-red-500 text-sm mt-1">{errors.target_value.message}</p>}
          </div>
          <div>
            <Label htmlFor="weekly_target_value">
              Meta semanal da equipe {watch('type') === 'currency' ? '(R$)' : ''}
            </Label>
            {watch('type') === 'currency' ? (
              <Controller
                name="weekly_target_value"
                control={control}
                render={({ field }) => (
                  <Input
                    id="weekly_target_value"
                    type="text"
                    inputMode="numeric"
                    value={formatBRLFromCents(Math.round(Number(field.value || 0) * 100))}
                    onChange={event => field.onChange(parseBRLInputToCents(event.target.value) / 100)}
                    placeholder="R$ 0,00"
                  />
                )}
              />
            ) : (
              <Input id="weekly_target_value" type="number" min="0" step="1" {...register('weekly_target_value')} placeholder="Ex: 100" />
            )}
            <p className="text-xs text-gray-500 mt-1">É o objetivo total da equipe para a semana.</p>
            {errors.weekly_target_value && <p className="text-red-500 text-sm mt-1">{errors.weekly_target_value.message}</p>}
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