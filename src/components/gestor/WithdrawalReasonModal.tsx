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
          <DialogTitle>Motivo da Desistência</DialogTitle>
          <p className="text-sm text-gray-500">
            Informe por que o candidato <strong>{candidateName}</strong> desistiu do processo.
          </p>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            {WITHDRAWAL_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">{reason}</Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "Outro" && (
            <div className="mt-4">
              <Label htmlFor="custom-reason" className="mb-2 block">Especifique o motivo</Label>
              <Input
                id="custom-reason"
                placeholder="Digite o motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedReason === "Outro" && !customReason.trim()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
