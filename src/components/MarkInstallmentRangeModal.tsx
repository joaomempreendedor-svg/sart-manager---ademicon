import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, CalendarCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { Commission } from '@/types';

interface MarkInstallmentRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  commission: Commission;
  onSaveRange: (commissionId: string, start: number, end: number) => Promise<void>;
}

export const MarkInstallmentRangeModal: React.FC<MarkInstallmentRangeModalProps> = ({
  isOpen,
  onClose,
  commission,
  onSaveRange,
}) => {
  const [startInstallment, setStartInstallment] = useState<string>('1');
  const [endInstallment, setEndInstallment] = useState<string>('15');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartInstallment('1');
      setEndInstallment('15');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const start = parseInt(startInstallment, 10);
    const end = parseInt(endInstallment, 10);

    if (isNaN(start) || isNaN(end) || start < 1 || end > 15 || start > end) {
      setError('Por favor, insira um intervalo de parcelas válido (1 a 15).');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveRange(commission.id, start, end);
      onClose();
    } catch (err: any) {
      console.error('Erro ao marcar faixa de parcelas:', err);
      setError(err.message || 'Falha ao marcar faixa de parcelas.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarCheck className="w-6 h-6 text-blue-500" />
            <span>Marcar Faixa de Parcelas como Pagas</span>
          </DialogTitle>
          <DialogDescription>
            Selecione o intervalo de parcelas da comissão de "{commission.clientName}" que deseja marcar como pagas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startInstallment">De (Parcela)</Label>
                <Input
                  id="startInstallment"
                  type="number"
                  min="1"
                  max="15"
                  value={startInstallment}
                  onChange={(e) => setStartInstallment(e.target.value)}
                  required
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="endInstallment">Até (Parcela)</Label>
                <Input
                  id="endInstallment"
                  type="number"
                  min="1"
                  max="15"
                  value={endInstallment}
                  onChange={(e) => setEndInstallment(e.target.value)}
                  required
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isSaving ? 'Salvando...' : 'Marcar como Pagas'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};