import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

interface WithdrawalReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  candidateName: string;
}

const WITHDRAWAL_REASONS = [
  "Proposta salarial insuficiente",
  "Horário de trabalho incompatível",
  "Distância / Transporte",
  "Aceitou outra oferta",
  "Problemas pessoais",
  "Falta de identificação com a cultura",
  "Outro"
];

export const WithdrawalReasonModal: React.FC<WithdrawalReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidateName
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(WITHDRAWAL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const finalReason = selectedReason === "Outro" ? customReason : selectedReason;
    if (selectedReason === "Outro" && !customReason.trim()) {
      return;
    }
    onConfirm(finalReason);
    onClose();
    // Reset state
    setSelectedReason(WITHDRAWAL_REASONS[0]);
    setCustomReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Motivo da Desistência</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Informe por que o candidato <strong>{candidateName}</strong> desistiu do processo.
          </p>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            {WITHDRAWAL_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} className="border-gray-300 dark:border-slate-600" />
                <Label htmlFor={reason} className="cursor-pointer text-gray-700 dark:text-gray-200">{reason}</Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "Outro" && (
            <div className="mt-4">
              <Label htmlFor="custom-reason" className="mb-2 block text-gray-700 dark:text-gray-200">Especifique o motivo</Label>
              <Input
                id="custom-reason"
                placeholder="Digite o motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedReason === "Outro" && !customReason.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
