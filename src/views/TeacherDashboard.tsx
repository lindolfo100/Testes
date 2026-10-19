import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
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
      ownerId: user?.uid || 'guest',
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
      const data = await getTeacherQuizzes(user?.uid || 'guest');
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
      const data = await getTeacherReports(user?.uid || 'guest');
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
  }, [user]);

  const handleCreateOrUpdate = async (quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => {
    const currentUid = user?.uid || 'guest';
    const isExistingUserQuiz =
      Boolean(quizToEdit?.id) &&
      quizToEdit?.ownerId === currentUid &&
      quizToEdit?.ownerId !== 'system';

    if (isExistingUserQuiz && quizToEdit?.id) {
      await updateQuiz(quizToEdit.id, {
        ...quizData,
        ownerId: currentUid,
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
      const hostId = user?.uid || 'prof_local';
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
            onClick={() => setErrorBanner(null)}
            className="text-rose-400 hover:text-white p-1"
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

      {/* Bento Grid Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bento Cell 1: Action Command with Teacher Studio Illustration */}
        <div className="md:col-span-2 p-5 sm:p-6 rounded-2xl bg-zinc-900/55 border border-zinc-800/90 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex-1 flex flex-col justify-between space-y-5 w-full">
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-semibold block">
                Painel do Professor
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-display">
                Ambiente Pedagógico ao Vivo
              </h1>
              <p className="text-sm text-zinc-300 max-w-md leading-relaxed">
                Crie quizzes interativos, projete no telão da sala com QR Code, acompanhe a nuvem de dados e consulte relatórios de desempenho da turma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setQuizToEdit(null);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Plus size={16} weight="bold" />
                <span>Novo Questionário</span>
              </button>

              <button
                onClick={() => setIsAiOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-100 font-semibold text-sm border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5"
              >
                <Sparkle size={16} weight="fill" className="text-amber-400" />
                <span>Importar / Gerar com IA</span>
              </button>
            </div>
          </div>

          <div className="w-full sm:w-52 md:w-56 shrink-0 illustration-frame rounded-2xl overflow-hidden border-amber-500/20 aspect-[16/10] sm:aspect-[16/11] relative">
            <img
              src="/ilustracao-painel.jpg"
              alt="Estúdio Criativo do Professor"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

        {/* Bento Cell 2: Quick Metrics & Test Mode */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/55 border border-zinc-800/90 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-semibold">
              Métricas Rápidas
            </span>
            <Cards size={18} weight="regular" className="text-zinc-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-2xl font-bold text-zinc-100 font-mono tabular-nums block">
                {quizzes.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono">quizzes</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-2xl font-bold text-zinc-100 font-mono tabular-nums block">
                {reports.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono">aulas salvas</span>
            </div>
          </div>

          <button
            onClick={onNavigateToStudent}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <DeviceMobile size={16} weight="regular" />
            <span>Simular visão do aluno</span>
          </button>
        </div>
      </div>

      {/* Primary Section Tabs: Questionários vs Histórico & Relatórios */}
      <div className="border-b border-zinc-800/80 flex items-center gap-5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quizzes'
              ? 'text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200'
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
          className={`pb-3 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200'
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
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-900/70 rounded-xl border border-zinc-800/80 text-xs sm:text-sm overflow-x-auto">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedFilter === 'all'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Todos
              </button>
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedFilter(subj)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    selectedFilter === subj
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {subj}
                </button>
              ))}
              <button
                onClick={() => setSelectedFilter('my')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedFilter === 'my'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Criados por mim
              </button>
            </div>

            {/* Search Input (16px on mobile to prevent auto-zoom) */}
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
                placeholder="Buscar por título ou tema..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800/90 text-zinc-100 text-base sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Quizzes Grid */}
          {loading ? (
            <div className="py-20 text-center text-zinc-400 text-sm font-mono">
              Carregando questionários...
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="py-14 text-center space-y-3.5 bg-zinc-900/35 rounded-2xl border border-zinc-800/70 p-8">
              <EmptyQuizzesIllustration className="w-32 h-28 mx-auto" />
              <h3 className="text-base font-bold text-zinc-100">Nenhum questionário encontrado</h3>
              <p className="text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? `Nenhum resultado para "${searchQuery}".`
                  : 'Crie seu primeiro questionário interativo para apresentar à turma.'}
              </p>
              <button
                onClick={() => {
                  setQuizToEdit(null);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-bold hover:bg-white transition-colors"
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
                    className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-xs font-semibold text-zinc-200 bg-zinc-850 px-2.5 py-1 rounded-lg border border-zinc-800 truncate">
                          {quiz.subject}
                        </span>
                        <span className="text-xs font-mono text-zinc-300 shrink-0 tabular-nums">
                          {quiz.questions.length} {quiz.questions.length === 1 ? 'questão' : 'questões'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-zinc-100 group-hover:text-white transition-colors leading-snug font-display">
                          {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p className="text-sm text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {uniqueTypes.slice(0, 4).map((t) => {
                          const meta = QUESTION_TYPES_META[t];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 font-mono"
                              title={meta.label}
                            >
                              <Icon size={12} weight="bold" className="text-zinc-400" />
                              <span>{meta.shortLabel}</span>
                            </span>
                          );
                        })}
                        {uniqueTypes.length > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 font-mono">
                            +{uniqueTypes.length - 4} formatos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewQuiz(quiz)}
                          title="Inspecionar questões"
                          className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors"
                        >
                          <Eye size={16} weight="regular" />
                        </button>

                        <button
                          onClick={() => {
                            setQuizToEdit(quiz);
                            setIsEditorOpen(true);
                          }}
                          title={isCustom ? 'Editar questionário' : 'Personalizar cópia'}
                          className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors"
                        >
                          {isCustom ? (
                            <PencilSimple size={16} weight="regular" />
                          ) : (
                            <CopySimple size={16} weight="regular" />
                          )}
                        </button>

                        {isCustom && (
                          <button
                            onClick={() => setQuizToDelete(quiz)}
                            title="Excluir"
                            className="p-2 text-zinc-300 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash size={16} weight="regular" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleLaunchSession(quiz)}
                        disabled={startingSessionId === quiz.id}
                        className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
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
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Relatórios consolidados salvos no Firestore e em cache local para diagnóstico pedagógico.
            </span>
            <button
              onClick={loadReports}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              Atualizar
            </button>
          </div>

          {reportsLoading ? (
            <div className="py-20 text-center text-zinc-500 text-xs font-mono">
              Carregando relatórios históricos...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-14 text-center space-y-3.5 bg-zinc-900/35 rounded-2xl border border-zinc-800/70 p-8">
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
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                          <CalendarBlank size={13} weight="bold" className="text-zinc-500" />
                          <span>{dateStr}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            report.averageAccuracy >= 70
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : report.averageAccuracy >= 40
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {report.averageAccuracy}% acerto
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                          {report.quizTitle}
                        </h3>
                        {report.subject && (
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            {report.subject}
                          </span>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                          <span className="text-zinc-500 text-[10px] block">Participantes</span>
                          <span className="text-zinc-200 font-bold flex items-center gap-1">
                            <Users size={12} weight="regular" />
                            {report.totalPlayers} alunos
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                          <span className="text-zinc-500 text-[10px] block">Vencedor(a)</span>
                          <span className="text-amber-300 font-bold flex items-center gap-1 truncate">
                            <Trophy size={12} weight="fill" className="text-amber-400 shrink-0" />
                            <span className="truncate">{report.top3[0]?.nickname || '—'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportReportToCSV(report)}
                          title="Baixar planilha CSV da turma"
                          className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/80 transition-colors"
                        >
                          <DownloadSimple size={15} weight="bold" />
                        </button>

                        <button
                          onClick={() => setReportToDelete(report)}
                          title="Excluir relatório"
                          className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash size={15} weight="regular" />
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedReportModal(report)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-colors flex items-center gap-1.5"
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
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deseja remover este relatório da sessão <strong>"{reportToDelete.quizTitle}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteReport}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
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
                <span className="text-[11px] text-zinc-400 font-mono">
                  {previewQuiz.questions.length} questões · {previewQuiz.subject}
                </span>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
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
