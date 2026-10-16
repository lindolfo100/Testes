import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { QuizReport } from '../types/quiz';

const LOCAL_STORAGE_REPORTS_KEY = 'valendo_local_reports';

function getLocalReports(): QuizReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReport(report: QuizReport) {
  try {
    const current = getLocalReports();
    const updated = [report, ...current.filter((r) => r.id !== report.id)].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(updated));
  } catch {}
}

export async function saveQuizReport(
  reportData: Omit<QuizReport, 'id' | 'completedAt'>
): Promise<QuizReport> {
  const reportId =
    'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const currentUid = auth.currentUser?.uid || reportData.teacherId || 'guest';

  const fullReport: QuizReport = {
    ...reportData,
    id: reportId,
    teacherId: currentUid,
    completedAt: now,
  };

  // Always mirror in localStorage for immediate offline persistence
  saveLocalReport(fullReport);

  // If user is authenticated in Firestore, persist to /reports/{reportId}
  if (auth.currentUser && auth.currentUser.uid !== 'guest') {
    const path = `reports/${reportId}`;
    try {
      await setDoc(doc(db, 'reports', reportId), fullReport);
    } catch (error) {
      console.warn('Could not save report to Firestore, cached locally:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return fullReport;
}

export async function getTeacherReports(teacherId: string): Promise<QuizReport[]> {
  const localList = getLocalReports();

  if (!auth.currentUser || auth.currentUser.uid === 'guest') {
    return localList;
  }

  const path = 'reports';
  try {
    const q = query(
      collection(db, 'reports'),
      where('teacherId', '==', teacherId),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const cloudReports: QuizReport[] = [];
    snapshot.forEach((docSnap) => {
      cloudReports.push({ id: docSnap.id, ...(docSnap.data() as Omit<QuizReport, 'id'>) });
    });

    // Merge and deduplicate with any local reports
    const map = new Map<string, QuizReport>();
    cloudReports.forEach((r) => map.set(r.id, r));
    localList.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch (error) {
    console.warn('Falling back to locally stored reports:', error);
    return localList;
  }
}

export async function deleteQuizReport(reportId: string): Promise<void> {
  // 1. Remove from local storage
  try {
    const current = getLocalReports();
    const updated = current.filter((r) => r.id !== reportId);
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Remove from Firestore if online
  if (auth.currentUser && auth.currentUser.uid !== 'guest') {
    const path = `reports/${reportId}`;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export function exportReportToCSV(report: QuizReport) {
  const dateFormatted = new Date(report.completedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [
    `Relatório de Turma - QuizClass Live / Valendo!`,
    `Questionário,"${report.quizTitle}"`,
    `Disciplina,"${report.subject || 'Geral'}"`,
    `Data da Sessão,"${dateFormatted}"`,
    `Total de Alunos,${report.totalPlayers}`,
    `Total de Questões,${report.totalQuestions}`,
    `Precisão Média da Turma,"${report.averageAccuracy}%"`,
    ``,
    `Classificação Geral dos Estudantes:`,
    `Posição,Nome do Aluno,Pontuação Total,Acertos Seguidos`,
  ];

  report.playersRanking.forEach((p, idx) => {
    lines.push(`${idx + 1},"${p.nickname}",${p.score},${p.streak}`);
  });

  lines.push(``);
  lines.push(`Desempenho Detalhado por Questão:`);
  lines.push(`Questão,Enunciado,Tipo,Respostas,Acertos,Taxa de Acerto (%)`);

  report.questionsSummary.forEach((q) => {
    const cleanPrompt = q.questionText.replace(/"/g, '""');
    lines.push(
      `#${q.questionIndex + 1},"${cleanPrompt}","${q.questionType}",${q.totalAnswers},${q.correctAnswers},"${q.accuracyPercentage}%"`
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `relatorio_${report.quizTitle.toLowerCase().replace(/\s+/g, '_')}_${report.id}.csv`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
