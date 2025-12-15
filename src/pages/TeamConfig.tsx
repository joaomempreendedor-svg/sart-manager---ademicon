import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, User, Shield, Crown, Star, Edit2, Save, X, Archive, UserCheck, Loader2 } from 'lucide-react';
import { TeamMember, TeamRole } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_ROLES: TeamRole[] = ['Prévia', 'Autorizado', 'Gestor', 'Anjo'];

export const TeamConfig = () => {
  const { user } = useAuth();
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  
  const [availableConsultants, setAvailableConsultants] = useState<{ id: string; name: string; email: string; }[]>([]);
  const [selectedNewConsultantId, setSelectedNewConsultantId] = useState('');
  const [newRoles, setNewRoles] = useState<TeamRole[]>(['Prévia']);
  const [isAdding, setIsAdding] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingRoles, setEditingRoles] = useState<TeamRole[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch available consultants (users with 'CONSULTOR' role not yet in this manager's team)
  useEffect(() => {
    const fetchAvailableConsultants = async () => {
      if (!user) return;

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('role', 'CONSULTOR');

      if (error) {
        console.error("Error fetching consultant profiles:", error);
        return;
      }

      const currentTeamConsultantIds = new Set(teamMembers.map(m => m.consultant_id));

      const filtered = (profiles || [])
        .filter(p => !currentTeamConsultantIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
          email: p.email,
        }));
      
      setAvailableConsultants(filtered);
      if (filtered.length > 0 && !selectedNewConsultantId) {
        setSelectedNewConsultantId(filtered[0].id);
      }
    };

    fetchAvailableConsultants();
  }, [user, teamMembers, selectedNewConsultantId]);

  const handleRoleChange = (role: TeamRole, currentRoles: TeamRole[], setRoles: React.Dispatch<React.SetStateAction<TeamRole[]>>) => {
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    setRoles(updatedRoles);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewConsultantId || newRoles.length === 0) {
      alert("Selecione um consultor e pelo menos um cargo.");
      return;
    }
    setIsAdding(true);
    try {
      await addTeamMember(selectedNewConsultantId, newRoles, true);
      setSelectedNewConsultantId('');
      setNewRoles(['Prévia']);
    } catch (error: any) {
      alert(`Falha ao adicionar membro: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member);
    setEditingRoles(member.roles);
  };

  const cancelEditing = () => {
    setEditingMember(null);
    setEditingRoles([]);
  };

  const handleUpdate = async () => {
    if (!editingMember || editingRoles.length === 0) {
      alert("Pelo menos um cargo é obrigatório.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateTeamMember(editingMember.consultant_id, { roles: editingRoles });
      cancelEditing();
    } catch (error: any) {
      alert(`Falha ao atualizar membro: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (consultantId: string, consultantName: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${consultantName}" da sua equipe?`)) {
      try {
        await deleteTeamMember(consultantId);
      } catch (error: any) {
        alert(`Falha ao remover membro: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await updateTeamMember(member.consultant_id, { is_active: !member.is_active });
    } catch (error: any) {
      alert(`Falha ao alterar status do membro: ${error.message}`);
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
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Consultor</label>
                          <Select value={selectedNewConsultantId} onValueChange={setSelectedNewConsultantId}>
                            <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                              <SelectValue placeholder="Selecione um consultor" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                              {availableConsultants.length === 0 ? (
                                <p className="p-2 text-sm text-gray-500">Nenhum consultor disponível.</p>
                              ) : (
                                availableConsultants.map(consultant => (
                                  <SelectItem key={consultant.id} value={consultant.id}>
                                    {consultant.name} ({consultant.email})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
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
                      <button type="submit" disabled={isAdding || !selectedNewConsultantId || newRoles.length === 0} className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg transition font-medium disabled:opacity-50">
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
                              <li key={member.consultant_id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group ${!member.is_active ? 'opacity-60' : ''}`}>
                                  {editingMember?.consultant_id === member.consultant_id ? (
                                    <div className="flex-1 flex flex-col gap-3">
                                      <p className="font-medium text-gray-900 dark:text-white">{member.consultant_name}</p>
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
                                              <p className="font-medium text-gray-900 dark:text-white">{member.consultant_name}</p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">{member.consultant_email}</p>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {member.roles.map(role => (
                                                    <span key={role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(role)}`}>
                                                        {role}
                                                    </span>
                                                ))}
                                                {!member.is_active && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Inativo</span>}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleToggleActive(member)} className={`p-2 rounded-full ${member.is_active ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={member.is_active ? 'Inativar' : 'Ativar'}>
                                            {member.is_active ? <Archive className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => startEditing(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(member.consultant_id, member.consultant_name || 'Membro')}
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
    </div>
  );
};