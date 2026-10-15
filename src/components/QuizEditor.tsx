import React, { useState } from 'react';
import { Quiz, Question, QuestionType } from '../types/quiz';
import { Plus, Trash2, CheckCircle2, Clock, HelpCircle, X, Save, Sparkles } from 'lucide-react';
import { AiQuizGenerator } from './AiQuizGenerator';
import { auth } from '../lib/firebase';

interface QuizEditorProps {
  quizToEdit?: Quiz | null;
  onSave: (quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quizToEdit, onSave, onClose }) => {
  const [title, setTitle] = useState(quizToEdit?.title || '');
  const [description, setDescription] = useState(quizToEdit?.description || '');
  const [subject, setSubject] = useState(quizToEdit?.subject || 'Ciências');
  const [questions, setQuestions] = useState<Question[]>(
    quizToEdit?.questions || [
      {
        id: 'q_' + Date.now(),
        type: 'boolean',
        question: '',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Verdadeiro',
        timeLimit: 20,
        points: 1000,
        explanation: '',
      },
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);

  const handleApplyAi = (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: Question[];
  }) => {
    if (data.title && !title.trim()) setTitle(data.title);
    if (data.subject && (!subject || subject === 'Ciências')) setSubject(data.subject);
    if (data.description && !description.trim()) setDescription(data.description);

    // If current questions list is only one empty placeholder, replace it; otherwise append
    if (questions.length === 1 && !questions[0].question.trim()) {
      setQuestions(data.questions);
    } else {
      setQuestions([...questions, ...data.questions]);
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      type,
      question: '',
      options: type === 'boolean' ? ['Verdadeiro', 'Falso'] : ['', '', '', ''],
      correctAnswer: type === 'boolean' ? 'Verdadeiro' : '',
      timeLimit: 20,
      points: 1000,
      explanation: '',
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMsg('O quiz deve conter pelo menos uma pergunta.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestionField = <K extends keyof Question>(index: number, field: K, value: Question[K]) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex].options = newOptions;

    // If current correct answer was changed, update it
    if (updated[qIndex].correctAnswer === updated[qIndex].options[optIndex]) {
      updated[qIndex].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título do quiz.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`A pergunta #${i + 1} precisa ter um enunciado.`);
        return;
      }
      if (q.type === 'multiple') {
        const hasEmptyOption = q.options.some((o) => !o.trim());
        if (hasEmptyOption) {
          setErrorMsg(`A pergunta #${i + 1} possui opções em branco.`);
          return;
        }
        if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
          setErrorMsg(`Selecione a resposta correta para a pergunta #${i + 1}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const currentUid = auth.currentUser?.uid || quizToEdit?.ownerId || 'guest';
      await onSave({
        ownerId: currentUid,
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        isPublic: false,
        questions,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar quiz no banco de dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-8 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">
              {quizToEdit ? 'Editar Quiz' : 'Criar Novo Quiz para a Turma'}
            </h3>
            <span className="text-xs text-slate-400">
              Configure as perguntas de Verdadeiro/Falso e Múltipla Escolha
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quiz Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Título do Quiz</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisão de Ciências - 7º Ano"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Disciplina / Matéria</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Ciências">Ciências</option>
                <option value="História">História</option>
                <option value="Geografia">Geografia</option>
                <option value="Matemática">Matemática</option>
                <option value="Português">Português</option>
                <option value="Conhecimentos Gerais">Conhecimentos Gerais</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Descrição ou Instruções aos Alunos</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Quiz de fixação rápida para a aula de hoje. Preste atenção no tempo!"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Perguntas ({questions.length})
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Criar / Colar com IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('boolean')}
                  className="px-3 py-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/80 hover:bg-sky-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ V/F</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('multiple')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/80 hover:bg-indigo-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Múltipla</span>
                </button>
              </div>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-mono text-xs flex items-center justify-center font-bold">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {q.type === 'boolean' ? 'Verdadeiro ou Falso' : 'Múltipla Escolha (4 opções)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Time limit selector */}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <select
                        value={q.timeLimit}
                        onChange={(e) => updateQuestionField(qIdx, 'timeLimit', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-md px-2 py-1"
                      >
                        <option value={10}>10s</option>
                        <option value={15}>15s</option>
                        <option value={20}>20s</option>
                        <option value={30}>30s</option>
                        <option value={45}>45s</option>
                        <option value={60}>60s</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      title="Excluir pergunta"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)}
                    placeholder="Enunciado da pergunta para o telão..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                {/* Answers / Options */}
                {q.type === 'boolean' ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {['Verdadeiro', 'Falso'].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => updateQuestionField(qIdx, 'correctAnswer', choice)}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-between transition-all ${
                          q.correctAnswer === choice
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span>{choice}</span>
                        {q.correctAnswer === choice && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctAnswer === opt && opt.length > 0;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={isCorrect}
                            onChange={() => updateQuestionField(qIdx, 'correctAnswer', opt)}
                            title="Marcar como resposta correta"
                            className="w-4 h-4 text-emerald-500 accent-emerald-500 cursor-pointer shrink-0 ml-1"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Opção ${String.fromCharCode(65 + optIdx)}`}
                            className="w-full bg-transparent text-sm text-white focus:outline-none"
                            required
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Explicação Pedagógica (exibida após a resposta no telão):</span>
                  </div>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                    placeholder="Ex: A camada de ozônio fica na estratosfera e filtra os raios UV."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Quiz'}</span>
            </button>
          </div>
        </form>
      </div>

      {isAiOpen && (
        <AiQuizGenerator
          onApplyQuestions={handleApplyAi}
          onClose={() => setIsAiOpen(false)}
        />
      )}
    </div>
  );
};
