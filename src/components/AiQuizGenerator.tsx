import React, { useState } from 'react';
import { Question, QuestionType } from '../types/quiz';
import {
  Sparkles,
  ClipboardPaste,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AiQuizGeneratorProps {
  onApplyQuestions: (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: Question[];
  }) => void;
  onClose: () => void;
}

export const AiQuizGenerator: React.FC<AiQuizGeneratorProps> = ({
  onApplyQuestions,
  onClose,
}) => {
  const [mode, setMode] = useState<'paste' | 'topic'>('paste');
  const [inputText, setInputText] = useState('');
  const [questionFormat, setQuestionFormat] = useState<'mixed' | 'boolean' | 'multiple'>('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    subject: string;
    description: string;
    questions: Question[];
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg(
        mode === 'paste'
          ? 'Por favor, cole o texto ou perguntas que deseja organizar.'
          : 'Por favor, digite o tema da aula que deseja abordar.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          text: inputText.trim(),
          questionType: questionFormat,
          count: questionCount,
          defaultTimeLimit: timeLimit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar quiz com IA.');
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('A IA não conseguiu identificar perguntas suficientes no texto fornecido.');
      }

      setGeneratedResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao conectar com o serviço de IA Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    if (!generatedResult) return;
    const updated = generatedResult.questions.filter((_, i) => i !== idx);
    setGeneratedResult({ ...generatedResult, questions: updated });
  };

  const handleUpdateCorrectAnswer = (qIdx: number, newCorrect: string) => {
    if (!generatedResult) return;
    const updated = [...generatedResult.questions];
    updated[qIdx] = { ...updated[qIdx], correctAnswer: newCorrect };
    setGeneratedResult({ ...generatedResult, questions: updated });
  };

  const handleApply = () => {
    if (!generatedResult || generatedResult.questions.length === 0) return;
    onApplyQuestions(generatedResult);
    onClose();
  };

  const handleLocalParse = () => {
    if (!inputText.trim()) return;
    const lines = inputText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const questions: Question[] = [];
    let currentQ: any = null;

    for (const line of lines) {
      const qMatch = line.match(/^(\d+[\.\-\)]|pergunta\s*\d+:?|q\d+:?)\s*(.*)/i);
      const ansMatch = line.match(/^(r:|resposta:|gabarito:|correta:)\s*(.*)/i);

      if (qMatch) {
        if (currentQ) questions.push(currentQ);
        const isBool = questionFormat === 'boolean' || (questionFormat === 'mixed' && questions.length % 2 === 0);
        currentQ = {
          id: 'q_local_' + Date.now().toString(36) + '_' + questions.length,
          type: isBool ? 'boolean' : 'multiple',
          question: qMatch[2] || line,
          options: isBool ? ['Verdadeiro', 'Falso'] : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
          correctAnswer: isBool ? 'Verdadeiro' : 'Opção A',
          timeLimit,
          points: 1000,
          explanation: 'Questão organizada a partir do material colado.',
        };
      } else if (ansMatch && currentQ) {
        const ansVal = ansMatch[2].trim();
        if (currentQ.type === 'boolean') {
          currentQ.correctAnswer = ansVal.toLowerCase().includes('fals') ? 'Falso' : 'Verdadeiro';
        } else {
          currentQ.correctAnswer = ansVal;
          currentQ.options[0] = ansVal;
        }
        currentQ.explanation = `Resposta indicada pelo professor: ${ansVal}`;
      } else if (currentQ && !currentQ.question.includes('?')) {
        currentQ.question += ' ' + line;
      }
    }

    if (currentQ) questions.push(currentQ);

    if (questions.length === 0) {
      const paragraphs = inputText.split(/\n\s*\n/).filter((p) => p.trim().length > 8);
      paragraphs.forEach((p, idx) => {
        const isBool = questionFormat === 'boolean' || (questionFormat === 'mixed' && idx % 2 === 0);
        questions.push({
          id: 'q_local_' + Date.now().toString(36) + '_' + idx,
          type: isBool ? 'boolean' : 'multiple',
          question: p.trim(),
          options: isBool ? ['Verdadeiro', 'Falso'] : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
          correctAnswer: isBool ? 'Verdadeiro' : 'Opção A',
          timeLimit,
          points: 1000,
          explanation: 'Questão organizada a partir do texto.',
        });
      });
    }

    if (questions.length > 0) {
      setGeneratedResult({
        title: 'Quiz Organizado a partir do Texto',
        subject: 'Geral',
        description: 'Questões extraídas com fidelidade a partir do material colado.',
        questions,
      });
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl my-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Criar & Organizar com Gemini IA</span>
                <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                  IA com Multi-Fallback
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cole perguntas brutas ou informe o assunto para a IA estruturar seu quiz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente Agora</span>
                </button>
                {inputText.trim() && (
                  <button
                    type="button"
                    onClick={handleLocalParse}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                  >
                    Estruturar Texto Imediatamente (Modo Direto)
                  </button>
                )}
              </div>
            </div>
          )}

          {!generatedResult ? (
            /* CONFIGURATION & INPUT FORM */
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Mode Tabs */}
              <div className="flex items-center p-1 bg-slate-850 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    mode === 'paste'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Colar Texto / Perguntas e Respostas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('topic')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    mode === 'topic'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Gerar por Tema / Assunto</span>
                </button>
              </div>

              {/* Text Input Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>
                    {mode === 'paste'
                      ? 'Cole o conteúdo, anotações ou questões brutas:'
                      : 'Descreva o tema e detalhes desejados:'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {mode === 'paste' ? 'Fidelidade garantida' : 'Geração inteligente'}
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    mode === 'paste'
                      ? 'Exemplo de texto colado:\n1. O que é fotossíntese? Resposta: É o processo que as plantas usam luz solar para produzir glicose.\n2. O planeta mais próximo do Sol é Marte? Resposta: Falso, é Mercúrio.\n3. Qual é a fórmula da água? Resposta: H2O.'
                      : 'Exemplo: Revolução Industrial no século XVIII para o 8º ano do Ensino Fundamental. Foco nas consequências sociais e máquinas a vapor.'
                  }
                  className="w-full p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Format Selector: Verdadeiro/Falso, Múltipla Escolha ou Mistas */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Formato das Perguntas:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'mixed',
                      title: 'Mistas (Recomendado)',
                      desc: 'Verdadeiro/Falso e Múltipla Escolha',
                    },
                    {
                      id: 'boolean',
                      title: 'Apenas Verdadeiro ou Falso',
                      desc: 'Afirmações de fixação rápida (V/F)',
                    },
                    {
                      id: 'multiple',
                      title: 'Apenas Múltipla Escolha',
                      desc: '4 opções por questão (A, B, C, D)',
                    },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setQuestionFormat(fmt.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        questionFormat === fmt.id
                          ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className="font-bold text-white text-xs block mb-0.5">{fmt.title}</span>
                      <span className="text-[11px] text-slate-400 leading-tight block">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls: Count & Time Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Quantidade de Questões</span>
                    <span className="font-mono text-indigo-400 font-bold">{questionCount}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>2 questões</span>
                    <span>5</span>
                    <span>10 questões</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tempo sugerido por pergunta</span>
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={15}>15 segundos (rápido)</option>
                    <option value={20}>20 segundos (padrão)</option>
                    <option value={30}>30 segundos (moderado)</option>
                    <option value={45}>45 segundos (complexo)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Estruturando perguntas com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar & Organizar Questões</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* PREVIEW AND REFINEMENT VIEW */
            <div className="space-y-6">
              {/* Summary Bar */}
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-400 uppercase tracking-wider">
                    {generatedResult.subject || 'Disciplina Identificada'}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {generatedResult.questions.length} perguntas organizadas
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">{generatedResult.title}</h4>
                {generatedResult.description && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {generatedResult.description}
                  </p>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                {generatedResult.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {q.type === 'boolean' ? 'Verdadeiro ou Falso' : 'Múltipla Escolha'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">({q.timeLimit}s)</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        title="Remover pergunta"
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-white font-medium text-sm leading-snug">{q.question}</p>

                    {/* Options Preview */}
                    {q.type === 'boolean' ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {['Verdadeiro', 'Falso'].map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => handleUpdateCorrectAnswer(idx, choice)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                              q.correctAnswer === choice
                                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span>{choice}</span>
                            {q.correctAnswer === choice && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswer === opt;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleUpdateCorrectAnswer(idx, opt)}
                              className={`p-2 rounded-xl border text-xs text-left transition-colors flex items-center justify-between gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Pedagogical explanation */}
                    {q.explanation && (
                      <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-400 italic">
                        💡 Explicação: {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setGeneratedResult(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Voltar / Gerar Novamente</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-colors flex items-center gap-2"
                  >
                    <span>Inserir no Quiz ({generatedResult.questions.length} Questões)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
