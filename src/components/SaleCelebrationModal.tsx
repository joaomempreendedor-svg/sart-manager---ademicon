import React, { useEffect, useRef } from 'react';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';

interface SaleCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
}

export const SaleCelebrationModal: React.FC<SaleCelebrationModalProps> = ({ isOpen, onClose, leadName }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ConfettiAnimation run={isOpen} onConfettiComplete={() => {}} />
      <audio ref={audioRef} src="/sounds/celebration.mp3" preload="auto" />
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6 text-center">
        <DialogHeader>
          <PartyPopper className="w-16 h-16 text-brand-500 mx-auto mb-4 animate-bounce" />
          <DialogTitle className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Parabéns!
          </DialogTitle>
          <DialogDescription className="text-lg text-green-600 dark:text-green-400 font-semibold">
            Venda Registrada com Sucesso!
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-800 dark:text-gray-200 text-xl">
            Excelente trabalho com <span className="text-brand-600 dark:text-brand-400 font-bold">{leadName}</span>!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Mais uma vitória para a equipe SART!
          </p>
        </div>

        <DialogFooter className="flex justify-center mt-4">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};