import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Candidate, InterviewScores } from '../types';
import { Save, ArrowLeft, Plus } from 'lucide-react';

export const NewCandidate = () => {
  const navigate = useNavigate();
  const { addCandidate, interviewStructure, origins, interviewers, addOrigin, addInterviewer } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    origin: origins[0] || 'Indicação',
    interviewer: interviewers[0] || 'João Müller',
    date: new Date().toISOString().split('T')[0],
  });

  const [scores, setScores] = useState<Record<string, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const initialScores: Record<string, number> = {};
    interviewStructure.forEach(sec => {
      initialScores[sec.id] = 0;
    });
    setScores(initialScores);
  }, [interviewStructure]);

  const handleCheckQuestion = (sectionId: string, questionId: string, points: number, isChecked: boolean) => {
    const newChecked = { ...checkedQuestions, [questionId]: isChecked };
    setCheckedQuestions(newChecked);

    const section = interviewStructure.find(s => s.id === sectionId);
    if (section) {
        let currentSectionScore = 0;
        section.questions.forEach(q => {
            if (newChecked[q.id]) {
                currentSectionScore += q.points;
            }
        });
        const finalScore = Math.min(currentSectionScore, section.maxPoints);
        setScores(prev => ({ ...prev, [sectionId]: finalScore }));
    }
  };

  const handleScoreChange = (sectionId: string, newVal: number) => {
      const section = interviewStructure.find(s => s.id === sectionId);
      const max = section ? section.maxPoints : 100;
      setScores(prev => ({ ...prev, [sectionId]: Math.min(max, Math.max(0, newVal)) }));
  };

  const handleAddOrigin = () => {
      const newOrigin = prompt("Digite a nova origem:");
      if (newOrigin && newOrigin.trim()) {
          addOrigin(newOrigin.trim());
          setFormData(prev => ({ ...prev, origin: newOrigin.trim() }));
      }
  };

  const handleAddInterviewer = () => {
      const newInterviewer = prompt("Digite o nome do novo entrevistador:");
      if (newInterviewer && newInterviewer.trim()) {
          addInterviewer(newInterviewer.trim());
          setFormData(prev => ({ ...prev, interviewer: newInterviewer.trim() }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const interviewScores: InterviewScores = {
      basicProfile: scores['basicProfile'] || 0,
      commercialSkills: scores['commercialSkills'] || 0,
      behavioralProfile: scores['behavioralProfile'] || 0,
      jobFit: scores['jobFit'] || 0,
      notes: notes,
      ...scores 
    };

    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone,
      interviewDate: formData.date,
      interviewer: formData.interviewer,
      origin: formData.origin,
      status: 'Entrevista',
      interviewScores: interviewScores,
      checkedQuestions: checkedQuestions,
      checklistProgress: {},
      consultantGoalsProgress: {},
      createdAt: new Date().toISOString(),
    };
    await addCandidate(newCandidate);
    navigate(`/candidate/${newCandidate.id}`);
  };

  const totalScore = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);

  const inputClass = "w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 border focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Avaliação de Entrevista</h1>
        <div className="text-right">
             <span className="text-sm text-gray-500 dark:text-gray-400">Nota Final</span>
             <div className={`text-3xl font-bold ${totalScore >= 70 ? 'text-green-600 dark:text-green-400' : totalScore < 50 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {totalScore}/100
             </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 0: Info */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-400 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Informações Iniciais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome do Candidato</label>
              <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
             <div>
              <label className={labelClass}>Origem</label>
              <div className="flex gap-2">
                  <select className={inputClass} value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})}>
                    {origins.map(o => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleAddOrigin} className="p-2 bg-brand-100 text-brand-700 rounded dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-200" title="Adicionar nova origem">
                      <Plus className="w-5 h-5" />
                  </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <input required type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Entrevistador</label>
              <div className="flex gap-2">
                  <select className={inputClass} value={formData.interviewer} onChange={e => setFormData({...formData, interviewer: e.target.value})}>
                    {interviewers.map(i => (
                        <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                   <button type="button" onClick={handleAddInterviewer} className="p-2 bg-brand-100 text-brand-700 rounded dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-200" title="Adicionar novo entrevistador">
                      <Plus className="w-5 h-5" />
                  </button>
              </div>
            </div>
             <div>
              <label className={labelClass}>Telefone</label>
              <input required type="tel" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Dynamic Interview Sections */}
        {interviewStructure.map(section => (
            <section key={section.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-400">{section.title} (Máx {section.maxPoints})</h2>
                    <div className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Nota:</span>
                        <input 
                            type="number" 
                            min="0" max={section.maxPoints}
                            className="w-20 p-2 border border-gray-300 dark:border-slate-600 rounded-md font-bold text-right bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            value={scores[section.id] || 0}
                            onChange={e => handleScoreChange(section.id, Number(e.target.value))}
                        />
                    </div>
                </div>
                <div className="space-y-3 mb-2">
                    {section.questions.map(q => (
                        <div key={q.id} className="flex items-start">
                             <div className="flex items-center h-5">
                                <input
                                    id={q.id}
                                    type="checkbox"
                                    className="focus:ring-brand-500 h-4 w-4 text-brand-600 border-gray-300 rounded cursor-pointer"
                                    checked={!!checkedQuestions[q.id]}
                                    onChange={(e) => handleCheckQuestion(section.id, q.id, q.points, e.target.checked)}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor={q.id} className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{q.text}</label>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({q.points} pts)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        ))}

         <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Anotações Gerais</h2>
            <textarea 
                className="w-full border border-gray-300 dark:border-slate-600 p-3 rounded-md h-32 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" 
                placeholder="Impressões gerais sobre o candidato..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
            />
         </section>

        <div className="flex justify-end pt-4">
            <button type="submit" className="flex items-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-lg transition font-medium shadow-lg shadow-brand-500/30">
                <Save className="w-5 h-5" />
                <span>Salvar Avaliação</span>
            </button>
        </div>
      </form>
    </div>
  );
};