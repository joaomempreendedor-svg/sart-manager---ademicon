import React, { useState, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, User, Shield, Crown, Star, Edit2, Save, X, Archive, UserCheck, Loader2, Copy, RefreshCw, KeyRound, Mail, CalendarPlus, CalendarDays, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { TeamMember, TeamRole, Candidate, UserRole } from '@/types';
import { formatCpf, generateRandomPassword } from '@/utils/authUtils';
import { ConsultantCredentialsModal } from '@/components/ConsultantCredentialsModal';
import { RecordTeamMemberInterviewModal } from '@/components/TeamConfig/RecordTeamMemberInterviewModal';
import { EditTeamMemberModal } from '@/components/TeamConfig/EditTeamMemberModal';
import toast from 'react-hot-toast';

const ALL_ROLES: UserRole[] = ['CONSULTOR', 'PRÉVIA', 'AUTORIZADO', 'GESTOR', 'ANJO', 'SECRETARIA', 'ADMIN'];
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

export const TeamConfig = () => {
  const { user } = useAuth();
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, candidates, addCandidate } = useApp();
  const { resetConsultantPasswordViaEdge } = useAuth();
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newRoles, setNewRoles] = useState<UserRole[]>(['CONSULTOR']);
  const [generatedPassword, setGeneratedPassword] = useState(generateRandomPassword());
  const [isAdding, setIsAdding] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Estados para o modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdConsultantCredentials, setCreatedConsultantCredentials] = useState<{ name: string, login: string, password: string, wasExistingUser: boolean } | null>(null);

  const [isRecordInterviewModalOpen, setIsRecordInterviewModalOpen] = useState(false);
  const [teamMemberToRecordInterview, setTeamMemberToRecordInterview] = useState<TeamMember | null>(null);

  const [isAddFormCollapsed, setIsAddFormCollapsed] = useState(true);

  const handleRoleChange = (role: UserRole, currentRoles: UserRole[], setRoles: React.Dispatch<React.SetStateAction<UserRole[]>>) => {
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    setRoles(updatedRoles);
  };

  const handleGeneratePassword = () => {
    setGeneratedPassword(generateRandomPassword());
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Você precisa estar logado como gestor para adicionar membros.");
      return;
    }
    if (!newName.trim() || !newEmail.trim() || newRoles.length === 0 || !newCpf.trim()) {
      toast.error("Nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (newCpf.replace(/\D/g, '').length !== 11) {
      toast.error("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsAdding(true);
    try {
      const cleanedCpf = newCpf.replace(/\D/g, '');
      
      const result = await addTeamMember({
        name: newName.trim(),
        email: newEmail.trim(),
        cpf: cleanedCpf,
        roles: newRoles,
        isActive: true,
        dateOfBirth: newDateOfBirth || undefined,
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
        toast.error(result.message || "Falha ao adicionar membro.");
      }

      setNewName('');
      setNewEmail('');
      setNewCpf('');
      setNewDateOfBirth('');
      setNewRoles(['CONSULTOR']);
      setGeneratedPassword(generateRandomPassword());
      setIsAddFormCollapsed(true);
    } catch (error: any) {
      toast.error(`Falha ao adicionar membro: ${error.message}`);
      console.error("Erro ao adicionar membro:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEditModal = (member: TeamMember) => {
    setMemberToEdit(member);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMember = async (id: string, updates: Partial<TeamMember>) => {
    const member = teamMembers.find(m => m.id === id);
    if (!member) return;

    // Prevenir que o ADMIN remova seu próprio papel de ADMIN
    if (member.authUserId === user?.id && updates.roles && !updates.roles.includes('ADMIN')) {
      toast.error("Você não pode remover seu próprio papel de ADMIN.");
      return;
    }

    await updateTeamMember(id, updates);
  };

  const handleDelete = async (id: string) => {
    // Prevenir que o ADMIN se exclua
    if (teamMembers.find(m => m.id === id)?.authUserId === user?.id) {
      toast.error("Você não pode excluir sua própria conta de ADMIN.");
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita.')) {
      try {
        await deleteTeamMember(id);
        toast.success("Membro da equipe removido com sucesso!");
      } catch (error: any) {
        toast.error(`Falha ao remover membro: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    // Prevenir que o ADMIN se inative
    if (member.authUserId === user?.id && member.isActive) {
      toast.error("Você não pode inativar sua própria conta de ADMIN.");
      return;
    }
    try {
      await updateTeamMember(member.id, { isActive: !member.isActive });
    } catch (error: any) {
      toast.error(`Falha ao alterar status do membro: ${error.message}`);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.authUserId) {
      toast.error("Não é possível resetar a senha: ID de autenticação do consultor não encontrado.");
      return;
    }
    // Prevenir que o ADMIN resete a própria senha por aqui (deve usar o fluxo de 'Esqueci minha senha')
    if (member.authUserId === user?.id && user.role === 'ADMIN') {
      toast.error("Gestores ADMIN devem usar a opção 'Esqueci minha senha' na tela de login para resetar sua própria senha.");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja resetar a senha de ${member.name}? Uma nova senha temporária será gerada e o consultor será forçado a trocá-la no próximo login.`)) {
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

      toast.success(`Senha de ${member.name} resetada com sucesso! O consultor será forçado a trocá-la no próximo login.`);
    } catch (error: any) {
      toast.error(`Falha ao resetar senha: ${error.message}`);
      console.error("Erro ao resetar senha:", error);
    }
  };

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case 'GESTOR': return <Crown className="w-4 h-4 text-blue-500" />;
          case 'ANJO': return <Star className="w-4 h-4 text-yellow-500" />;
          case 'AUTORIZADO': return <Shield className="w-4 h-4 text-green-500" />;
          case 'SECRETARIA': return <UserCheck className="w-4 h-4 text-purple-500" />;
          case 'ADMIN': return <AlertTriangle className="w-4 h-4 text-red-500" />; // Ícone para ADMIN
          default: return <User className="w-4 h-4 text-gray-500" />;
      }
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case 'GESTOR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
          case 'ANJO': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
          case 'AUTORIZADO': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
          case 'SECRETARIA': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
          case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'; // Cor para ADMIN
          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      }
  };

  const handleOpenRecordInterviewModal = (member: TeamMember) => {
    setTeamMemberToRecordInterview(member);
    setIsRecordInterviewModalOpen(true);
  };

  const sortedTeamMembers = useMemo(() => {
    return [...teamMembers].sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
        <p className="text-gray-500 dark:text-gray-400">Cadastre os membros da equipe e defina seus cargos para uso nas comissões.</p>
      </div>

      <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <button 
                onClick={() => setIsAddFormCollapsed(!isAddFormCollapsed)} 
                className="w-full flex justify-between items-center text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                <span><Plus className="w-5 h-5 inline-block mr-2 text-brand-500" /> Adicionar Novo Membro</span>
                {isAddFormCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
              
              {!isAddFormCollapsed && (
                <form onSubmit={handleAdd} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                        <input 
                          type="text" 
                          required
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          placeholder="Ex: João Silva"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                              type="email" 
                              required
                              className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                              value={newEmail}
                              onChange={e => setNewEmail(e.target.value)}
                          />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                        <input 
                          type="text" 
                          required
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          placeholder="000.000.000-00"
                          value={newCpf}
                          onChange={e => setNewCpf(formatCpf(e.target.value))}
                          maxLength={14}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Nascimento (Opcional)</label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                              type="date" 
                              className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                              value={newDateOfBirth}
                              onChange={e => setNewDateOfBirth(e.target.value)}
                          />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Cargos / Funções</label>
                        <div className="space-y-2">
                          {ALL_ROLES.map(role => (
                              <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                      type="checkbox"
                                      checked={newRoles.includes(role)}
                                      onChange={() => handleRoleChange(role, newRoles, setNewRoles)}
                                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                              </label>
                          ))}
                        </div>
                    </div>
                    <button type="submit" disabled={isAdding} className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg transition font-medium disabled:opacity-50">
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>{isAdding ? 'Adicionando...' : 'Adicionar'}</span>
                    </button>
                </form>
              )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Membros da Equipe ({sortedTeamMembers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                    {sortedTeamMembers.length === 0 ? (
                        <li className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum membro cadastrado.</li>
                    ) : (
                        sortedTeamMembers.map(member => (
                            <li key={member.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group ${!member.isActive ? 'opacity-60' : ''}`}>
                                  <>
                                    <div className="flex items-center space-x-4 flex-1 flex-wrap">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                            {member.roles && member.roles.length > 0 ? getRoleIcon(member.roles[0]) : <User className="w-4 h-4 text-gray-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {member.roles.map(role => (
                                                  <span key={role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(role)}`}>
                                                      {role}
                                                  </span>
                                              ))}
                                              {!member.isActive && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Inativo</span>}
                                            </div>
                                            {member.email && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email: {member.email}</p>
                                            )}
                                            {member.cpf && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CPF: {formatCpf(member.cpf)}</p>
                                            )}
                                            {member.dateOfBirth && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nascimento: {new Date(member.dateOfBirth + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleOpenRecordInterviewModal(member); }} 
                                          className="p-2 rounded-full text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20" 
                                          title="Registrar Entrevista"
                                        >
                                          <CalendarPlus className="w-4 h-4" />
                                        </button>
                                      <button onClick={() => handleResetPassword(member)} className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Resetar Senha">
                                          <KeyRound className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleToggleActive(member)} className={`p-2 rounded-full ${member.isActive ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={member.isActive ? 'Inativar' : 'Ativar'}>
                                          <Archive className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleOpenEditModal(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(member.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                      >
                                          <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </>
                            </li>
                        ))
                    )}
                </ul>
              </div>
          </div>
      </div>
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
      {isRecordInterviewModalOpen && teamMemberToRecordInterview && (
        <RecordTeamMemberInterviewModal
          isOpen={isRecordInterviewModalOpen}
          onClose={() => setIsRecordInterviewModalOpen(false)}
          teamMember={teamMemberToRecordInterview}
        />
      )}
      <EditTeamMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={memberToEdit}
        onSave={handleSaveEditedMember}
      />
    </div>
  );
};