import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DailyMetricConfig } from '@/types';
import { formatBRLFromCents, formatBRLInput, parseBRLInputToCents } from '@/utils/currencyUtils';

interface MetricEntry {
  id: string;
  consultant_id: string;
  metric_config_id: string;
  entry_date: string;
  value: number;
}

interface EditMetricEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultantId: string;
  consultantName: string;
  entryDate: string;
  metrics: DailyMetricConfig[];
  entries: MetricEntry[];
  onSave: (updatedEntries: { metric_config_id: string; value: number }[]) => Promise<void>;
}

export const EditMetricEntryModal: React.FC<EditMetricEntryModalProps> = ({
  isOpen,
  onClose,
  consultantId,
  consultantName,
  entryDate,
  metrics,
  entries,
  onSave,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      metrics.forEach(metric => {
        const entry = entries.find(
          item => item.consultant_id === consultantId && item.metric_config_id === metric.id && item.entry_date === entryDate
        );
        if (entry) {
          initialValues[metric.id] = metric.type === 'currency' ? formatBRLFromCents(entry.value) : String(entry.value);
        } else {
          initialValues[metric.id] = '';
        }
      });
      setValues(initialValues);
    }
  }, [isOpen, consultantId, entryDate, metrics, entries]);

  const handleValueChange = (metricId: string, type: DailyMetricConfig['type'], newValue: string) => {
    setValues(prev => ({
      ...prev,
      [metricId]: type === 'currency' ? formatBRLInput(newValue) : newValue,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedEntries = metrics.map(metric => ({
        metric_config_id: metric.id,
        value: metric.type === 'currency' ? parseBRLInputToCents(values[metric.id] || '0') : Math.round(Number(values[metric.id]) || 0),
      }));
      await onSave(updatedEntries);
      toast.success(`Resultados de ${consultantName} atualizados!`);
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar os resultados.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatValue = (value: number, type: DailyMetricConfig['type']) => {
    if (type === 'currency') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formattedDate = new Date(`${entryDate}T12:00:00`).toLocaleDateString('pt-BR');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Resultados</DialogTitle>
          <DialogDescription>
            {consultantName} - {formattedDate}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {metrics.map(metric => {
            const entry = entries.find(
              item => item.consultant_id === consultantId && item.metric_config_id === metric.id && item.entry_date === entryDate
            );
            const currentValue = entry ? formatValue(entry.value, metric.type) : '—';

            return (
              <div key={metric.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`edit-${metric.id}`}>{metric.label}</Label>
                  <span className="text-xs text-slate-500">Atual: {currentValue}</span>
                </div>
                <Input
                  id={`edit-${metric.id}`}
                  type={metric.type === 'currency' ? 'text' : 'number'}
                  min={metric.type === 'currency' ? undefined : '0'}
                  step={metric.type === 'currency' ? undefined : '1'}
                  inputMode={metric.type === 'currency' ? 'numeric' : 'numeric'}
                  value={values[metric.id] || ''}
                  onChange={event => handleValueChange(metric.id, metric.type, event.target.value)}
                  placeholder={metric.type === 'currency' ? 'R$ 0,00' : '0'}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
