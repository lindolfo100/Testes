import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, resolveCurrentUid } from '../lib/firebase';
import { Quiz, QuestionType, QuizReport } from '../types/quiz';
import {
  getTeacherQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createLiveSession,
} from '../services/quizService';
import {
  getTeacherReports,
  deleteQuizReport,
  exportReportToCSV,
} from '../services/reportService';
import { QuizEditor } from '../components/QuizEditor';
import { AiQuizGenerator } from '../components/AiQuizGenerator';
import {
  EmptyQuizzesIllustration,
  EmptyReportsIllustration,
} from '../components/BrandIllustrations';
import {
  Play,
  Plus,
  PencilSimple,
  Trash,
  Eye,
  X,
  Sparkle,
  DeviceMobile,
  MagnifyingGlass,
  Check,
  Cards,
  CopySimple,
  WarningCircle,
  ChartBar,
  DownloadSimple,
  Trophy,
  CalendarBlank,
  Users,
  Monitor,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';
import { ReportDiagnosticsModal } from '../components/ReportDiagnosticsModal';

interface TeacherDashboardProps {
  onStartSession: (sessionId: string, pin: string) => void;
  onNavigateToStudent: () => void;
  onQuizzesUpdated?: (quizzes: Quiz[]) => void;
  activeSessionPin?: string | null;
  onResumeTelao?: () => void;
  onRestartActiveSession?: () => void;
  onCloseActiveSession?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onStartSession,
  onNavigateToStudent,
  onQuizzesUpdated,
  activeSessionPin,
  onResumeTelao,
  onRestartActiveSession,
  onCloseActiveSession,
}) => {
  const { user, effectiveUid } = useAuth();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'reports'>('quizzes');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [reports, setReports] = useState<QuizReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [reportToDelete, setReportToDelete] = useState<QuizReport | null>(null);
  const [selectedReportModal, setSelectedReportModal] = useState<QuizReport | null>(null);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleApplyAiToNewQuiz = (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: any[];
  }) => {
    setQuizToEdit({
      id: '',
      ownerId: effectiveUid,
      title: data.title || 'Novo Questionário',
      subject: data.subject || 'Ciências',
      description: data.description || '',
      isPublic: false,
      questions: data.questions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditorOpen(true);
  };

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await getTeacherQuizzes(effectiveUid);
      setQuizzes(data);
      onQuizzesUpdated?.(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const data = await getTeacherReports(effectiveUid);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
    loadReports();
  }, [effectiveUid]);

  const handleCreateOrUpdate = async (quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => {
    const currentUid = auth.currentUser?.uid || effectiveUid || resolveCurrentUid();
    const isExistingUserQuiz =
      Boolean(quizToEdit?.id) &&
      (quizToEdit?.ownerId === currentUid || quizToEdit?.ownerId === effectiveUid) &&
      quizToEdit?.ownerId !== 'system';

    if (isExistingUserQuiz && quizToEdit?.id) {
      await updateQuiz(quizToEdit.id, {
        ...quizData,
        ownerId: quizToEdit.ownerId,
      });
    } else {
      await createQuiz({
        ...quizData,
        ownerId: currentUid,
      });
    }
    await loadQuizzes();
    setQuizToEdit(null);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    try {
      await deleteQuiz(quizToDelete.id);
      await loadQuizzes();
    } finally {
      setQuizToDelete(null);
    }
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await deleteQuizReport(reportToDelete.id);
      await loadReports();
    } finally {
      setReportToDelete(null);
    }
  };

  const handleLaunchSession = async (quiz: Quiz) => {
    setStartingSessionId(quiz.id);
    setErrorBanner(null);
    try {
      const hostName = user?.displayName || 'Professor(a)';
      const hostId = effectiveUid;
      const session = await createLiveSession(quiz, hostId, hostName);
      onStartSession(session.id, session.pin);
    } catch (err) {
      console.error('Failed to start session:', err);
      setErrorBanner('Não foi possível iniciar a sala ao vivo. Verifique sua conexão e tente novamente.');
    } finally {
      setStartingSessionId(null);
    }
  };

  const availableSubjects = useMemo(() => {
    const set = new Set<string>(['Ciências', 'História', 'Conhecimentos Gerais']);
    quizzes.forEach((q) => {
      if (q.subject) set.add(q.subject);
    });
    return Array.from(set);
  }, [quizzes]);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'my') return q.ownerId !== 'system';
    return q.subject.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} weight="fill" className="text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Fechar aviso de erro"
            className="text-rose-300 hover:text-white p-1.5"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Active Open Session Bar (1-click Resume, Restart, or Close) */}
      {activeSessionPin && (
        <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-zinc-200 font-medium">
              Sala ao vivo aberta agora ·{' '}
              <strong className="font-mono text-emerald-300">PIN {activeSessionPin}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onResumeTelao && (
              <button
                type="button"
                onClick={onResumeTelao}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
              >
                <Monitor size={15} weight="bold" />
                <span>Voltar ao Telão</span>
              </button>
            )}

            {onRestartActiveSession && (
              <button
                type="button"
                onClick={onRestartActiveSession}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-zinc-200 hover:text-amber-300 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
              >
                <ArrowCounterClockwise size={15} weight="bold" />
                <span>Recomeçar Quiz</span>
              </button>
            )}

            {onCloseActiveSession && (
              <button
                type="button"
                onClick={onCloseActiveSession}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
              >
                <X size={14} weight="bold" />
                <span>Encerrar Sala</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compact Header: Title + Merged Metrics Line + Primary/Secondary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-display">
            Painel do Professor
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300">
            <span className="font-mono font-semibold text-zinc-100">{quizzes.length}</span>{' '}
            {quizzes.length === 1 ? 'quiz' : 'quizzes'} ·{' '}
            <span className="font-mono font-semibold text-zinc-100">{reports.length}</span>{' '}
            {reports.length === 1 ? 'aula salva' : 'aulas salvas'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setQuizToEdit(null);
              setIsEditorOpen(true);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-sm transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} weight="bold" />
            <span>Novo Questionário</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAiOpen(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-100 font-semibold text-sm border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5"
          >
            <Sparkle size={16} weight="fill" className="text-amber-400" />
            <span>Importar / Gerar com IA</span>
          </button>
        </div>
      </div>

      {/* Primary Section Tabs: Questionários vs Histórico & Relatórios */}
      <div className="border-b border-zinc-800/80 flex items-center gap-5">
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`min-h-[44px] pb-2.5 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quizzes'
              ? 'text-zinc-100'
              : 'text-zinc-300 hover:text-zinc-100'
          }`}
        >
          <Cards size={17} weight={activeTab === 'quizzes' ? 'fill' : 'regular'} />
          <span>Questionários</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-zinc-850 border border-zinc-750 text-zinc-200">
            {quizzes.length}
          </span>
          {activeTab === 'quizzes' && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('reports');
            loadReports();
          }}
          className={`min-h-[44px] pb-2.5 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'text-zinc-100'
              : 'text-zinc-300 hover:text-zinc-100'
          }`}
        >
          <ChartBar size={17} weight={activeTab === 'reports' ? 'fill' : 'regular'} />
          <span>Histórico & Relatórios</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-zinc-850 border border-zinc-750 text-zinc-200">
            {reports.length}
          </span>
          {activeTab === 'reports' && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="space-y-5">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-900/70 text-zinc-300 hover:text-white border border-zinc-800/80'
                }`}
              >
                Todos
              </button>
              {availableSubjects.map((subj) => (
                <button
                  type="button"
                  key={subj}
                  onClick={() => setSelectedFilter(subj)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    selectedFilter === subj
                      ? 'bg-zinc-800 text-white'
                      : 'bg-zinc-900/70 text-zinc-300 hover:text-white border border-zinc-800/80'
                  }`}
                >
                  {subj}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedFilter('my')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedFilter === 'my'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-900/70 text-zinc-300 hover:text-white border border-zinc-800/80'
                }`}
              >
                Criados por mim
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-64">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar questionário..."
                aria-label="Buscar questionário por título ou tema"
                className="w-full min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-100 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white p-1.5"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Quizzes Grid */}
          {loading ? (
            <div className="py-16 text-center text-zinc-300 text-sm">
              Carregando questionários...
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-6">
              <EmptyQuizzesIllustration className="w-28 h-24 mx-auto" />
              <h3 className="text-base font-bold text-zinc-100">Nenhum questionário encontrado</h3>
              <p className="text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? `Nenhum resultado para "${searchQuery}".`
                  : 'Crie seu primeiro questionário interativo para apresentar à turma.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuizToEdit(null);
                  setIsEditorOpen(true);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 text-zinc-950 text-sm font-bold hover:bg-amber-300 transition-colors"
              >
                Criar Questionário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => {
                const isCustom = quiz.ownerId !== 'system';
                const uniqueTypes = Array.from(
                  new Set<QuestionType>(quiz.questions.map((q) => q.type))
                );

                return (
                  <div
                    key={quiz.id}
                    className="p-4 rounded-2xl bg-zinc-900/55 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3.5 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium text-zinc-300 truncate">
                          {quiz.subject}
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold shrink-0 tabular-nums">
                          {quiz.questions.length} {quiz.questions.length === 1 ? 'questão' : 'questões'}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-zinc-100 group-hover:text-white transition-colors leading-snug font-display line-clamp-2">
                        {quiz.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {uniqueTypes.slice(0, 3).map((t) => {
                          const meta = QUESTION_TYPES_META[t];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300"
                              title={meta.label}
                            >
                              <Icon size={12} weight="bold" className="text-zinc-400" />
                              <span>{meta.shortLabel}</span>
                            </span>
                          );
                        })}
                        {uniqueTypes.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 font-mono">
                            +{uniqueTypes.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewQuiz(quiz)}
                          aria-label={`Ver questões de ${quiz.title}`}
                          title="Inspecionar questões"
                          className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
                        >
                          <Eye size={17} weight="regular" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuizToEdit(quiz);
                            setIsEditorOpen(true);
                          }}
                          aria-label={
                            isCustom
                              ? `Editar questionário ${quiz.title}`
                              : `Personalizar cópia de ${quiz.title}`
                          }
                          title={isCustom ? 'Editar questionário' : 'Personalizar cópia'}
                          className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
                        >
                          {isCustom ? (
                            <PencilSimple size={17} weight="regular" />
                          ) : (
                            <CopySimple size={17} weight="regular" />
                          )}
                        </button>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => setQuizToDelete(quiz)}
                            aria-label={`Excluir questionário ${quiz.title}`}
                            title="Excluir"
                            className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition-colors flex items-center justify-center"
                          >
                            <Trash size={17} weight="regular" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLaunchSession(quiz)}
                        disabled={startingSessionId === quiz.id}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Play size={14} weight="fill" />
                        <span>{startingSessionId === quiz.id ? 'Iniciando...' : 'Apresentar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTS & HISTORY */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>
              Relatórios consolidados salvos no Firestore e em cache local para diagnóstico pedagógico.
            </span>
            <button
              type="button"
              onClick={loadReports}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white transition-colors font-medium"
            >
              Atualizar
            </button>
          </div>

          {reportsLoading ? (
            <div className="py-20 text-center text-zinc-300 text-sm">
              Carregando relatórios históricos...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-14 text-center space-y-3.5 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-8">
              <EmptyReportsIllustration className="w-32 h-28 mx-auto" />
              <h3 className="text-base font-bold text-zinc-100">Nenhum relatório arquivado ainda</h3>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Ao concluir uma apresentação no telão, o relatório completo com a pontuação dos alunos e acertos por pergunta será salvo automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => {
                const dateStr = new Date(report.completedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={report.id}
                    className="p-4 sm:p-5 rounded-2xl bg-zinc-900/55 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-xs text-zinc-300 flex items-center gap-1">
                          <CalendarBlank size={13} weight="bold" className="text-zinc-400" />
                          <span>{dateStr}</span>
                        </span>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums ${
                            report.averageAccuracy >= 70
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                              : report.averageAccuracy >= 40
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {report.averageAccuracy}% acerto
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-zinc-100 leading-snug font-display">
                          {report.quizTitle}
                        </h3>
                        {report.subject && (
                          <span className="text-xs text-zinc-300 block mt-0.5">
                            {report.subject}
                          </span>
                        )}
                      </div>

                      {/* Merged 1-line summary (no nested bordered cards) */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-300 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <Users size={13} weight="regular" className="text-zinc-400" />
                          <strong className="font-mono text-zinc-100 tabular-nums">{report.totalPlayers}</strong> alunos
                        </span>
                        {report.top3[0]?.nickname && (
                          <>
                            <span className="text-zinc-600" aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-amber-300 font-medium truncate">
                              <Trophy size={13} weight="fill" className="text-amber-400 shrink-0" />
                              <span className="truncate">{report.top3[0].nickname}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => exportReportToCSV(report)}
                          aria-label={`Exportar planilha CSV de ${report.quizTitle}`}
                          title="Baixar planilha CSV da turma"
                          className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
                        >
                          <DownloadSimple size={16} weight="bold" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setReportToDelete(report)}
                          aria-label={`Excluir relatório de ${report.quizTitle}`}
                          title="Excluir relatório"
                          className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition-colors flex items-center justify-center"
                        >
                          <Trash size={16} weight="regular" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReportModal(report)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold border border-zinc-750 transition-colors flex items-center gap-1.5"
                      >
                        <ChartBar size={14} weight="bold" />
                        <span>Diagnóstico</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Report Detailed Diagnostics Modal */}
      {selectedReportModal && (
        <ReportDiagnosticsModal
          report={selectedReportModal}
          onClose={() => setSelectedReportModal(null)}
        />
      )}

      {/* Delete Report Confirmation */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100">Excluir Relatório</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Deseja remover este relatório da sessão <strong>"{reportToDelete.quizTitle}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-zinc-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteReport}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">{previewQuiz.title}</h3>
                <span className="text-xs text-zinc-300">
                  <strong className="font-mono tabular-nums">{previewQuiz.questions.length}</strong> questões · {previewQuiz.subject}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuiz(null)}
                aria-label="Fechar visualização do questionário"
                className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {previewQuiz.questions.map((q, idx) => {
                const typeMeta = QUESTION_TYPES_META[q.type];
                const Icon = typeMeta?.icon;
                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                        <span className="text-zinc-500">#{idx + 1}</span>
                        {Icon && <Icon size={13} weight="bold" className="text-zinc-400" />}
                        <span>{typeMeta?.label || q.type}</span>
                      </span>
                      <span className="font-mono text-zinc-500">{q.timeLimit}s</span>
                    </div>
                    <p className="text-zinc-100 font-medium leading-snug">{q.question}</p>

                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = opt === q.correctAnswer && q.type !== 'poll';
                          return (
                            <span
                              key={oIdx}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${
                                isCorrect
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold'
                                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <Check size={11} weight="bold" className="text-emerald-400" />}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-zinc-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const q = previewQuiz;
                  setPreviewQuiz(null);
                  setQuizToEdit(q);
                  setIsEditorOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <PencilSimple size={14} weight="regular" />
                <span>{previewQuiz.ownerId === 'system' ? 'Personalizar Cópia' : 'Editar'}</span>
              </button>

              <button
                onClick={() => {
                  const q = previewQuiz;
                  setPreviewQuiz(null);
                  handleLaunchSession(q);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Play size={13} weight="fill" />
                <span>Iniciar Apresentação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Quiz Confirmation */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100">Excluir questionário</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deseja remover <strong>"{quizToDelete.title}"</strong> permanentemente?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setQuizToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <QuizEditor
          quizToEdit={quizToEdit}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setIsEditorOpen(false);
            setQuizToEdit(null);
          }}
        />
      )}

      {/* AI Quiz Generator Modal */}
      {isAiOpen && (
        <AiQuizGenerator
          onApplyQuestions={handleApplyAiToNewQuiz}
          onClose={() => setIsAiOpen(false)}
        />
      )}
    </div>
  );
};
