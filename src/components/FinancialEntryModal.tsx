import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, MessageSquare, Tag } from 'lucide-react';
import { FinancialEntry } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FinancialEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: FinancialEntry | null; // Null for new entry, object for editing
  onSave: (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'> | FinancialEntry) => Promise<void>;
  defaultDate?: string; // NOVO: Prop para a data padrão
}

// Helper to convert a number (e.g., 12000.00) to a raw cents string (e.g., "1200000")
const numberToCentsString = (num: number): string => {
  return String(Math.round(num * 100));
};

// Helper to format a raw cents string (e.g., "1200000") into a Brazilian currency display string (e.g., "12.000,00")
const formatInputCurrencyDisplay = (digits: string): string => {
  // 1. Remove all non-digit characters
  digits = digits.replace(/\D/g, '');

  // 2. If empty, return empty string
  if (!digits) return '';

  // 3. Pad with leading zeros if less than 3 digits (to ensure cents part)
  // e.g., "1" -> "001", "12" -> "012", "123" -> "123"
  digits = digits.padStart(3, '0');

  // 4. Separate cents from reals
  const cents = digits.slice(-2);
  let reals = digits.slice(0, -2);

  // 5. Remove leading zeros from reals part, unless it's just "0"
  reals = reals.replace(/^0+/, '') || '0';

  // 6. Add thousands separators (dots) to the reals part
  reals = reals.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

  // 7. Combine reals and cents with a comma
  return `${reals},${cents}`;
};

// Helper to parse a Brazilian currency display string (e.g., "12.000,00") into a float (e.g., 12000.00)
const parseCurrencyInput = (value: string): number => {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({ isOpen, onClose, entry, onSave, defaultDate }) => {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setEntryDate(entry.entry_date);
        setType(entry.type);
        setDescription(entry.description || '');
        // Formata o valor numérico do entry para a string de exibição
        setAmount(formatInputCurrencyDisplay(numberToCentsString(entry.amount)));
      } else {
        // Se for um novo lançamento, usa defaultDate se fornecido, senão a data atual
        setEntryDate(defaultDate || new Date().toISOString().split('T')[0]);
        setType('expense');
        setDescription('');
        setAmount('0,00'); // Valor padrão para nova entrada
      }
      setError('');
    }
  }, [isOpen, entry, defaultDate]); // Adicionado defaultDate como dependência

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseCurrencyInput(amount);

    if (!entryDate || !type || !parsedAmount || parsedAmount <= 0) {
      setError("Data, tipo e valor (maior que zero) são obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      const entryToSave: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'> | FinancialEntry = entry
        ? { ...entry, entry_date: entryDate, type, description, amount: parsedAmount }
        : { entry_date: entryDate, type, description, amount: parsedAmount };
      
      await onSave(entryToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar entrada financeira:", err);
      setError(err.message || 'Falha ao salvar a entrada financeira.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar Lançamento Financeiro' : 'Novo Lançamento Financeiro'}</DialogTitle>
          <DialogDescription>
            {entry ? 'Edite os detalhes deste lançamento.' : 'Adicione uma nova entrada ou saída financeira.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="entryDate">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="entryDate"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select value={type} onValueChange={(value: 'income' | 'expense') => setType(value)} required>
                  <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(formatInputCurrencyDisplay(e.target.value))}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: Pagamento de aluguel, Venda de consórcio"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isSaving ? 'Salvando...' : 'Salvar Lançamento'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};