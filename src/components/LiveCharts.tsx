import React, { useMemo } from 'react';
import { Question, Answer } from '../types/quiz';
import { MULTIPLE_CHOICE_THEMES } from '../constants/quizTheme';
import { getYouTubeEmbedUrl, shuffleItems } from '../lib/quizHelpers';
import {
  CheckCircle,
  XCircle,
  SpeakerHigh,
  ArrowsLeftRight,
  ChatText,
  Article,
  Cloud,
  LockSimple,
  ListNumbers,
} from '@phosphor-icons/react';

interface LiveChartsProps {
  question: Question;
  answers: Answer[];
  showCorrect: boolean;
}

export const LiveCharts: React.FC<LiveChartsProps> = ({ question, answers, showCorrect }) => {
  const totalAnswers = answers.length;

  // Shuffled views for projector when question is active (so projector doesn't leak answer key)
  const shuffledRightPairs = useMemo(() => {
    if (!question.pairs) return [];
    return shuffleItems(question.pairs.map((p) => p.right));
  }, [question.id, question.pairs]);

  const shuffledOrderingItems = useMemo(() => {
    if (!question.itemsOrder) return [];
    return shuffleItems(question.itemsOrder);
  }, [question.id, question.itemsOrder]);

  // 1. FORMATO: VERDADEIRO OU FALSO
  if (question.type === 'boolean') {
    const countV = answers.filter((a) => a.answer === 'Verdadeiro').length;
    const countF = answers.filter((a) => a.answer === 'Falso').length;

    const pctV = totalAnswers > 0 ? Math.round((countV / totalAnswers) * 100) : 0;
    const pctF = totalAnswers > 0 ? Math.round((countF / totalAnswers) * 100) : 0;

    const isCorrectV = question.correctAnswer === 'Verdadeiro';
    const isCorrectF = question.correctAnswer === 'Falso';

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* VERDADEIRO */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              showCorrect
                ? isCorrectV
                  ? 'bg-emerald-950/25 border-emerald-500/50 shadow-sm'
                  : 'bg-zinc-900/25 border-zinc-800/50 opacity-65'
                : 'bg-zinc-900/50 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-xl font-mono font-bold text-sm flex items-center justify-center ${
                    showCorrect && isCorrectV
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  V
                </span>
                <span className="telao-option text-zinc-100">Verdadeiro</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-zinc-100 font-mono tabular-nums">{countV}</span>
                <span className="text-xs text-zinc-500 ml-1.5 font-mono tabular-nums">({pctV}%)</span>
              </div>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  showCorrect && isCorrectV ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
                style={{ width: `${Math.max(pctV, countV > 0 ? 4 : 0)}%` }}
              />
            </div>

            {showCorrect && (
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                {isCorrectV ? (
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={14} weight="fill" />
                    <span>Afirmação Verdadeira</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <XCircle size={14} weight="regular" />
                    <span>Incorreto</span>
                  </span>
                )}
                <span className="font-mono text-[11px] text-zinc-500">{countV} votos</span>
              </div>
            )}
          </div>

          {/* FALSO */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              showCorrect
                ? isCorrectF
                  ? 'bg-emerald-950/25 border-emerald-500/50 shadow-sm'
                  : 'bg-zinc-900/25 border-zinc-800/50 opacity-65'
                : 'bg-zinc-900/50 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-xl font-mono font-bold text-sm flex items-center justify-center ${
                    showCorrect && isCorrectF
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  F
                </span>
                <span className="telao-option text-zinc-100">Falso</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-zinc-100 font-mono tabular-nums">{countF}</span>
                <span className="text-xs text-zinc-500 ml-1.5 font-mono tabular-nums">({pctF}%)</span>
              </div>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  showCorrect && isCorrectF ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
                style={{ width: `${Math.max(pctF, countF > 0 ? 4 : 0)}%` }}
              />
            </div>

            {showCorrect && (
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                {isCorrectF ? (
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={14} weight="fill" />
                    <span>Afirmação Falsa</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <XCircle size={14} weight="regular" />
                    <span>Incorreto</span>
                  </span>
                )}
                <span className="font-mono text-[11px] text-zinc-500">{countF} votos</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. FORMATO: RESPOSTA CURTA / CAMPO DE TEXTO
  if (question.type === 'short_answer') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        {showCorrect && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400/80 block">
              Termo Oficial Esperado
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono">
              {question.correctAnswer}
            </div>
            {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
              <p className="text-[11px] text-zinc-400 pt-0.5">
                Variações aceitas: <span className="text-zinc-300 font-mono">{question.acceptedAnswers.join(', ')}</span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-mono">
            <span>Respostas recebidas ({answers.length})</span>
            {!showCorrect && answers.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <LockSimple size={12} weight="bold" />
                <span>Ocultas até o encerramento</span>
              </span>
            )}
          </div>

          {answers.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center text-xs text-zinc-500">
              Os participantes estão digitando suas respostas pelo celular...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {answers.map((a, i) => (
                <div
                  key={a.id || i}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    showCorrect
                      ? a.isCorrect
                        ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {showCorrect ? (
                      a.isCorrect ? (
                        <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={15} weight="fill" className="text-rose-400 shrink-0" />
                      )
                    ) : (
                      <ChatText size={14} weight="regular" className="text-zinc-500 shrink-0" />
                    )}
                    <span className="font-semibold truncate">
                      {showCorrect ? String(a.answer) : 'Resposta registrada'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-2">
                    {a.playerNickname}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. FORMATO: ASSOCIAÇÃO DE PARES
  if (question.type === 'matching') {
    const correctCount = answers.filter((a) => a.isCorrect).length;

    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-mono">
          <span className="uppercase tracking-wider text-[11px] text-zinc-500">
            {showCorrect ? 'Gabarito de Associações' : 'Relacione as Colunas no Celular'}
          </span>
          {showCorrect && (
            <span className="text-emerald-400 font-semibold">
              {correctCount}/{totalAnswers} acertaram todos os pares
            </span>
          )}
        </div>

        {showCorrect ? (
          <div className="grid grid-cols-1 gap-2.5">
            {question.pairs?.map((pair, idx) => (
              <div
                key={pair.id || idx}
                className="p-3.5 rounded-2xl border bg-emerald-950/20 border-emerald-500/40 text-zinc-100 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <span className="font-bold text-zinc-100">{pair.left}</span>
                <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
                  <ArrowsLeftRight size={16} weight="bold" />
                </div>
                <span className="text-emerald-200 font-medium text-right">{pair.right}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 block">
                Coluna A · Conceitos
              </span>
              {question.pairs?.map((pair, idx) => (
                <div
                  key={pair.id || idx}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-100 font-semibold text-xs sm:text-sm"
                >
                  {pair.left}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 block">
                Coluna B · Correspondências
              </span>
              {shuffledRightPairs.map((rightText, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/35 border border-zinc-800/70 text-zinc-300 text-xs sm:text-sm"
                >
                  {rightText}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. FORMATO: ORDENAÇÃO OU CLASSIFICAÇÃO
  if (question.type === 'ordering') {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const displayItems = showCorrect ? question.itemsOrder || [] : shuffledOrderingItems;

    return (
      <div className="w-full max-w-3xl mx-auto space-y-3.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-mono">
          <span className="uppercase tracking-wider text-[11px] text-zinc-500">
            {showCorrect ? 'Sequência Oficial Correta' : 'Ordene os Itens no Celular'}
          </span>
          {showCorrect && (
            <span className="text-emerald-400 font-semibold">
              {correctCount}/{totalAnswers} acertaram a ordem exata
            </span>
          )}
        </div>

        <div className="space-y-2">
          {displayItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm transition-all ${
                showCorrect
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-100'
                  : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'
              }`}
            >
              {showCorrect ? (
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 font-mono font-bold text-xs flex items-center justify-center text-emerald-300 shrink-0">
                  {idx + 1}º
                </span>
              ) : (
                <span className="w-6 h-6 rounded-lg bg-zinc-800 font-mono text-xs flex items-center justify-center text-zinc-400 shrink-0">
                  <ListNumbers size={13} weight="bold" />
                </span>
              )}
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. FORMATO: NUVEM DE PALAVRAS (WORD CLOUD)
  if (question.type === 'word_cloud') {
    const wordCounts: Record<string, number> = {};
    answers.forEach((ans) => {
      const clean = String(ans.answer || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      wordCounts[key] = (wordCounts[key] || 0) + 1;
    });

    const entries = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    const maxFreq = entries[0] ? entries[0][1] : 1;

    return (
      <div className="w-full max-w-4xl mx-auto p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-zinc-800/60 font-mono">
          <div className="flex items-center gap-1.5">
            <Cloud size={15} weight="regular" className="text-zinc-400" />
            <span>Nuvem de Palavras em Tempo Real</span>
          </div>
          <span>{answers.length} participações</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            Aguardando envio das palavras pelos participantes...
          </div>
        ) : (
          <div className="py-6 flex flex-wrap items-center justify-center gap-3 min-h-[160px]">
            {entries.map(([word, count], i) => {
              const weightRatio = count / maxFreq;
              const sizeStyle =
                weightRatio > 0.75
                  ? 'text-xl sm:text-2xl font-extrabold text-zinc-100 bg-zinc-800/90 px-4 py-2 border-zinc-600 shadow-sm'
                  : weightRatio > 0.4
                  ? 'text-base sm:text-lg font-bold text-zinc-200 bg-zinc-850 px-3.5 py-1.5 border-zinc-700'
                  : 'text-xs sm:text-sm font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 border-zinc-800';

              return (
                <div
                  key={i}
                  className={`rounded-xl border transition-all flex items-center gap-2 ${sizeStyle}`}
                >
                  <span className="capitalize">{word}</span>
                  {count > 1 && (
                    <span className="text-[10px] font-mono bg-zinc-950/70 px-1.5 py-0.5 rounded text-emerald-400 font-bold">
                      {count}x
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 10. FORMATO: RESPOSTA ABERTA OU DISCURSIVA
  if (question.type === 'open_ended') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
          <div className="flex items-center gap-1.5">
            <Article size={15} weight="regular" />
            <span>Mural de Respostas Discursivas</span>
          </div>
          <span>{answers.length} envios</span>
        </div>

        {answers.length === 0 ? (
          <div className="p-10 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center text-xs text-zinc-500">
            Aguardando os estudantes elaborarem suas respostas...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {answers.map((a, i) => (
              <div
                key={a.id || i}
                className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono border-b border-zinc-800/50 pb-1.5">
                  <span className="font-semibold text-zinc-300">{a.playerNickname}</span>
                  <span>#{i + 1}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed">{String(a.answer)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 1, 6, 7, 9. FORMATOS COM ALTERNATIVAS (Múltipla Escolha, Imagem, Mídia, Enquete)
  const isPoll = question.type === 'poll';
  const options = question.options || [];
  const youtubeEmbedUrl = getYouTubeEmbedUrl(question.mediaUrl);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Visualização de Mídia (Imagem, Vídeo YouTube/MP4 ou Áudio) no Telão */}
      {question.mediaUrl && (
        <div className="max-w-xl mx-auto illustration-frame rounded-2xl overflow-hidden bg-zinc-950/90 shadow-md">
          {question.mediaType === 'image' || question.type === 'image' ? (
            <img
              src={question.mediaUrl}
              alt="Estímulo visual da questão"
              className="w-full max-h-64 sm:max-h-72 object-contain mx-auto p-2"
            />
          ) : question.mediaType === 'audio' ? (
            <div className="p-4 flex items-center gap-3 bg-zinc-900/70">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <SpeakerHigh size={20} weight="duotone" className="text-amber-400" />
              </div>
              <audio controls src={question.mediaUrl} className="w-full h-9" autoPlay={false} />
            </div>
          ) : youtubeEmbedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={youtubeEmbedUrl}
                title="Vídeo da questão"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video controls src={question.mediaUrl} className="w-full max-h-64 object-contain mx-auto" />
          )}
        </div>
      )}

      {/* Grid de Alternativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {options.map((opt, idx) => {
          const count = answers.filter((a) => a.answer === opt).length;
          const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
          const isCorrect = !isPoll && question.correctAnswer === opt;
          const theme = MULTIPLE_CHOICE_THEMES[idx % MULTIPLE_CHOICE_THEMES.length];
          const IconComponent = theme.icon;

          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                showCorrect && !isPoll
                  ? isCorrect
                    ? 'bg-emerald-950/25 border-emerald-500/50 shadow-sm'
                    : 'bg-zinc-900/25 border-zinc-800/50 opacity-65'
                  : 'bg-zinc-900/50 border-zinc-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                      showCorrect && isCorrect
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : `bg-zinc-950 ${theme.textClass} ${theme.borderClass}`
                    }`}
                  >
                    <IconComponent size={14} weight="fill" />
                  </div>
                  <span className="telao-option text-zinc-100">
                    {opt}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg sm:text-xl font-bold text-zinc-100 font-mono tabular-nums">
                    {count}
                  </span>
                  <span className="text-xs text-zinc-500 ml-1 font-mono tabular-nums">
                    ({pct}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    showCorrect && isCorrect ? 'bg-emerald-400' : theme.barClass
                  }`}
                  style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                />
              </div>

              {showCorrect && !isPoll && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  {isCorrect ? (
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={13} weight="fill" />
                      <span>Gabarito</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 flex items-center gap-1">
                      <XCircle size={13} weight="regular" />
                      <span>Incorreta</span>
                    </span>
                  )}
                  <span className="text-zinc-500 font-mono text-[11px]">{count} votos</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
