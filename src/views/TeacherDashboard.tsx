import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Quiz } from '../types/quiz';
import {
  getTeacherQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createLiveSession,
} from '../services/quizService';
import { QuizEditor } from '../components/QuizEditor';
import { AiQuizGenerator } from '../components/AiQuizGenerator';
import {
  Play,
  Plus,
  BookOpen,
  HelpCircle,
  Edit3,
  Trash2,
  CheckCircle,
  Eye,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';

interface TeacherDashboardProps {
  onStartSession: (sessionId: string, pin: string) => void;
  onNavigateToStudent: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onStartSession,
  onNavigateToStudent,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);

  const handleApplyAiToNewQuiz = (data: {
    title?: string;
    subject?: string;
    description?: string;
    questions: any[];
  }) => {
    setQuizToEdit({
      id: '', // ID vazio indica que é um quiz novo ainda não salvo no banco
      ownerId: user?.uid || 'guest',
      title: data.title || 'Novo Quiz Gerado por IA',
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
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

  const handleDelete = async (quizId: string) => {
    if (window.confirm('Deseja realmente excluir este quiz?')) {
      await deleteQuiz(quizId);
      await loadQuizzes();
    }
  };

  const handleLaunchSession = async (quiz: Quiz) => {
    setStartingSessionId(quiz.id);
    try {
      const hostName = user?.displayName || 'Professor(a)';
      const hostId = user?.uid || 'prof_local';
      const session = await createLiveSession(quiz, hostId, hostName);
      onStartSession(session.id, session.pin);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Erro ao iniciar a sessão ao vivo. Verifique a conexão.');
    } finally {
      setStartingSessionId(null);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'my') return q.ownerId === user?.uid;
    return q.subject.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800/60">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambiente do Professor · Ensino Ativo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Quizzes ao Vivo & Controle de Telão
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Inicie sessões interativas de Verdadeiro ou Falso e Múltipla Escolha. Os alunos respondem no celular pelo código PIN e o telão exibe gráficos de distribuição, nuvem de dados e o pódio em tempo real.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar / Colar com IA</span>
            </button>

            <button
              onClick={() => {
                setQuizToEdit(null);
                setIsEditorOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Manualmente</span>
            </button>

            <button
              onClick={onNavigateToStudent}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Testar como Aluno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Library Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Biblioteca de Questionários</span>
          </h2>
          <span className="text-xs text-slate-400">
            Escolha um modelo pronto ou lance seus próprios questionários
          </span>
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-850 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'Ciências', label: 'Ciências' },
            { id: 'História', label: 'História' },
            { id: 'Matemática', label: 'Matemática' },
            { id: 'my', label: 'Criados por Mim' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Carregando questionários disponíveis...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-850 rounded-2xl border border-slate-800 p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Nenhum quiz encontrado nesta categoria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Você pode criar um novo quiz agora mesmo com perguntas de Verdadeiro/Falso e Múltipla Escolha!
          </p>
          <button
            onClick={() => {
              setQuizToEdit(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
          >
            Criar Primeiro Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => {
            const isCustom = quiz.ownerId !== 'system';
            const booleanCount = quiz.questions.filter((q) => q.type === 'boolean').length;
            const multipleCount = quiz.questions.filter((q) => q.type === 'multiple').length;

            return (
              <div
                key={quiz.id}
                className="bg-slate-850 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  {/* Subject and question counts */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-400">{quiz.subject}</span>
                    <span className="text-slate-400">
                      {quiz.questions.length} perguntas · {booleanCount} V/F · {multipleCount} Múltipla
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-5 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewQuiz(quiz)}
                      title="Visualizar perguntas"
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {isCustom && (
                      <>
                        <button
                          onClick={() => {
                            setQuizToEdit(quiz);
                            setIsEditorOpen(true);
                          }}
                          title="Editar quiz"
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          title="Excluir quiz"
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Launch button */}
                  <button
                    onClick={() => handleLaunchSession(quiz)}
                    disabled={startingSessionId === quiz.id}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{startingSessionId === quiz.id ? 'Iniciando...' : 'Iniciar no Telão'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">{previewQuiz.title}</h3>
                <span className="text-xs text-slate-400">{previewQuiz.questions.length} perguntas cadastradas</span>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {previewQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-semibold">
                    <span>
                      Pergunta #{idx + 1} ({q.type === 'boolean' ? 'Verdadeiro ou Falso' : 'Múltipla Escolha'})
                    </span>
                    <span>{q.timeLimit} segundos</span>
                  </div>
                  <p className="text-white font-medium text-sm">{q.question}</p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    {q.options.map((opt, oIdx) => (
                      <span
                        key={oIdx}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          opt === q.correctAnswer
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {opt} {opt === q.correctAnswer && '✓'}
                      </span>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-slate-400 italic pt-1 border-t border-slate-700/60">
                      Explicação: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => {
                  const q = previewQuiz;
                  setPreviewQuiz(null);
                  handleLaunchSession(q);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar este Quiz Agora</span>
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
