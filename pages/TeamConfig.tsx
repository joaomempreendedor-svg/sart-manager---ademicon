
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, User, Shield, Crown, Star } from 'lucide-react';
import { TeamRole } from '../types';

export const TeamConfig = () => {
  const { teamMembers, addTeamMember, deleteTeamMember } = useApp();
  
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('Consultor');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      addTeamMember({
        id: crypto.randomUUID(),
        name: newName.trim(),
        role: newRole
      });
      setNewName('');
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
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cargo / Função</label>
                          <select 
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as TeamRole)}
                          >
                              <option value="Consultor">Consultor</option>
                              <option value="Autorizado">Autorizado</option>
                              <option value="Gestor">Gestor</option>
                              <option value="Anjo">Anjo</option>
                          </select>
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
                                  <div className="flex items-center space-x-4">
                                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                          {getRoleIcon(member.role)}
                                      </div>
                                      <div>
                                          <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(member.role)}`}>
                                              {member.role}
                                          </span>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('Remover este membro da equipe?')) deleteTeamMember(member.id) }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition opacity-0 group-hover:opacity-100"
                                  >
                                      <Trash2 className="w-5 h-5" />
                                  </button>
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
