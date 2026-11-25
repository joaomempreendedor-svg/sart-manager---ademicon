import React, { useEffect, useState } from 'react';
import { Copy, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const ALLOWED_ROLES = ['GESTOR', 'ADMIN', 'SECRETARIA'];

const formatNames = (names: string[]) => {
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
};

const getTodaySuffix = () => {
  const today = new Date();
  return `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/** Lembrete diário de aniversários dos clientes da carteira, exibido para gestor e secretaria. */
export const BirthdayReminderModal: React.FC = () => {
  const { user } = useAuth();
  const { walletClients, isDataLoading } = useApp();
  const [birthdayNames, setBirthdayNames] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || isDataLoading || !ALLOWED_ROLES.includes(user.role)) return;

    const suffix = getTodaySuffix();
    const names = walletClients
      .filter(client => client.birthDate?.trim() && client.birthDate.trim().slice(-5) === suffix)
      .map(client => client.clientName.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    const today = new Date();
    const storageKey = `sart-birthday-reminder-${user.id}-${today.getFullYear()}-${suffix}`;
    if (localStorage.getItem(storageKey) === 'shown') return;

    localStorage.setItem(storageKey, 'shown');
    setBirthdayNames(names);
    setIsOpen(true);
  }, [user?.id, user?.role, isDataLoading, walletClients]);

  if (!isOpen) return null;

  const nameList = formatNames(birthdayNames);
  const message = `Feliz aniversário, ${nameList}! Desejo um dia maravilhoso, muita saúde e sucesso. — Equipe SART`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Mensagem de parabéns copiada!');
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <ConfettiAnimation run={isOpen} />
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white p-6 text-center">
        <DialogHeader>
          <PartyPopper className="mx-auto mb-4 h-16 w-16 animate-bounce text-brand-500" />
          <DialogTitle className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Aniversário hoje!
          </DialogTitle>
          <DialogDescription className="text-base font-semibold text-green-600 dark:text-green-400">
            Mande parabéns para {nameList}!
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-brand-50 p-4 text-left dark:bg-brand-900/20">
          <p className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-300">Mensagem sugerida</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</p>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
