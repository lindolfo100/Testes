import React, { useState } from 'react';
import { Quiz, Question, QuestionType, MatchingPair } from '../types/quiz';
import {
  Plus,
  Trash,
  CheckCircle,
  ClockCountdown,
  X,
  FloppyDisk,
  Sparkle,
  ArrowUp,
  ArrowDown,
  CaretDown,
  Trophy,
  ArrowsLeftRight,
  Image as ImageIcon,
  Video,
  Cloud,
  Article,
  CopySimple,
} from '@phosphor-icons/react';
import { AiQuizGenerator } from './AiQuizGenerator';
import { auth } from '../lib/firebase';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';

interface QuizEditorProps {
  quizToEdit?: Quiz | null;
  onSave: (quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

const ALL_QUESTION_TYPES: QuestionType[] = [
  'multiple',
  'boolean',
  'short_answer',
  'matching',
  'ordering',
  'image',
  'media',
  'word_cloud',
  'poll',
  'open_ended',
];

export const QuizEditor: React.FC<QuizEditorProps> = ({ quizToEdit, onSave, onClose }) => {
  const [title, setTitle] = useState(quizToEdit?.title || '');
  const [description, setDescription] = useState(quizToEdit?.description || '');
  const [subject, setSubject] = useState(quizToEdit?.subject || 'Ciências');
  const [questions, setQuestions] = useState<Question[]>(
    quizToEdit?.questions || [
      {
        id: 'q_' + Date.now(),
        type: 'multiple',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        timeLimit: 20,
        points: 1000,
        explanation: '',
      },
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const handleApplyAi = (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: Question[];
  }) => {
    if (data.title && !title.trim()) setTitle(data.title);
    if (data.subject && (!subject || subject === 'Ciências')) setSubject(data.subject);
    if (data.description && !description.trim()) setDescription(data.description);

    if (questions.length === 1 && !questions[0].question.trim()) {
      setQuestions(data.questions);
    } else {
      setQuestions([...questions, ...data.questions]);
    }
  };

  const createDefaultQuestion = (type: QuestionType): Question => {
    const id = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const base: Question = {
      id,
      type,
      question: '',
      timeLimit: type === 'media' ? 45 : type === 'open_ended' ? 60 : 20,
      points: ['poll', 'word_cloud', 'open_ended'].includes(type) ? 0 : 1000,
      explanation: '',
    };

    switch (type) {
      case 'boolean':
        return {
          ...base,
          options: ['Verdadeiro', 'Falso'],
          correctAnswer: 'Verdadeiro',
        };
      case 'multiple':
        return {
          ...base,
          options: ['', '', '', ''],
          correctAnswer: '',
        };
      case 'short_answer':
        return {
          ...base,
          correctAnswer: '',
          acceptedAnswers: [],
          placeholder: 'Digite a resposta correta...',
        };
      case 'matching':
        return {
          ...base,
          pairs: [
            { id: 'p1', left: '', right: '' },
            { id: 'p2', left: '', right: '' },
            { id: 'p3', left: '', right: '' },
          ],
        };
      case 'ordering':
        return {
          ...base,
          itemsOrder: ['', '', ''],
        };
      case 'image':
        return {
          ...base,
          mediaUrl: '',
          options: ['', '', '', ''],
          correctAnswer: '',
        };
      case 'media':
        return {
          ...base,
          mediaType: 'video',
          mediaUrl: '',
          options: ['', '', '', ''],
          correctAnswer: '',
        };
      case 'word_cloud':
        return {
          ...base,
          placeholder: 'Em uma palavra...',
        };
      case 'poll':
        return {
          ...base,
          options: ['', '', ''],
        };
      case 'open_ended':
        return {
          ...base,
          placeholder: 'Escreva sua resposta elaborada aqui...',
        };
      default:
        return base;
    }
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions([...questions, createDefaultQuestion(type)]);
    setIsTypeDropdownOpen(false);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMsg('O questionário deve conter pelo menos uma questão.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    setQuestions(updated);
  };

  const duplicateQuestion = (index: number) => {
    const source = questions[index];
    const clone: Question = {
      ...source,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      options: source.options ? [...source.options] : undefined,
      acceptedAnswers: source.acceptedAnswers ? [...source.acceptedAnswers] : undefined,
      itemsOrder: source.itemsOrder ? [...source.itemsOrder] : undefined,
      pairs: source.pairs
        ? source.pairs.map((p, i) => ({
            ...p,
            id: `p_${Date.now().toString(36)}_${i}`,
          }))
        : undefined,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, clone);
    setQuestions(updated);
  };

  const updateQuestionField = <K extends keyof Question>(index: number, field: K, value: Question[K]) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const changeQuestionType = (qIndex: number, newType: QuestionType) => {
    const current = questions[qIndex];
    if (current.type === newType) return;

    const fresh = createDefaultQuestion(newType);
    const updated = [...questions];
    updated[qIndex] = {
      ...fresh,
      id: current.id,
      question: current.question,
      timeLimit: current.timeLimit,
      points: ['poll', 'word_cloud', 'open_ended'].includes(newType) ? 0 : (current.points || 1000),
      explanation: current.explanation,
    };
    setQuestions(updated);
  };

  // Option operations (Multiple / Image / Media / Poll)
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...(updated[qIndex].options || [])];
    newOptions[optIndex] = value;
    updated[qIndex].options = newOptions;

    if (updated[qIndex].correctAnswer === updated[qIndex].options?.[optIndex]) {
      updated[qIndex].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    if (currentOptions.length >= 6) return;
    updated[qIndex].options = [...currentOptions, ''];
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    if (currentOptions.length <= 2) return;
    const removedValue = currentOptions[optIndex];
    const newOptions = currentOptions.filter((_, i) => i !== optIndex);
    updated[qIndex].options = newOptions;
    if (updated[qIndex].correctAnswer === removedValue) {
      updated[qIndex].correctAnswer = '';
    }
    setQuestions(updated);
  };

  // Matching Pairs operations
  const updatePair = (qIndex: number, pairIndex: number, side: 'left' | 'right', value: string) => {
    const updated = [...questions];
    const currentPairs = [...(updated[qIndex].pairs || [])];
    currentPairs[pairIndex] = { ...currentPairs[pairIndex], [side]: value };
    updated[qIndex].pairs = currentPairs;
    setQuestions(updated);
  };

  const addPair = (qIndex: number) => {
    const updated = [...questions];
    const currentPairs = updated[qIndex].pairs || [];
    if (currentPairs.length >= 6) return;
    updated[qIndex].pairs = [
      ...currentPairs,
      { id: 'p_' + Date.now().toString(36), left: '', right: '' },
    ];
    setQuestions(updated);
  };

  const removePair = (qIndex: number, pairIndex: number) => {
    const updated = [...questions];
    const currentPairs = updated[qIndex].pairs || [];
    if (currentPairs.length <= 2) return;
    updated[qIndex].pairs = currentPairs.filter((_, i) => i !== pairIndex);
    setQuestions(updated);
  };

  // Ordering operations
  const updateOrderItem = (qIndex: number, itemIndex: number, value: string) => {
    const updated = [...questions];
    const items = [...(updated[qIndex].itemsOrder || [])];
    items[itemIndex] = value;
    updated[qIndex].itemsOrder = items;
    setQuestions(updated);
  };

  const moveOrderItem = (qIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const updated = [...questions];
    const items = [...(updated[qIndex].itemsOrder || [])];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[itemIndex];
    items[itemIndex] = items[targetIndex];
    items[targetIndex] = temp;
    updated[qIndex].itemsOrder = items;
    setQuestions(updated);
  };

  const addOrderItem = (qIndex: number) => {
    const updated = [...questions];
    const items = updated[qIndex].itemsOrder || [];
    if (items.length >= 6) return;
    updated[qIndex].itemsOrder = [...items, ''];
    setQuestions(updated);
  };

  const removeOrderItem = (qIndex: number, itemIndex: number) => {
    const updated = [...questions];
    const items = updated[qIndex].itemsOrder || [];
    if (items.length <= 2) return;
    updated[qIndex].itemsOrder = items.filter((_, i) => i !== itemIndex);
    setQuestions(updated);
  };

  // Form Validation & Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Informe o título do questionário.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      if (!q.question.trim()) {
        setErrorMsg(`A questão #${qNum} precisa de um enunciado.`);
        return;
      }

      switch (q.type) {
        case 'multiple':
        case 'image':
        case 'media': {
          const opts = q.options || [];
          if (opts.length < 2 || opts.some((o) => !o.trim())) {
            setErrorMsg(`A questão #${qNum} possui opções de resposta em branco.`);
            return;
          }
          if (!q.correctAnswer || !opts.includes(q.correctAnswer)) {
            setErrorMsg(`Selecione a resposta correta da questão #${qNum}.`);
            return;
          }
          if (q.type === 'image' && !q.mediaUrl?.trim()) {
            setErrorMsg(`Insira a URL da imagem na questão #${qNum}.`);
            return;
          }
          if (q.type === 'media' && !q.mediaUrl?.trim()) {
            setErrorMsg(`Insira a URL do vídeo ou áudio na questão #${qNum}.`);
            return;
          }
          break;
        }

        case 'boolean': {
          if (!q.correctAnswer || !['Verdadeiro', 'Falso'].includes(q.correctAnswer)) {
            setErrorMsg(`Defina se a afirmação da questão #${qNum} é Verdadeira ou Falsa.`);
            return;
          }
          break;
        }

        case 'short_answer': {
          if (!q.correctAnswer?.trim() && (!q.acceptedAnswers || q.acceptedAnswers.length === 0)) {
            setErrorMsg(`Defina a resposta correta esperada para a questão #${qNum}.`);
            return;
          }
          break;
        }

        case 'matching': {
          const pairs = q.pairs || [];
          if (pairs.length < 2 || pairs.some((p) => !p.left.trim() || !p.right.trim())) {
            setErrorMsg(`Complete os pares de associação na questão #${qNum} (ambos os lados).`);
            return;
          }
          break;
        }

        case 'ordering': {
          const items = q.itemsOrder || [];
          if (items.length < 2 || items.some((it) => !it.trim())) {
            setErrorMsg(`Preencha todos os itens da sequência na questão #${qNum}.`);
            return;
          }
          break;
        }

        case 'poll': {
          const opts = q.options || [];
          if (opts.length < 2 || opts.some((o) => !o.trim())) {
            setErrorMsg(`A enquete #${qNum} precisa de pelo menos 2 alternativas preenchidas.`);
            return;
          }
          break;
        }

        case 'word_cloud':
        case 'open_ended':
          // Apenas o enunciado é obrigatório
          break;
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
      setErrorMsg('Erro ao salvar questionário no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl my-4 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {quizToEdit ? 'Editar Questionário' : 'Novo Questionário'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Configure as questões, formatos interativos e gabarito.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-rose-400 hover:text-rose-200"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          )}

          {/* Details Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Título do Quiz</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revolução Francesa ou Ecologia Geral"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-600"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Disciplina</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-600"
              >
                <option value="Ciências">Ciências</option>
                <option value="História">História</option>
                <option value="Geografia">Geografia</option>
                <option value="Matemática">Matemática</option>
                <option value="Português">Português</option>
                <option value="Biologia">Biologia</option>
                <option value="Física">Física</option>
                <option value="Química">Química</option>
                <option value="Conhecimentos Gerais">Conhecimentos Gerais</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-zinc-400 uppercase">Instruções para a Turma</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Rodada relâmpago de revisão antes da prova bimestral"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-3 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">
                  Questões ({questions.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">10 formatos suportados</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAiOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium flex items-center gap-1.5 border border-zinc-700/60 transition-colors"
                >
                  <Sparkle size={13} weight="regular" />
                  <span>Gerador IA</span>
                </button>

                {/* Add Question Dropdown with all 10 formats */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus size={13} weight="bold" />
                    <span>Adicionar Questão</span>
                    <CaretDown size={11} weight="bold" className={`transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTypeDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-30 space-y-0.5">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                        Selecione o Formato
                      </div>
                      {ALL_QUESTION_TYPES.map((typeKey) => {
                        const meta = QUESTION_TYPES_META[typeKey];
                        const Icon = meta.icon;
                        return (
                          <button
                            key={typeKey}
                            type="button"
                            onClick={() => addQuestion(typeKey)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center gap-2.5 text-zinc-300 hover:text-white transition-colors group"
                          >
                            <span className="p-1 rounded bg-zinc-900 group-hover:bg-zinc-800 text-zinc-400 group-hover:text-zinc-100">
                              <Icon size={14} weight="bold" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{meta.label}</div>
                              <div className="text-[10px] text-zinc-500 truncate">{meta.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const currentMeta = QUESTION_TYPES_META[q.type] || QUESTION_TYPES_META.multiple;
                const CurrentIcon = currentMeta.icon;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-800 space-y-3 text-xs transition-colors"
                  >
                    {/* Question Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 font-semibold text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                          #{qIdx + 1}
                        </span>

                        {/* Format Switcher */}
                        <div className="relative flex items-center">
                          <select
                            value={q.type}
                            onChange={(e) => changeQuestionType(qIdx, e.target.value as QuestionType)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-1 text-xs text-zinc-200 font-medium focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none"
                          >
                            {ALL_QUESTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {QUESTION_TYPES_META[t].label}
                              </option>
                            ))}
                          </select>
                          <span className="absolute left-2 pointer-events-none text-zinc-400">
                            <CurrentIcon size={13} weight="bold" />
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Time limit */}
                        <div className="flex items-center gap-1 text-[11px] bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                          <ClockCountdown size={13} weight="regular" className="text-zinc-400" />
                          <select
                            value={q.timeLimit}
                            onChange={(e) => updateQuestionField(qIdx, 'timeLimit', Number(e.target.value))}
                            className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
                          >
                            <option value={10}>10s</option>
                            <option value={15}>15s</option>
                            <option value={20}>20s</option>
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>60s</option>
                            <option value={90}>90s</option>
                          </select>
                        </div>

                        {/* Points */}
                        <div className="flex items-center gap-1 text-[11px] bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                          <Trophy size={13} weight="regular" className="text-zinc-400" />
                          <select
                            value={q.points}
                            onChange={(e) => updateQuestionField(qIdx, 'points', Number(e.target.value))}
                            className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
                          >
                            <option value={1000}>1000 pts</option>
                            <option value={2000}>2000 pts (Dobro)</option>
                            <option value={500}>500 pts</option>
                            <option value={0}>0 pts (Participação)</option>
                          </select>
                        </div>

                        {/* Reorder & Duplicate Actions */}
                        <div className="flex items-center gap-0.5 bg-zinc-900 px-1 py-0.5 rounded-lg border border-zinc-800">
                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => moveQuestion(qIdx, 'up')}
                            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30 p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Mover questão para cima"
                          >
                            <ArrowUp size={13} weight="bold" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === questions.length - 1}
                            onClick={() => moveQuestion(qIdx, 'down')}
                            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30 p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Mover questão para baixo"
                          >
                            <ArrowDown size={13} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateQuestion(qIdx)}
                            className="text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Duplicar questão"
                          >
                            <CopySimple size={13} weight="bold" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-zinc-900 transition-colors"
                          title="Remover questão"
                        >
                          <Trash size={15} weight="regular" />
                        </button>
                      </div>
                    </div>

                    {/* Enunciado */}
                    <div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)}
                        placeholder={`Enunciado da pergunta (${currentMeta.label})...`}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-zinc-700 font-medium placeholder-zinc-600"
                        required
                      />
                    </div>

                    {/* CONDITIONAL FORMAT CONFIGURATIONS */}

                    {/* 1. MÚLTIPLA ESCOLHA */}
                    {q.type === 'multiple' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Marque o botão de opção correspondente à resposta correta:</span>
                          {(q.options || []).length < 6 && (
                            <button
                              type="button"
                              onClick={() => addOption(qIdx)}
                              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                            >
                              <Plus size={11} weight="bold" />
                              <span>Adicionar alternativa</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isCorrect = q.correctAnswer === opt && opt.length > 0;
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-950/30 border-emerald-500/40'
                                    : 'bg-zinc-900 border-zinc-800'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_${q.id}`}
                                  checked={isCorrect}
                                  onChange={() => updateQuestionField(qIdx, 'correctAnswer', opt)}
                                  className="w-3.5 h-3.5 text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                                  title="Marcar como correta"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                  placeholder={`Alternativa ${String.fromCharCode(65 + optIdx)}`}
                                  className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none font-medium"
                                  required
                                />
                                {(q.options || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIdx, optIdx)}
                                    className="text-zinc-600 hover:text-rose-400 shrink-0"
                                  >
                                    <X size={12} weight="bold" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. VERDADEIRO OU FALSO */}
                    {q.type === 'boolean' && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] text-zinc-500">
                          Selecione o gabarito oficial da afirmação:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {['Verdadeiro', 'Falso'].map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => updateQuestionField(qIdx, 'correctAnswer', choice)}
                              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                                q.correctAnswer === choice
                                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-750'
                              }`}
                            >
                              <span>{choice}</span>
                              {q.correctAnswer === choice && (
                                <CheckCircle size={15} weight="fill" className="text-emerald-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. RESPOSTA CURTA */}
                    {q.type === 'short_answer' && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">
                              Resposta Correta Principal
                            </label>
                            <input
                              type="text"
                              value={q.correctAnswer || ''}
                              onChange={(e) => updateQuestionField(qIdx, 'correctAnswer', e.target.value)}
                              placeholder="Ex: Fotossíntese"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700 font-medium"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">
                              Variações / Sinônimos Aceitos (separados por vírgula)
                            </label>
                            <input
                              type="text"
                              value={(q.acceptedAnswers || []).join(', ')}
                              onChange={(e) => {
                                const list = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                updateQuestionField(qIdx, 'acceptedAnswers', list);
                              }}
                              placeholder="Ex: fotossintese, processo de fotossíntese"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          O sistema ignora automaticamente diferenças entre maiúsculas, minúsculas e acentos na conferência.
                        </p>
                      </div>
                    )}

                    {/* 4. ASSOCIAÇÃO DE PARES */}
                    {q.type === 'matching' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Associe cada conceito da esquerda à sua definição correspondente na direita:</span>
                          {(q.pairs || []).length < 6 && (
                            <button
                              type="button"
                              onClick={() => addPair(qIdx)}
                              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                            >
                              <Plus size={11} weight="bold" />
                              <span>Adicionar par</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {(q.pairs || []).map((pair, pIdx) => (
                            <div key={pair.id || pIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={pair.left}
                                onChange={(e) => updatePair(qIdx, pIdx, 'left', e.target.value)}
                                placeholder={`Item ${pIdx + 1} (ex: Amazônia)`}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700 font-medium"
                                required
                              />
                              <ArrowsLeftRight size={14} weight="regular" className="text-zinc-500 shrink-0" />
                              <input
                                type="text"
                                value={pair.right}
                                onChange={(e) => updatePair(qIdx, pIdx, 'right', e.target.value)}
                                placeholder={`Correspondente ${pIdx + 1} (ex: Maior floresta tropical)`}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700 font-medium"
                                required
                              />
                              {(q.pairs || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removePair(qIdx, pIdx)}
                                  className="text-zinc-600 hover:text-rose-400 p-1 shrink-0"
                                >
                                  <Trash size={13} weight="regular" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. ORDENAÇÃO OU CLASSIFICAÇÃO */}
                    {q.type === 'ordering' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Escreva os itens na <strong>ordem correta</strong> (o aluno receberá embaralhado):</span>
                          {(q.itemsOrder || []).length < 6 && (
                            <button
                              type="button"
                              onClick={() => addOrderItem(qIdx)}
                              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                            >
                              <Plus size={11} weight="bold" />
                              <span>Adicionar etapa</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {(q.itemsOrder || []).map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-2">
                              <span className="font-mono text-[10px] w-5 text-center text-zinc-400 font-semibold">
                                {itemIdx + 1}º
                              </span>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => updateOrderItem(qIdx, itemIdx, e.target.value)}
                                placeholder={`Etapa ${itemIdx + 1}...`}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700 font-medium"
                                required
                              />
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={itemIdx === 0}
                                  onClick={() => moveOrderItem(qIdx, itemIdx, 'up')}
                                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                                >
                                  <ArrowUp size={12} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  disabled={itemIdx === (q.itemsOrder || []).length - 1}
                                  onClick={() => moveOrderItem(qIdx, itemIdx, 'down')}
                                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                                >
                                  <ArrowDown size={12} weight="bold" />
                                </button>
                                {(q.itemsOrder || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOrderItem(qIdx, itemIdx)}
                                    className="p-1 text-zinc-600 hover:text-rose-400"
                                  >
                                    <Trash size={13} weight="regular" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. PERGUNTA COM IMAGEM */}
                    {q.type === 'image' && (
                      <div className="space-y-2.5 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">
                            URL da Imagem de Estímulo
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={q.mediaUrl || ''}
                              onChange={(e) => updateQuestionField(qIdx, 'mediaUrl', e.target.value)}
                              placeholder="https://exemplo.com/grafico-ou-mapa.jpg"
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-700 font-mono"
                              required
                            />
                            {q.mediaUrl && (
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                                <img
                                  src={q.mediaUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-zinc-500">Alternativas da questão:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = q.correctAnswer === opt && opt.length > 0;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                    isCorrect ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-zinc-900 border-zinc-800'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={isCorrect}
                                    onChange={() => updateQuestionField(qIdx, 'correctAnswer', opt)}
                                    className="w-3.5 h-3.5 text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                    placeholder={`Opção ${String.fromCharCode(65 + optIdx)}`}
                                    className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                                    required
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7. PERGUNTA COM VÍDEO OU ÁUDIO */}
                    {q.type === 'media' && (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">
                              Tipo de Mídia
                            </label>
                            <select
                              value={q.mediaType || 'video'}
                              onChange={(e) => updateQuestionField(qIdx, 'mediaType', e.target.value as any)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
                            >
                              <option value="video">Vídeo (YouTube / MP4)</option>
                              <option value="audio">Áudio (MP3 / Podcast)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">
                              URL do Arquivo ou Vídeo
                            </label>
                            <input
                              type="url"
                              value={q.mediaUrl || ''}
                              onChange={(e) => updateQuestionField(qIdx, 'mediaUrl', e.target.value)}
                              placeholder="https://exemplo.com/audio.mp3 ou link do YouTube"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none font-mono"
                              required
                            />
                          </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-zinc-500">Alternativas da questão:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = q.correctAnswer === opt && opt.length > 0;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                    isCorrect ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-zinc-900 border-zinc-800'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={isCorrect}
                                    onChange={() => updateQuestionField(qIdx, 'correctAnswer', opt)}
                                    className="w-3.5 h-3.5 text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                    placeholder={`Opção ${String.fromCharCode(65 + optIdx)}`}
                                    className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                                    required
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8. NUVEM DE PALAVRAS */}
                    {q.type === 'word_cloud' && (
                      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                        <div className="flex items-center gap-2 text-zinc-300 font-medium">
                          <Cloud size={15} weight="bold" className="text-zinc-400" />
                          <span>Nuvem de Palavras Coletiva</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Cada participante digita uma palavra ou expressão. As respostas aparecerão agrupadas visualmente no telão da sala, com destaque tipográfico para os termos mais votados.
                        </p>
                      </div>
                    )}

                    {/* 9. ENQUETE OU VOTAÇÃO */}
                    {q.type === 'poll' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Opções da enquete (votação de opinião, sem resposta certa/errada):</span>
                          {(q.options || []).length < 6 && (
                            <button
                              type="button"
                              onClick={() => addOption(qIdx)}
                              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                            >
                              <Plus size={11} weight="bold" />
                              <span>Adicionar opção</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-zinc-900 border-zinc-800"
                            >
                              <span className="font-mono text-[10px] text-zinc-500 w-4">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Opção de voto ${optIdx + 1}`}
                                className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                                required
                              />
                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(qIdx, optIdx)}
                                  className="text-zinc-600 hover:text-rose-400 shrink-0"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 10. RESPOSTA ABERTA OU DISCURSIVA */}
                    {q.type === 'open_ended' && (
                      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                        <div className="flex items-center gap-2 text-zinc-300 font-medium">
                          <Article size={15} weight="bold" className="text-zinc-400" />
                          <span>Resposta Aberta / Discursiva</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          O participante redige uma resposta elaborada justificando sua reflexão. As respostas são projetadas em cartões individuais na tela de resultados para mediação do professor.
                        </p>
                      </div>
                    )}

                    {/* Justificativa / Explicação pedagógica */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                        placeholder="Comentário ou dica pedagógica exibida após o fechamento da questão..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-850 text-[11px] text-zinc-400 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Save & Cancel */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-zinc-500 font-mono">
              {questions.length} questão(ões) configurada(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <FloppyDisk size={14} weight="bold" />
                <span>{isSubmitting ? 'Salvando...' : 'Salvar Questionário'}</span>
              </button>
            </div>
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
