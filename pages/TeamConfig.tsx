import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, User, Shield, Crown, Star, Edit2, Save, X } from 'lucide-react';
import { TeamMember, TeamRole } from '../types';

const ALL_ROLES: TeamRole[] = ['Consultor', 'Autorizado', 'Gestor', 'Anjo'];

export const TeamConfig = () => {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  
  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<TeamRole[]>(['Consultor']);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingRoles, setEditingRoles] = useState<TeamRole[]>([]);

  const handleRoleChange = (role: TeamRole, currentRoles: TeamRole[], setRoles: React.Dispatch<React.SetStateAction<TeamRole[]>>) => {
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    setRoles(updatedRoles);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newRoles.length > 0) {
      addTeamMember({
        id: crypto.randomUUID(),
        name: newName.trim(),
        roles: newRoles
      });
      setNewName('');
      setNewRoles(['Consultor']);
    } else {
      alert("O nome e pelo menos um cargo são obrigatórios.");
    }
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member);
    setEditingName(member.name);
    setEditingRoles(member.roles);
  };

  const cancelEditing = () => {
    setEditingMember(null);
    setEditingName('');
    setEditingRoles([]);
  };

  const handleUpdate = () => {
    if (editingMember && editingName.trim() && editingRoles.length > 0) {
      updateTeamMember(editingMember.id, { name: editingName.trim(), roles: editingRoles });
      cancelEditing();
    } else {
      alert("O nome e pelo menos um cargo são obrigatórios.");
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
                      <button type="submit" className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg transition font-medium">
                          <Plus className="w-4 h-4" />
                          <span>Adicionar</span>
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
                              <li key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group">
                                  {editingMember?.id === member.id ? (
                                    <div className="flex-1 flex flex-col gap-3">
                                      <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm" />
                                      <div className="grid grid-cols-2 gap-2">
                                        {ALL_ROLES.map(role => (
                                            <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                                <input type="checkbox" checked={editingRoles.includes(role)} onChange={() => handleRoleChange(role, editingRoles, setEditingRoles)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                                <span className="text-sm">{role}</span>
                                            </label>
                                        ))}
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={handleUpdate} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"><Save className="w-4 h-4 inline mr-1" />Salvar</button>
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
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => { if(confirm('Remover este membro da equipe?')) deleteTeamMember(member.id) }}
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