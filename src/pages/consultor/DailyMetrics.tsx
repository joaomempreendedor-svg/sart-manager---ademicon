import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { formatBRLFromCents, formatBRLInput, parseBRLInputToCents } from '@/utils/currencyUtils';
import toast from 'react-hot-toast';
import { MetricLog } from '@/types';

const DailyMetricsPage = () => {
  const { dailyMetricsConfig, metricLogs, addMetricLog, updateMetricLog } = useApp();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const dailyLogs = useMemo(() => {
    if (!user) return [];
    return metricLogs.filter(log => log.consultant_id === user.id && log.date === formattedDate);
  }, [metricLogs, user, formattedDate]);

  useEffect(() => {
    const newValues: Record<string, string> = {};
    dailyMetricsConfig.forEach(config => {
      const log = dailyLogs.find(l => l.metric_key === config.metric_key);
      if (log) {
        newValues[config.metric_key] = config.type === 'currency' ? formatBRLFromCents(log.value) : String(log.value);
      } else {
        newValues[config.metric_key] = '';
      }
    });
    setMetricValues(newValues);
  }, [dailyLogs, dailyMetricsConfig, selectedDate]);

  const debouncedSave = useDebouncedCallback(async (metricKey: string, value: string) => {
    if (!user) return;

    const config = dailyMetricsConfig.find(c => c.metric_key === metricKey);
    if (!config) return;

    let numericValue: number;
    if (config.type === 'currency') {
      numericValue = parseBRLInputToCents(value);
    } else {
      numericValue = parseInt(value, 10);
    }

    if (isNaN(numericValue)) {
      return;
    }

    const existingLog = dailyLogs.find(l => l.metric_key === metricKey);

    try {
      if (existingLog) {
        if (existingLog.value !== numericValue) {
          await updateMetricLog(existingLog.id, { value: numericValue });
          toast.success(`Métrica "${config.label}" atualizada!`);
        }
      } else {
        await addMetricLog({
          consultant_id: user.id,
          metric_key: metricKey,
          date: formattedDate,
          value: numericValue,
        });
        toast.success(`Métrica "${config.label}" salva!`);
      }
    } catch (error) {
      toast.error(`Erro ao salvar métrica "${config.label}".`);
      console.error(error);
    }
  }, 1000);

  const handleValueChange = (metricKey: string, value: string) => {
    const config = dailyMetricsConfig.find(item => item.metric_key === metricKey);
    const formattedValue = config?.type === 'currency' ? formatBRLInput(value) : value;
    setMetricValues(prev => ({ ...prev, [metricKey]: formattedValue }));
    debouncedSave(metricKey, formattedValue);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lançamento de Métricas Diárias</CardTitle>
              <CardDescription>Registre suas atividades do dia.</CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[280px] justify-start text-left font-normal mt-4 sm:mt-0"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  autoFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {dailyMetricsConfig.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dailyMetricsConfig.map(config => (
                <div key={config.id} className="space-y-2">
                  <Label htmlFor={config.metric_key}>{config.label}</Label>
                  <Input
                    id={config.metric_key}
                    type={config.type === 'currency' ? 'text' : 'number'}
                    min={config.type === 'currency' ? undefined : '0'}
                    inputMode="numeric"
                    value={metricValues[config.metric_key] || ''}
                    onChange={(e) => handleValueChange(config.metric_key, e.target.value)}
                    placeholder={config.type === 'currency' ? 'R$ 0,00' : '0'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Nenhuma métrica diária foi configurada pelo seu gestor.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyMetricsPage;