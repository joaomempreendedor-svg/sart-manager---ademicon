import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { normalizeImportKey } from '@/lib/commissionImport';
import { WalletClient } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '-$1$2');
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

/** Reconhece variações como João Müller, João M. Müller e JOAO MULLER. */
const isJoaoMullerConsultant = (value: string) => {
  const tokens = normalizeImportKey(value).split(' ').filter(Boolean);
  if (!tokens.includes('joao') || !tokens.includes('muller')) return false;
  return tokens[0] === 'joao' || tokens[tokens.length - 1] === 'joao';
};

const getMissingClientInfo = (client: WalletClient) => {
  const missing: string[] = [];
  if (!client.cpf?.trim()) missing.push('CPF');
  if (!client.email?.trim()) missing.push('E-mail');
  if (!client.phone?.trim()) missing.push('Telefone');
  if (!client.birthDate?.trim()) missing.push('Aniversário');
  return missing;
};

const isClientDataComplete = (client: WalletClient) => getMissingClientInfo(client).length === 0;

type AddClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (client: WalletClient) => void;
  existingKeys: Set<string>;
};

const AddClientDialog: React.FC<AddClientDialogProps> = ({ open, onOpenChange, onAdd, existingKeys }) => {
  const [clientName, setClientName] = useState('');
  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const reset = () => {
    setClientName('');
    setGroup('');
    setQuota('');
    setCpf('');
    setEmail('');
    setPhone('');
    setBirthDate('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const name = clientName.trim();
    if (!name) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    const normalizedGroup = group.trim();
    const normalizedQuota = quota.trim();
    const key = `${normalizeImportKey(name)}|${normalizeImportKey(normalizedGroup)}|${normalizeImportKey(normalizedQuota)}`;

    if (existingKeys.has(key)) {
      toast.error('Já existe um cliente com esse nome, grupo e cota.');
      return;
    }

    onAdd({
      key,
      clientName: name,
      group: normalizedGroup,
      quota: normalizedQuota,
      cpf,
      email: email.trim(),
      phone,
      birthDate,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    });

    toast.success('Cliente adicionado à carteira.');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar cliente à carteira</DialogTitle>
          <DialogDescription>
            Use este formulário para clientes que ainda não aparecem no histórico de comissões.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="new-client-name">Nome do cliente *</Label>
              <Input
                id="new-client-name"
                value={clientName}
                onChange={event => setClientName(event.target.value)}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-group">Grupo</Label>
              <Input
                id="new-client-group"
                value={group}
                onChange={event => setGroup(event.target.value)}
                placeholder="Ex.: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-quota">Cota</Label>
              <Input
                id="new-client-quota"
                value={quota}
                onChange={event => setQuota(event.target.value)}
                placeholder="Ex.: 01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-birth-date">Aniversário</Label>
              <Input
                id="new-client-birth-date"
                type="date"
                value={birthDate}
                onChange={event => setBirthDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-client-cpf">CPF</Label>
              <Input
                id="new-client-cpf"
                value={cpf}
                onChange={event => setCpf(formatCpf(event.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-email">E-mail</Label>
              <Input
                id="new-client-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-phone">Telefone</Label>
              <Input
                id="new-client-phone"
                value={phone}
                onChange={event => setPhone(formatPhone(event.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar cliente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type ClientRowProps = {
  client: WalletClient;
  onSave: (client: WalletClient) => void;
};

const ClientRow: React.FC<ClientRowProps> = ({ client, onSave }) => {
  const [cpf, setCpf] = useState(client.cpf || '');
  const [email, setEmail] = useState(client.email || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [birthDate, setBirthDate] = useState(client.birthDate || '');

  useEffect(() => {
    setCpf(client.cpf || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setBirthDate(client.birthDate || '');
  }, [client.key, client.cpf, client.email, client.phone, client.birthDate]);

  const save = (field: 'cpf' | 'email' | 'phone' | 'birthDate', value: string) => {
    const next = { ...client, [field]: value, updatedAt: new Date().toISOString() };
    onSave(next);
  };

  const cpfInvalid = onlyDigits(cpf).length > 0 && onlyDigits(cpf).length !== 11;
  const emailInvalid = Boolean(email.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneInvalid = onlyDigits(phone).length > 0 && ![10, 11].includes(onlyDigits(phone).length);

  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition">
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900 dark:text-white">{client.clientName}</div>
        {client.source === 'manual' && (
          <div className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Adicionado manualmente
          </div>
        )}
        {client.lastSaleDate && (
          <div className="text-[11px] text-gray-400">
            Última venda: {new Date(`${client.lastSaleDate}T00:00:00`).toLocaleDateString('pt-BR')}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{client.group || '—'}</td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{client.quota || '—'}</td>
      <td className="px-4 py-3">
        <Input
          value={cpf}
          onChange={event => setCpf(formatCpf(event.target.value))}
          onBlur={() => save('cpf', cpf)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          placeholder="000.000.000-00"
          title={cpfInvalid ? 'CPF deve ter 11 dígitos' : 'CPF (salvo automaticamente)'}
          className={`h-9 w-40 text-sm ${cpfInvalid ? 'border-red-400' : ''}`}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          onBlur={() => save('email', email.trim())}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          placeholder="email@exemplo.com"
          title={emailInvalid ? 'E-mail inválido' : 'E-mail (salvo automaticamente)'}
          className={`h-9 w-56 text-sm ${emailInvalid ? 'border-red-400' : ''}`}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          value={phone}
          onChange={event => setPhone(formatPhone(event.target.value))}
          onBlur={() => save('phone', phone)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          placeholder="(00) 00000-0000"
          title={phoneInvalid ? 'Telefone deve ter 10 ou 11 dígitos' : 'Telefone (salvo automaticamente)'}
          className={`h-9 w-44 text-sm ${phoneInvalid ? 'border-red-400' : ''}`}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="date"
          value={birthDate}
          onChange={event => setBirthDate(event.target.value)}
          onBlur={() => save('birthDate', birthDate)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          title="Data de aniversário (salva automaticamente)"
          className="h-9 w-40 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-center">
        {isClientDataComplete(client) ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Completo
          </span>
        ) : (
          <span
            className="inline-flex flex-col items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            title={`Falta: ${getMissingClientInfo(client).join(', ')}`}
          >
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Falta informações
            </span>
            <span className="text-[10px] font-normal">
              {getMissingClientInfo(client).join(', ')}
            </span>
          </span>
        )}
      </td>
    </tr>
  );
};

export const WalletClients = () => {
  const { commissions, walletClients, updateWalletClient, isDataLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const clients = useMemo(() => {
    const fromHistory = new Map<string, WalletClient>();

    commissions.forEach(commission => {
      if (!isJoaoMullerConsultant(commission.consultant || '')) return;

      const clientName = (commission.clientName || '').trim();
      if (!clientName) return;

      const group = (commission.group || '').trim();
      const quota = (commission.quota || '').trim();
      const key = `${normalizeImportKey(clientName)}|${normalizeImportKey(group)}|${normalizeImportKey(quota)}`;
      const existing = fromHistory.get(key);
      const saleDate = commission.date || '';

      if (!existing) {
        fromHistory.set(key, { key, clientName, group, quota, lastSaleDate: saleDate, source: 'commission' });
      } else if (saleDate && (!existing.lastSaleDate || saleDate > existing.lastSaleDate)) {
        fromHistory.set(key, { ...existing, lastSaleDate: saleDate });
      }
    });

    // Clientes adicionados manualmente também fazem parte da carteira.
    walletClients.forEach(saved => {
      if (!fromHistory.has(saved.key) && saved.clientName?.trim()) {
        fromHistory.set(saved.key, {
          ...saved,
          clientName: saved.clientName.trim(),
          group: saved.group || '',
          quota: saved.quota || '',
          source: saved.source || 'manual',
        });
      }
    });

    return Array.from(fromHistory.values())
      .map(client => {
        const saved = walletClients.find(item => item.key === client.key);
        return {
          ...client,
          cpf: saved?.cpf || '',
          email: saved?.email || '',
          phone: saved?.phone || '',
          birthDate: saved?.birthDate || '',
        };
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'));
  }, [commissions, walletClients]);

  const completeCount = clients.filter(isClientDataComplete).length;
  const clientKeys = useMemo(() => new Set(clients.map(client => client.key)), [clients]);

  const visibleClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clients.filter(client => {
      if (onlyIncomplete && isClientDataComplete(client)) return false;
      if (!term) return true;
      return [client.clientName, client.group, client.quota, client.cpf, client.email, client.phone, client.birthDate]
        .some(value => (value || '').toLowerCase().includes(term));
    });
  }, [clients, searchTerm, onlyIncomplete]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes da Carteira — João Müller</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clientes extraídos automaticamente do histórico de comissões onde o consultor é João Müller
            (incluindo variações como João B. Müller).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar cliente
          </Button>
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
            <Users className="h-5 w-5" />
            <span className="text-sm font-bold">{clients.length} clientes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Total na carteira</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Cadastros completos</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{completeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Faltando dados</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{clients.length - completeCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, grupo, cota, CPF, e-mail ou telefone..."
              className="pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={event => setOnlyIncomplete(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Mostrar apenas com dados faltando
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Cota</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Aniversário</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {isDataLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Carregando carteira...</td>
                </tr>
              ) : visibleClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Nenhum cliente encontrado. Importe comissões com o consultor João Müller para popular a carteira.
                  </td>
                </tr>
              ) : (
                visibleClients.map(client => (
                  <ClientRow key={client.key} client={client} onSave={updateWalletClient} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400 dark:border-slate-700">
          CPF, e-mail, telefone e aniversário são salvos automaticamente ao sair do campo.
        </p>
      </div>

      <AddClientDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={updateWalletClient}
        existingKeys={clientKeys}
      />
    </div>
  );
};
