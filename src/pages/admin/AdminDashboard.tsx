import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Users, DollarSign, TrendingUp, CalendarDays, BarChart3, UserRound, ShieldCheck, Plus, Edit2, Trash2, KeyRound, Mail, Phone, RotateCcw, Check, Copy, UserPlus, XCircle, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { formatLargeCurrency } from '@/utils/currencyUtils';
import { TeamMember, UserRole } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConsultantCredentialsModal } from '@/components/ConsultantCredentialsModal';
import toast from 'react-hot-toast';
import { generateRandomPassword, formatCpf } from '@/utils/authUtils';

const ALL_ROLES: UserRole[] = ['CONSULTOR', 'PRÉVIA', 'AUTORIZADO', 'GESTOR', 'ANJO', 'SECRETARIA', 'ADMIN'];

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { 
    teamMembers, 
    crmLeads, 
    commissions, 
    isDataLoading, 
    updateTeamMember, 
    deleteTeamMember, 
    addTeamMember,
  } = useApp();
  const { resetConsultantPasswordViaEdge } = useAuth();

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberCpf, setNewMemberCpf] = useState('');
  const [newMemberRoles, setNewMemberRoles] = useState<UserRole[]>(['CONSULTOR']);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdConsultantCredentials, setCreatedConsultantCredentials] = useState<{ name: string, login: string, password: string, wasExistingUser: boolean } | null>(null);

  const filteredLeads = useMemo(() => {
    const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
    const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;

    return crmLeads.filter(lead => {
      const saleDate = lead.sale_date ? new Date(lead.sale_date + 'T00:00:00') : null;
      const createdAt = new Date(lead.created_at);
      
      const dateToCheck = saleDate || createdAt; // Prioriza data de venda, senão data de criação

      const matchesStart = !start || dateToCheck >= start;
      const matchesEnd = !end || dateToCheck <= end;
      return matchesStart && matchesEnd;
    });
  }, [crmLeads, filterStartDate, filterEndDate]);

  const officeMetrics = useMemo(() => {
    let totalSoldValue = 0;
    let totalLeads = 0;
    let totalActiveConsultants = 0;
    let totalActiveManagers = 0;
    let totalActiveSecretarias = 0;

    filteredLeads.forEach(lead => {
      if (lead.sold_credit_value) {
        totalSoldValue += lead.sold_credit_value;
      }
      totalLeads++;
    });

    teamMembers.forEach(member => {
      if (member.isActive) {
        if (member.roles.includes('CONSULTOR') || member.roles.includes('PRÉVIA') || member.roles.includes('AUTORIZADO')) {
          totalActiveConsultants++;
        }
        if (member.roles.includes('GESTOR')) {
          totalActiveManagers++;
        }
        if (member.roles.includes('SECRETARIA')) {
          totalActiveSecretarias++;
        }
      }
    });

    return {
      totalSoldValue,
      totalLeads,
      totalActiveConsultants,
      totalActiveManagers,
      totalActiveSecretarias,
    };
  }, [filteredLeads, teamMembers]);

  const handleRoleChange = (memberId: string, newRoles: UserRole[]) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    // Prevenir que o ADMIN remova seu próprio papel de ADMIN
    if (member.authUserId === user?.id && !newRoles.includes('ADMIN')) {
      toast.error("Você não pode remover seu próprio papel de ADMIN.");
      return;
    }

    updateTeamMember(memberId, { roles: newRoles });
  };

  const handleToggleActive = (member: TeamMember) => {
    // Prevenir que o ADMIN se inative
    if (member.authUserId === user?.id && member.isActive) {
      toast.error("Você não pode inativar sua própria conta de ADMIN.");
      return;
    }
    updateTeamMember(member.id, { isActive: !member.isActive });
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    // Prevenir que o ADMIN se exclua
    if (teamMembers.find(m => m.id === memberId)?.authUserId === user?.id) {
      toast.error("Você não pode excluir sua própria conta de ADMIN.");
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o membro "${memberName}"? Esta ação não pode ser desfeita.`)) {
      deleteTeamMember(memberId);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.authUserId) {
      toast.error("Não é possível resetar a senha: ID de autenticação do membro não encontrado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja resetar a senha de ${member.name}? Uma nova senha temporária será gerada e o membro será forçado a trocá-la no próximo login.`)) {
      return;
    }

    try {
      const newTempPassword = generateRandomPassword();
      const { userEmail } = await resetConsultantPasswordViaEdge(member.authUserId, newTempPassword);
      
      setCreatedConsultantCredentials({
        name: member.name,
        login: userEmail || member.email || '',
        password: newTempPassword,
        wasExistingUser: true
      });
      setShowCredentialsModal(true);

      toast.success(`Senha de ${member.name} resetada com sucesso!`);
    } catch (error: any) {
      toast.error(`Falha ao resetar senha: ${error.message}`);
      console.error("Erro ao resetar senha:", error);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError('');

    if (!newMemberName.trim() || !newMemberEmail.trim() || newMemberRoles.length === 0 || !newMemberCpf.trim()) {
      setAddMemberError("Nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (newMemberCpf.replace(/\D/g, '').length !== 11) {
      setAddMemberError("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsAddingMember(true);
    try {
      const cleanedCpf = newMemberCpf.replace(/\D/g, '');
      
      const result = await addTeamMember({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        cpf: cleanedCpf,
        roles: newMemberRoles,
        isActive: true,
      });

      if (result.success) {
        toast.success("Membro da equipe adicionado com sucesso!");
        setCreatedConsultantCredentials({ 
          name: result.member.name, 
          login: result.member.email || '',
          password: result.tempPassword || '',
          wasExistingUser: result.wasExistingUser || false,
        });
        setShowCredentialsModal(true);
      } else {
        setAddMemberError(result.message || "Falha ao adicionar membro.");
      }

      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberCpf('');
      setNewMemberRoles(['CONSULTOR']);
      setIsAddMemberModalOpen(false);
    } catch (error: any) {
      setAddMemberError(error.message || "Falha ao adicionar membro.");
      console.error("Erro ao adicionar membro:", error);
    } finally {
      setIsAddingMember(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard do Escritório</h1>
        <p className="text-gray-500 dark:text-gray-400">Visão geral de todas as equipes e gestão de acessos.</p>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Inicial</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                type="date" 
                value={filterStartDate} 
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Final</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                type="date" 
                value={filterEndDate} 
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <Button 
            onClick={() => {
              const d = new Date();
              setFilterStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
              setFilterEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
            }}
            className="p-2.5 text-gray-400 hover:text-brand-500 transition-colors border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
            title="Resetar Filtros"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Métricas Agregadas do Escritório */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-brand-500" /> Métricas do Escritório
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Valor Total Vendido"
            value={formatLargeCurrency(officeMetrics.totalSoldValue)}
            icon={DollarSign}
            colorClass="bg-green-600 text-white"
          />
          <MetricCard
            title="Total de Leads"
            value={officeMetrics.totalLeads}
            icon={Users}
            colorClass="bg-blue-600 text-white"
          />
          <MetricCard
            title="Consultores Ativos"
            value={officeMetrics.totalActiveConsultants}
            icon={UserRound}
            colorClass="bg-purple-600 text-white"
          />
          <MetricCard
            title="Gestores Ativos"
            value={officeMetrics.totalActiveManagers}
            icon={ShieldCheck}
            colorClass="bg-orange-600 text-white"
          />
        </div>
      </section>

      {/* Gestão de Acessos */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-brand-500" /> Gestão de Acessos
          </h2>
          <Button onClick={() => setIsAddMemberModalOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Membro
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <ScrollArea className="h-[500px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">E-mail</th>
                  <th className="px-6 py-3">CPF</th>
                  <th className="px-6 py-3">Cargos</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {teamMembers.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{member.name}</td>
                    <td className="px-6 py-4">{member.email || 'N/A'}</td>
                    <td className="px-6 py-4">{formatCpf(member.cpf || '')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {ALL_ROLES.map(role => (
                          <span key={role} className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.roles.includes(role) ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {member.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleResetPassword(member)} title="Resetar Senha">
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(member)} title={member.isActive ? 'Inativar' : 'Ativar'}>
                          {member.isActive ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(member.id, member.name)} title="Excluir Membro">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </section>

      {/* Modal para Adicionar Novo Membro */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Membro</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo acesso no sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMemberSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="newMemberName">Nome Completo *</Label>
                <Input id="newMemberName" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="newMemberEmail">E-mail *</Label>
                <Input id="newMemberEmail" type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="newMemberCpf">CPF *</Label>
                <Input id="newMemberCpf" type="text" value={newMemberCpf} onChange={(e) => setNewMemberCpf(formatCpf(e.target.value))} maxLength={14} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label>Cargos / Funções *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map(role => (
                    <label key={role} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newMemberRoles.includes(role)}
                        onChange={() => setNewMemberRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              {addMemberError && <p className="text-red-500 text-sm mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{addMemberError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMemberModalOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
              <Button type="submit" disabled={isAddingMember} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isAddingMember ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isAddingMember ? 'Adicionando...' : 'Adicionar Membro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showCredentialsModal && createdConsultantCredentials && (
        <ConsultantCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          consultantName={createdConsultantCredentials.name}
          login={createdConsultantCredentials.login}
          password={createdConsultantCredentials.password}
          wasExistingUser={createdConsultantCredentials.wasExistingUser}
        />
      )}
    </div>
  );
};