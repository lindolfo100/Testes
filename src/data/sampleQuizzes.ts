import { Quiz } from '../types/quiz';

export const SAMPLE_QUIZZES: Quiz[] = [
  {
    id: 'quiz-ciencia-planeta',
    ownerId: 'system',
    title: 'Ciências: Terra, Atmosfera e Universo',
    description: 'Quiz interativo misto de Verdadeiro ou Falso e Múltipla Escolha sobre o Sistema Solar e a Terra.',
    subject: 'Ciências Naturais',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        type: 'boolean',
        question: 'O Sol é uma estrela de tamanho médio conhecida como anã amarela.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Verdadeiro',
        timeLimit: 20,
        points: 1000,
        explanation: 'O Sol é classificado cientificamente como uma estrela anã amarela da sequência principal (tipo espectral G2V).'
      },
      {
        id: 'q2',
        type: 'multiple',
        question: 'Qual é o gás mais abundante na atmosfera terrestre?',
        options: ['Oxigênio (O₂)', 'Nitrogênio (N₂)', 'Gás Carbônico (CO₂)', 'Hidrogênio (H₂)'],
        correctAnswer: 'Nitrogênio (N₂)',
        timeLimit: 25,
        points: 1000,
        explanation: 'O nitrogênio compõe aproximadamente 78% da atmosfera terrestre, enquanto o oxigênio representa cerca de 21%.'
      },
      {
        id: 'q3',
        type: 'boolean',
        question: 'A camada de ozônio está localizada principalmente na troposfera, onde ocorrem as chuvas.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Falso',
        timeLimit: 20,
        points: 1000,
        explanation: 'A camada protetora de ozônio fica concentrada na estratosfera, entre 15 km e 35 km de altitude.'
      },
      {
        id: 'q4',
        type: 'multiple',
        question: 'Qual órgão das plantas é o principal responsável pela fotossíntese e transpiração?',
        options: ['Raiz', 'Caule', 'Folha', 'Semente'],
        correctAnswer: 'Folha',
        timeLimit: 20,
        points: 1000,
        explanation: 'As folhas contêm grande concentração de cloroplastos e estômatos responsáveis pela fotossíntese e troca gasosa.'
      },
      {
        id: 'q5',
        type: 'boolean',
        question: 'A velocidade da luz no vácuo é de cerca de 300.000 quilômetros por segundo.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Verdadeiro',
        timeLimit: 15,
        points: 1000,
        explanation: 'A constante física fundamental c é exatamente 299.792.458 m/s (aproximadamente 300.000 km/s).'
      }
    ]
  },
  {
    id: 'quiz-historia-brasil',
    ownerId: 'system',
    title: 'História do Brasil e Cidadania',
    description: 'Desafio dinâmico com fatos históricos, datas marcantes e cidadania brasileira.',
    subject: 'História',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'qh1',
        type: 'multiple',
        question: 'Em que ano foi promulgada a atual Constituição Federal do Brasil (Constituição Cidadã)?',
        options: ['1964', '1985', '1988', '1992'],
        correctAnswer: '1988',
        timeLimit: 25,
        points: 1000,
        explanation: 'A Carta Magna brasileira foi promulgada em 5 de outubro de 1988 sob liderança de Ulysses Guimarães.'
      },
      {
        id: 'qh2',
        type: 'boolean',
        question: 'A Lei Áurea foi assinada no ano de 1888 pela Princesa Isabel, abolindo formalmente a escravidão no Brasil.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Verdadeiro',
        timeLimit: 20,
        points: 1000,
        explanation: 'Assinada em 13 de maio de 1888, extinguiu legalmente a escravidão no território brasileiro.'
      },
      {
        id: 'qh3',
        type: 'multiple',
        question: 'Qual cidade foi a primeira capital do Brasil antes de ser transferida para o Rio de Janeiro?',
        options: ['Salvador', 'São Paulo', 'Recife', 'Ouro Preto'],
        correctAnswer: 'Salvador',
        timeLimit: 20,
        points: 1000,
        explanation: 'Salvador (BA) foi fundada em 1549 como a primeira capital do Brasil colonial, sede do governo geral até 1763.'
      },
      {
        id: 'qh4',
        type: 'boolean',
        question: 'O Tratado de Tordesilhas dividiu as terras descobertas entre Portugal e a França.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Falso',
        timeLimit: 20,
        points: 1000,
        explanation: 'O Tratado de Tordesilhas (1494) foi celebrado entre o Reino de Portugal e a Coroa de Castela (Espanha).'
      }
    ]
  },
  {
    id: 'quiz-matematica-logica',
    ownerId: 'system',
    title: 'Matemática e Raciocínio Rápido',
    description: 'Perguntas rápidas de lógica, frações e geometria para aquecer a mente.',
    subject: 'Matemática',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'qm1',
        type: 'boolean',
        question: 'O número 2 é o único número par que é primo.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Verdadeiro',
        timeLimit: 15,
        points: 1000,
        explanation: 'Todos os outros números pares são divisíveis por 2 além de 1 e de si mesmos, logo nenhum outro par é primo.'
      },
      {
        id: 'qm2',
        type: 'multiple',
        question: 'Qual é o valor da soma dos ângulos internos de qualquer triângulo?',
        options: ['90 graus', '180 graus', '270 graus', '360 graus'],
        correctAnswer: '180 graus',
        timeLimit: 20,
        points: 1000,
        explanation: 'Na geometria euclidiana plana, a soma das medidas dos três ângulos internos de um triângulo é sempre 180°.'
      },
      {
        id: 'qm3',
        type: 'boolean',
        question: 'A raiz quadrada de 144 é igual a 14.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 'Falso',
        timeLimit: 15,
        points: 1000,
        explanation: 'A raiz quadrada de 144 é 12, pois 12 × 12 = 144 (14 × 14 = 196).'
      },
      {
        id: 'qm4',
        type: 'multiple',
        question: 'Se um produto custa R$ 80,00 e recebe 25% de desconto, qual será o novo preço?',
        options: ['R$ 55,00', 'R$ 60,00', 'R$ 65,00', 'R$ 70,00'],
        correctAnswer: 'R$ 60,00',
        timeLimit: 25,
        points: 1000,
        explanation: '25% de R$ 80,00 é R$ 20,00 (80 ÷ 4). Logo, R$ 80 - R$ 20 = R$ 60,00.'
      }
    ]
  }
];
