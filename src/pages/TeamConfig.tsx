import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, User, Shield, Crown, Star, Edit2, Save, X, Archive, UserCheck, Loader2, Copy, RefreshCw, KeyRound, Mail } from 'lucide-react';
import { TeamMember, TeamRole } from '@/types';
import { formatCpf, generateRandomPassword } from '@/utils/authUtils';
import { ConsultantCredentialsModal } from '@/components/ConsultantCredentialsModal';

const ALL_ROLES: TeamRole[] = ['Prévia', 'Autorizado', 'Gestor', 'Anjo'];

export const TeamConfig = () => {
  const { user } = useAuth(); // Obter o usuário logado (gestor)
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  const { resetConsultantPasswordViaEdge } = useAuth(); // Usar resetConsultantPasswordViaEdge
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState(''); // Novo estado para o e-mail
  const [newCpf, setNewCpf] = useState('');
  const [newRoles, setNewRoles] = useState<TeamRole[]>(['Prévia']);
  const [generatedPassword, setGeneratedPassword] = useState(generateRandomPassword());
  const [isAdding, setIsAdding] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState(''); // Novo estado para o e-mail em edição
  const [editingCpf, setEditingCpf] = useState('');
  const [editingRoles, setEditingRoles] = useState<TeamRole[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdConsultantCredentials, setCreatedConsultantCredentials] = useState<{ name: string, login: string, password: string, wasExistingUser: boolean } | null>(null); // Adicionado wasExistingUser

  const handleRoleChange = (role: TeamRole, currentRoles: TeamRole[], setRoles: React.Dispatch<React.SetStateAction<TeamRole[]>>) => {
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
      alert("Você precisa estar logado como gestor para adicionar membros.");
      return;
    }
    if (!newName.trim() || !newEmail.trim() || newRoles.length === 0 || !newCpf.trim()) {
      alert("Nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (newCpf.replace(/\D/g, '').length !== 11) {
      alert("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsAdding(true);
    try {
      const cleanedCpf = newCpf.replace(/\D/g, '');
      const login = newEmail.trim(); // O login agora é o e-mail

      // --- NOVO LOG AQUI ---
      console.log("[TeamConfig] Enviando para addTeamMember:", {
        name: newName.trim(),
        email: newEmail.trim(),
        cpf: cleanedCpf,
        login: login,
        roles: newRoles,
      });
      // --- FIM DO NOVO LOG ---

      // Usar a nova função addTeamMember do AppContext
      const result = await addTeamMember({
        name: newName.trim(),
        email: newEmail.trim(),
        cpf: cleanedCpf,
        login: login, // Passar o email como login
        roles: newRoles,
        isActive: true,
      });

      if (result.success) {
        setCreatedConsultantCredentials({ 
          name: result.member.name, 
          login: result.member.email || '', // Usar o email como login
          password: result.tempPassword || '', // A senha temporária virá da Edge Function
          wasExistingUser: result.wasExistingUser || false, // Passar o flag
        });
        setShowCredentialsModal(true);
      } else {
        alert(result.message || "Falha ao adicionar membro.");
      }

      // Resetar formulário
      setNewName('');
      setNewEmail('');
      setNewCpf('');
      setNewRoles(['Prévia']);
      setGeneratedPassword(generateRandomPassword());
    } catch (error: any) {
      alert(`Falha ao adicionar membro: ${error.message}`);
      console.error("Erro ao adicionar membro:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member);
    setEditingName(member.name);
    setEditingEmail(member.email || ''); // Set editing email
    setEditingCpf(formatCpf(member.cpf || ''));
    setEditingRoles(member.roles);
  };

  const cancelEditing = () => {
    setEditingMember(null);
    setEditingName('');
    setEditingEmail(''); // Clear editing email
    setEditingCpf('');
    setEditingRoles([]);
  };

  const handleUpdate = async () => {
    if (!editingMember || !editingName.trim() || editingRoles.length === 0 || !editingCpf.trim() || !editingEmail.trim()) {
      alert("O nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (editingCpf.replace(/\D/g, '').length !== 11) {
      alert("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsUpdating(true);
    try {
      const cleanedCpf = editingCpf.replace(/\D/g, '');
      const result = await updateTeamMember(editingMember.id, { 
        name: editingName.trim(), 
        roles: editingRoles, 
        cpf: cleanedCpf,
        email: editingEmail.trim(), // Include email in updates
      });

      if (result?.tempPassword) {
        setCreatedConsultantCredentials({
          name: editingName.trim(),
          login: editingEmail.trim(),
          password: result.tempPassword,
          wasExistingUser: true, // It's an update, so it's an existing user
        });
        setShowCredentialsModal(true);
      }
      
      cancelEditing();
    } catch (error: any) {
      alert(`Falha ao atualizar membro: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita.')) {
      try {
        await deleteTeamMember(id);
      } catch (error: any) {
        alert(`Falha ao remover membro: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await updateTeamMember(member.id, { isActive: !member.isActive });
    } catch (error: any) {
      alert(`Falha ao alterar status do membro: ${error.message}`);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.email) { // Usar o email para resetar
      alert("Não é possível resetar a senha: E-mail do consultor não encontrado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja resetar a senha de ${member.name}? Uma nova senha temporária será gerada e o consultor será forçado a trocá-la no próximo login.`)) {
      return;
    }

    try {
      const newTempPassword = generateRandomPassword();
      
      await resetConsultantPasswordViaEdge(member.id, newTempPassword);
      
      setCreatedConsultantCredentials({ 
        name: member.name, 
        login: member.email, // O login é o email
        password: newTempPassword, 
        wasExistingUser: true // Sempre será um usuário existente neste caso
      });
      setShowCredentialsModal(true);

      alert(`Senha de ${member.name} resetada com sucesso! O consultor será forçado a trocá-la no próximo login.`);
    } catch (error: any) {
      alert(`Falha ao resetar senha: ${error.message}`);
      console.error("Erro ao resetar senha:", error);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
      switch(role) {
          case 'Gestor': return <Crown className="w-4 h-4 text-blue-500" />;
          case 'Anjo': return <Star className="w-4 h-4 text-yellow-500" />;
          case 'Autorizado': return <Shield className="w-4 h-4 text-green-500" />;
          default: return <User className="w-4 h-4 text-gray-500" />;
      }
  };

  const getRoleBadge = (role: TeamRole) => {
      switch(role) {
          case 'Gestor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
          case 'Anjo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
          case 'Autorizado': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
        <p className="text-gray-500 dark:text-gray-400">Cadastre os membros da equipe e defina seus cargos para uso nas comissões.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="md:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-8">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Adicionar Membro</h2>
                  <form onSubmit={handleAdd} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
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
                                className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                                placeholder="email@exemplo.com"
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
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                            placeholder="000.000.000-00"
                            value={newCpf}
                            onChange={e => setNewCpf(formatCpf(e.target.value))}
                            maxLength={14}
                          />
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
              </div>
          </div>

          {/* List */}
          <div className="md:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Membros da Equipe ({teamMembers.length})</h3>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {teamMembers.length === 0 ? (
                          <li className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum membro cadastrado.</li>
                      ) : (
                          teamMembers.map(member => (
                              <li key={member.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group ${!member.isActive ? 'opacity-60' : ''}`}>
                                  {editingMember?.id === member.id ? (
                                    <div className="flex-1 flex flex-col gap-3">
                                      <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm" />
                                      <input type="email" value={editingEmail} onChange={e => setEditingEmail(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm" /> {/* Email field */}
                                      <input type="text" value={editingCpf} onChange={e => setEditingCpf(formatCpf(e.target.value))} maxLength={14} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm" />
                                      <div className="grid grid-cols-2 gap-2">
                                        {ALL_ROLES.map(role => (
                                            <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                                <input type="checkbox" checked={editingRoles.includes(role)} onChange={() => handleRoleChange(role, editingRoles, setEditingRoles)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                                <span className="text-sm">{role}</span>
                                            </label>
                                        ))}
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={handleUpdate} disabled={isUpdating} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50">
                                            {isUpdating ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
                                            Salvar
                                        </button>
                                        <button onClick={cancelEditing} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center space-x-4">
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
                                          </div>
                                      </div>
                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleResetPassword(member)} className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Resetar Senha">
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleToggleActive(member)} className={`p-2 rounded-full ${member.isActive ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={member.isActive ? 'Inativar' : 'Ativar'}>
                                            {member.isActive ? <Archive className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => startEditing(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
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
                                  )}
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
    </div>
  );
};