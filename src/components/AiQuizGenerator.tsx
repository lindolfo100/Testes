import React, { useState } from 'react';
import { Question } from '../types/quiz';
import { parseEducationalTextToQuestions } from '../lib/quizParser';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';
import { AiGenerationFormat } from '../lib/geminiQuizService';
import { auth, resolveCurrentUid } from '../lib/firebase';
import { STORAGE_KEYS } from '../constants/storage';
import { AiStudioIllustration } from './BrandIllustrations';
import {
  Sparkle,
  CheckCircle,
  Trash,
  WarningCircle,
  ArrowClockwise,
  X,
  ArrowRight,
  Key,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface AiQuizGeneratorProps {
  onApplyQuestions: (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: Question[];
  }) => void;
  onClose: () => void;
}

const AI_FORMAT_OPTIONS: { id: AiGenerationFormat; label: string }[] = [
  { id: 'mixed', label: 'Misto Inteligente (Vários Formatos)' },
  { id: 'multiple', label: 'Múltipla Escolha' },
  { id: 'boolean', label: 'Verdadeiro ou Falso' },
  { id: 'short_answer', label: 'Resposta Curta' },
  { id: 'matching', label: 'Associação de Pares' },
  { id: 'ordering', label: 'Ordenação / Sequência' },
  { id: 'poll', label: 'Enquete de Opinião' },
  { id: 'open_ended', label: 'Discursiva / Reflexão' },
];

export const AiQuizGenerator: React.FC<AiQuizGeneratorProps> = ({
  onApplyQuestions,
  onClose,
}) => {
  const [mode, setMode] = useState<'paste' | 'topic'>('paste');
  const [inputText, setInputText] = useState('');
  const [questionFormat, setQuestionFormat] = useState<AiGenerationFormat>('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(20);

  // Chave pessoal do Gemini do professor (fica salva apenas neste dispositivo)
  const [userApiKey, setUserApiKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.USER_GEMINI_API_KEY) || '';
  });
  const [isConfiguringKey, setIsConfiguringKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyFeedback, setApiKeyFeedback] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    subject: string;
    description: string;
    questions: Question[];
  } | null>(null);

  const handleSaveApiKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = apiKeyInput.trim();
    if (!clean) {
      setApiKeyFeedback('Cole sua chave da API antes de salvar.');
      return;
    }
    if (clean.length < 15) {
      setApiKeyFeedback('Chave aparentemente incompleta. Copie o valor completo gerado no Google AI Studio.');
      return;
    }
    localStorage.setItem(STORAGE_KEYS.USER_GEMINI_API_KEY, clean);
    setUserApiKey(clean);
    setIsConfiguringKey(false);
    setApiKeyFeedback(null);
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem(STORAGE_KEYS.USER_GEMINI_API_KEY);
    setUserApiKey('');
    setApiKeyInput('');
    setIsConfiguringKey(false);
    setApiKeyFeedback(null);
  };

  const handleStartConfigKey = () => {
    setApiKeyInput(userApiKey);
    setIsConfiguringKey(true);
    setApiKeyFeedback(null);
  };

  const handleCancelConfigKey = () => {
    setIsConfiguringKey(false);
    setApiKeyFeedback(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setErrorMsg(
        mode === 'paste'
          ? 'Cole o conteúdo com perguntas e respostas.'
          : 'Informe o tema da aula.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const idToken = auth.currentUser
        ? await auth.currentUser.getIdToken().catch(() => null)
        : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Id': resolveCurrentUid(),
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      if (userApiKey.trim()) {
        headers['x-gemini-api-key'] = userApiKey.trim();
      }

      const response = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode,
          text: inputText.trim(),
          questionType: questionFormat,
          count: questionCount,
          defaultTimeLimit: timeLimit,
          apiKey: userApiKey.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar as questões.');
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Nenhuma pergunta identificada no texto fornecido.');
      }

      setGeneratedResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao conectar com o serviço.');
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
    const localFmt =
      questionFormat === 'boolean' || questionFormat === 'multiple' ? questionFormat : 'mixed';
    const parsed = parseEducationalTextToQuestions(inputText, localFmt, timeLimit);
    if (parsed.questions.length > 0) {
      setGeneratedResult(parsed);
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl my-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <AiStudioIllustration className="w-16 h-12 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkle size={16} weight="fill" className="text-amber-400" />
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 font-display">
                  Assistente Pedagógico IA
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Transforme textos ou temas em questionários interativos prontos para o telão
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assistente pedagógico IA"
            className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Banner de Quota e Chave Pessoal do Professor */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    userApiKey
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-750'
                  }`}
                >
                  <Key size={14} weight={userApiKey ? 'fill' : 'regular'} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-zinc-200">
                      {userApiKey ? 'Sua Cota Gemini Exclusiva' : 'Cota Padrão Compartilhada'}
                    </span>
                    {userApiKey ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        Ativa
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate sm:whitespace-normal">
                    {userApiKey
                      ? `Chave pessoal configurada (•••${userApiKey.slice(-4)}). Gerações sem fila ou limites compartilhados.`
                      : 'Conecte sua chave gratuita do Google AI Studio para usar seu próprio limite sem compartilhar com outros.'}
                  </p>
                </div>
              </div>

              {!isConfiguringKey && (
                <button
                  type="button"
                  onClick={handleStartConfigKey}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-medium border border-zinc-700 transition-colors shrink-0"
                >
                  {userApiKey ? 'Gerenciar Chave' : 'Conectar Chave'}
                </button>
              )}
            </div>

            {/* Painel de Configuração / Edição da Chave */}
            {isConfiguringKey && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-zinc-400">
                  <span>
                    Obtenha sua chave gratuita com sua conta Google:
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors underline underline-offset-2"
                  >
                    <span>Abrir Google AI Studio</span>
                    <ArrowSquareOut size={12} weight="bold" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Cole aqui sua chave (ex: AIzaSy...)"
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveApiKey()}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors shrink-0"
                    >
                      Salvar Chave
                    </button>
                    {userApiKey && (
                      <button
                        type="button"
                        onClick={handleRemoveApiKey}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs transition-colors shrink-0"
                        title="Remover chave e voltar para a cota compartilhada"
                      >
                        Remover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelConfigKey}
                      className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs transition-colors shrink-0"
                    >
                      Cancelar
                    </button>
                  </div>

                  {apiKeyFeedback && (
                    <p className="text-[11px] text-amber-300">{apiKeyFeedback}</p>
                  )}

                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Sua chave é salva somente no seu navegador (<code className="text-zinc-300">localStorage</code>) e enviada via canal seguro direto para o Gemini ao gerar questões. Nunca é compartilhada com outros usuários.
                  </p>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <WarningCircle size={15} weight="fill" className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
              {inputText.trim() && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLocalParse}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                  >
                    Estruturar localmente (100% offline)
                  </button>
                </div>
              )}
            </div>
          )}

          {!generatedResult ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Mode Tabs */}
              <div className="flex items-center p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
                    mode === 'paste'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Colar Questões / Anotações
                </button>
                <button
                  type="button"
                  onClick={() => setMode('topic')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
                    mode === 'topic'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Gerar por Tema da Aula
                </button>
              </div>

              {/* Text Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  {mode === 'paste' ? 'Conteúdo / Perguntas' : 'Tema da Aula'}
                </label>
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    mode === 'paste'
                      ? '1. O Sol é uma anã amarela. R: Verdadeiro\n2. Qual é a fórmula da água? R: H2O'
                      : 'Ex: Biomas brasileiros, clima e vegetação para o 7º ano do Ensino Fundamental.'
                  }
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-600 font-sans leading-relaxed placeholder:text-zinc-400"
                  required
                />
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Formato das questões
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AI_FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setQuestionFormat(fmt.id)}
                      className={`p-2 rounded-xl border text-center text-xs font-medium transition-all ${
                        questionFormat === fmt.id
                          ? 'bg-amber-500/15 border-amber-400/50 text-amber-300 font-semibold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Quantidade</span>
                    <span className="font-mono text-zinc-100 font-bold tabular-nums">{questionCount}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-300 block">Tempo limite</span>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-750 text-white text-xs focus:outline-none"
                  >
                    <option value={15}>15 segundos</option>
                    <option value={20}>20 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={45}>45 segundos</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-zinc-300 hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <ArrowClockwise size={14} weight="bold" className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkle size={14} weight="fill" />
                      <span>Estruturar Questões</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-zinc-300 text-xs">
                  <span>{generatedResult.subject}</span>
                  <span>
                    <strong className="font-mono tabular-nums">{generatedResult.questions.length}</strong> perguntas
                  </span>
                </div>
                <h4 className="font-semibold text-zinc-100">{generatedResult.title}</h4>
              </div>

              <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {generatedResult.questions.map((q, idx) => {
                  const meta = QUESTION_TYPES_META[q.type];
                  return (
                    <div
                      key={q.id || idx}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300 text-xs">
                          <strong className="font-mono tabular-nums">#{idx + 1}</strong> · {meta?.label || q.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          aria-label={`Remover questão ${idx + 1}`}
                          className="text-zinc-300 hover:text-rose-400 p-1.5 rounded-lg"
                        >
                          <Trash size={14} weight="regular" />
                        </button>
                      </div>

                      <p className="text-zinc-100 font-medium leading-snug">{q.question}</p>

                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctAnswer === opt && q.type !== 'poll';
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleUpdateCorrectAnswer(idx, opt)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <CheckCircle size={12} weight="fill" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'short_answer' && q.correctAnswer && (
                        <div className="text-[11px] font-mono text-emerald-400">
                          Gabarito: {q.correctAnswer}
                        </div>
                      )}

                      {q.type === 'matching' && q.pairs && (
                        <div className="grid grid-cols-1 gap-1 pt-1 text-[11px] text-zinc-400 font-mono">
                          {q.pairs.map((p, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between bg-zinc-900 px-2 py-1 rounded">
                              <span className="text-zinc-200">{p.left}</span>
                              <span>↔</span>
                              <span className="text-emerald-300">{p.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'ordering' && q.itemsOrder && (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono">
                          {q.itemsOrder.map((it, iIdx) => (
                            <span key={iIdx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                              {iIdx + 1}º {it}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setGeneratedResult(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <span>Inserir no Questionário ({generatedResult.questions.length})</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
