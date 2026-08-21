import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Edit2, Trash2, Plus, Save, X, HelpCircle, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export const InterviewConfig = () => {
  const { interviewStructure, updateInterviewSection, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, moveInterviewQuestion, resetInterviewToDefault } = useApp();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState({ title: '', maxPoints: 0 });

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionData, setQuestionData] = useState({ text: '', points: 0 });

  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newQuestionData, setNewQuestionData] = useState({ text: '', points: 5 });

  const startEditSection = (id: string, title: string, maxPoints: number) => {
    setEditingSectionId(id);
    setSectionData({ title, maxPoints });
  };

  const saveSection = (id: string) => {
    updateInterviewSection(id, sectionData);
    setEditingSectionId(null);
  };

  const startEditQuestion = (id: string, text: string, points: number) => {
    setEditingQuestionId(id);
    setQuestionData({ text, points });
  };

  const saveQuestion = (sectionId: string, questionId: string) => {
    updateInterviewQuestion(sectionId, questionId, questionData);
    setEditingQuestionId(null);
  };

  const saveNewQuestion = (sectionId: string) => {
    if (newQuestionData.text.trim()) {
      addInterviewQuestion(sectionId, newQuestionData.text, newQuestionData.points);
      setAddingToSectionId(null);
      setNewQuestionData({ text: '', points: 5 });
    }
  };
  
  const handleReset = () => {
      if(confirm("Restaurar perguntas originais da entrevista?")){
          resetInterviewToDefault();
      }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Entrevista</h1>
            <p className="text-gray-500 dark:text-gray-400">Edite as perguntas e a pontuação de cada etapa.</p>
          </div>
          <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition">
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Restaurar Padrão
          </button>
      </div>

      <div className="space-y-8">
        {interviewStructure.map((section) => (
          <div key={section.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              {editingSectionId === section.id ? (
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full">
                  <input
                    type="text"
                    value={sectionData.title}
                    onChange={(e) => setSectionData({...sectionData, title: e.target.value})}
                    className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 font-bold w-full"
                  />
                  <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
                     <span className="text-sm mr-2 text-gray-500 dark:text-gray-400">Máx Pts:</span>
                     <input
                        type="number"
                        value={sectionData.maxPoints}
                        onChange={(e) => setSectionData({...sectionData, maxPoints: Number(e.target.value)})}
                        className="w-20 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm"
                     />
                     <div className="flex space-x-2 ml-4">
                        <button onClick={() => saveSection(section.id)} className="p-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"><Save className="w-5 h-5" /></button>
                        <button onClick={() => setEditingSectionId(null)} className="p-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded"><X className="w-5 h-5" /></button>
                     </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h3>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                      <span className="text-sm font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 px-2 py-1 rounded">
                          Máx: {section.maxPoints} pts
                      </span>
                      <button 
                        onClick={() => startEditSection(section.id, section.title, section.maxPoints)}
                        className="text-gray-400 hover:text-brand-600"
                      >
                          <Edit2 className="w-4 h-4" />
                      </button>
                  </div>
                </>
              )}
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {section.questions.map((q, index) => (
                    <div key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                        {editingQuestionId === q.id ? (
                            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full">
                                <input
                                    type="text"
                                    value={questionData.text}
                                    onChange={(e) => setQuestionData({...questionData, text: e.target.value})}
                                    className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm w-full"
                                    autoFocus
                                />
                                <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start space-x-2">
                                    <input
                                        type="number"
                                        value={questionData.points}
                                        onChange={(e) => setQuestionData({...questionData, points: Number(e.target.value)})}
                                        className="w-16 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm text-center"
                                    />
                                    <button onClick={() => saveQuestion(section.id, q.id)} className="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 p-1 rounded"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingQuestionId(null)} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 p-1 rounded"><X className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 mr-4 flex items-center w-full">
                                    <HelpCircle className="w-4 h-4 text-gray-300 dark:text-slate-500 mr-2" />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{q.text}</span>
                                </div>
                                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-slate-500">
                                        {q.points} pts
                                    </span>
                                    <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                                        <button 
                                          onClick={() => moveInterviewQuestion(section.id, q.id, 'up')}
                                          disabled={index === 0}
                                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                                        >
                                          <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => moveInterviewQuestion(section.id, q.id, 'down')}
                                          disabled={index === section.questions.length - 1}
                                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                                        >
                                          <ArrowDown className="w-4 h-4" />
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                                        <button 
                                            onClick={() => startEditQuestion(q.id, q.text, q.points)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('Tem certeza que deseja remover esta pergunta?')) {
                                                    deleteInterviewQuestion(section.id, q.id);
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                <div className="p-4 bg-gray-50/50 dark:bg-slate-700/30">
                    {addingToSectionId === section.id ? (
                        <div className="flex items-center space-x-2">
                             <input
                                type="text"
                                placeholder="Nova pergunta..."
                                value={newQuestionData.text}
                                onChange={(e) => setNewQuestionData({...newQuestionData, text: e.target.value})}
                                className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm"
                                autoFocus
                            />
                            <input
                                type="number"
                                placeholder="Pts"
                                value={newQuestionData.points}
                                onChange={(e) => setNewQuestionData({...newQuestionData, points: Number(e.target.value)})}
                                className="w-16 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm text-center"
                            />
                            <button onClick={() => saveNewQuestion(section.id)} className="px-3 py-1 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700">Salvar</button>
                            <button onClick={() => setAddingToSectionId(null)} className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-600">Cancelar</button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setAddingToSectionId(section.id)}
                            className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Pergunta
                        </button>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};