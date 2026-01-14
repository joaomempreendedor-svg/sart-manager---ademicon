import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GoogleCalendarConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  urls: string[];
  onSave: (urls: string[]) => void;
}

const GoogleCalendarConnectModal: React.FC<GoogleCalendarConnectModalProps> = ({
  isOpen,
  onClose,
  urls,
  onSave,
}) => {
  const [currentUrls, setCurrentUrls] = useState<string[]>(urls);
  const [newUrl, setNewUrl] = useState<string>('');

  const addUrl = () => {
    const val = newUrl.trim();
    if (!val) return;
    const next = [...currentUrls, val];
    setCurrentUrls(next);
    setNewUrl('');
  };

  const removeUrl = (idx: number) => {
    const next = currentUrls.filter((_, i) => i !== idx);
    setCurrentUrls(next);
  };

  const handleSave = () => {
    onSave(currentUrls);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>Conectar Google Agenda</DialogTitle>
          <DialogDescription>
            Adicione os URLs ICS do seu Google Calendar para exibir seus compromissos na agenda do CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-700/30">
            <p className="text-sm font-medium mb-1">Como obter o URL ICS:</p>
            <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Abra o Google Calendar (web) → Configurações → Seu calendário.</li>
              <li>Na seção “Integrar calendário”, copie “Endereço secreto” ou “Endereço público” (termina com .ics).</li>
              <li>Cole o URL abaixo e salve.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-sm">Adicionar URL ICS</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <Button type="button" onClick={addUrl} className="bg-brand-600 hover:bg-brand-700 text-white">
                Adicionar
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm">Calendários conectados</label>
            {currentUrls.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nenhum calendário adicionado ainda.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {currentUrls.map((u, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Input value={u} readOnly className="flex-1 text-xs dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                    <Button variant="destructive" type="button" onClick={() => removeUrl(idx)}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" type="button" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleCalendarConnectModal;