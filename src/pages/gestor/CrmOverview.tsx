// ... código anterior ...
                  // Encontrar a próxima reunião para este lead
                  const nextMeeting = leadTasks
                    .filter(task => task.lead_id === lead.id && task.type === 'meeting' && !task.is_completed && task.meeting_start_time && new Date(task.meeting_start_time) > new Date())
                    .sort((a, b) => new Date(a.meeting_start_time!).getTime() - new Date(b.meeting_start_time!).getTime())[0];

                  return (
                    <div key={lead.id} onClick={() => handleEditLead(lead)} className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group">
                      {/* ... outros detalhes do lead ... */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {/* ... outros campos de contato/origem ... */}
                        
                        {nextMeeting && (
                          <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold mt-2">
                            <Calendar className="w-3 h-3 mr-1" /> {new Date(nextMeeting.meeting_start_time!).toLocaleDateString('pt-BR')}
                            <Clock className="w-3 h-3 ml-2 mr-1" /> {new Date(nextMeeting.meeting_start_time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        {/* ... outros detalhes de proposta/venda ... */}
                      </div>
                      {/* ... restante do card ... */}
                    </div>
                  );
// ... código posterior ...