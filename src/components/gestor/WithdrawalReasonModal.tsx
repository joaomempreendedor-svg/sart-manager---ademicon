import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

export const WITHDRAWAL_REASON_OPTIONS = [
  'Não teve interesse na vaga',
  'Não teve interesse no modelo comercial',
  'Aceitou outra oportunidade',
  'Remuneração não atendeu',
  'Horário / rotina incompatível',
  'Distância / deslocamento',
  'Motivos pessoais',
  'Outro',
] as const;

export interface WithdrawalReasonSelection {
  reasonOption: string;
  reasonText: string;
}

interface WithdrawalReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: WithdrawalReasonSelection) => void;
  candidateName: string;
  stageName?: string;
}

export const WithdrawalReasonModal: React.FC<WithdrawalReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  stageName,
}) => {
  const defaultReason = useMemo(() => WITHDRAWAL_REASON_OPTIONS[0], []);
  const [selectedReason, setSelectedReason] = useState<string>(defaultReason);
  const [customReason, setCustomReason] = useState('');

  const resetState = () => {
    setSelectedReason(defaultReason);
    setCustomReason('');
  };

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Outro' ? customReason.trim() : selectedReason;
    if (!finalReason) return;

    onConfirm({
      reasonOption: selectedReason,
      reasonText: finalReason,
    });
    onClose();
    resetState();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetState();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Registrar desistência</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Informe por que o candidato <strong>{candidateName}</strong> desistiu{stageName ? <> na etapa <strong>{stageName}</strong></> : ' do processo'}.
          </p>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            {WITHDRAWAL_REASON_OPTIONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} className="border-gray-300 dark:border-slate-600" />
                <Label htmlFor={reason} className="cursor-pointer text-gray-700 dark:text-gray-200">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'Outro' && (
            <div className="mt-4">
              <Label htmlFor="custom-reason" className="mb-2 block text-gray-700 dark:text-gray-200">
                Especifique o motivo
              </Label>
              <Input
                id="custom-reason"
                placeholder="Digite o motivo..."
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                className="w-full border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedReason === 'Outro' && !customReason.trim()}
            className="bg-brand-600 text-white hover:bg-brand-700"
          >
            Confirmar desistência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
