# Plano de Preparação para Produção: QuizClass Live

Consolidação da aplicação para uso em ambiente de produção em salas de aula reais, adicionando QR Code de conexão imediata para os estudantes, efeitos sonoros imersivos via Web Audio API com controle de volume, persistência e visualização de relatórios históricos no Firestore, e suporte completo a Progressive Web App (PWA).

## Decisões Confirmadas e Revisão do Usuário

> [!IMPORTANT]
> As decisões finais para o lançamento em produção foram confirmadas:

- **Acesso dos Estudantes sem Fricção**: Telão exibirá um **QR Code dinâmico** além do PIN. O aluno aponta a câmera do celular ou tablet e entra diretamente na sala com o PIN preenchido automaticamente, eliminando erros de digitação.
- **Efeitos Sonoros Nativos (Web Audio API)**: Sons de contagem regressiva, resposta correta/incorreta e fanfarra do pódio gerados diretamente via síntese de áudio no navegador (sem dependências de arquivos de áudio externos frágeis), com botão Mudo/Som no telão.
- **Histórico e Relatórios de Turma no Firestore**: Ao término do quiz, um relatório consolidado com percentual de acertos, tempo médio, ranking dos alunos e desempenho por pergunta é gravado na coleção `/reports/{reportId}` para consulta posterior do professor no painel.
- **Progressive Web App (PWA) Completo**: Web App Manifest, ícones adaptativos, meta tags para iOS/Android, atalho para tela cheia e botão nativo de instalação no aplicativo (`PWAInstallButton`).

---

## 1. Visão Geral e Benefícios para a Sala de Aula

- **Eliminação de Atrito com QR Code**: Em turmas de 30 a 45 alunos, digitar PIN de 6 dígitos pode gerar atrasos. Com o QR Code de alta resolução projetado no telão, a entrada da turma inteira ocorre em menos de 1 minuto.
- **Engajamento Auditivo Saudável**: A tensão da contagem regressiva e a comemoração do pódio ganham vida com áudio sintetizado não invasivo.
- **Diagnóstico e Registro Pedagógico**: Professores precisam comprovar atividades e acompanhar a evolução da turma. A nova aba "Histórico de Aulas & Relatórios" permite consultar o desempenho de qualquer sessão realizada.
- **Uso Móvel Fluido (PWA)**: Alunos e professores podem adicionar o aplicativo à tela inicial de seus celulares e tablets com inicialização rápida e experiência em tela cheia.

---

## 2. Experiência do Usuário e Design Visual

### 1. Telão com QR Code Integrado
- No **Lobby**, ao lado do PIN de 6 dígitos em tamanho gigante, será renderizado um cartão com **QR Code nítido** e instruções: *"Aponte a câmera do celular para entrar direto"*.
- O QR Code carrega a URL com parâmetro `?pin=XXXXXX`, preenchendo automaticamente o código no celular do aluno.

### 2. Motor de Áudio Dinâmico
- Controlador de áudio no topo do telão: botão com ícone de volume ativo/mudo.
- Sons sintetizados via Web Audio API:
  - *Tick-Tock*: Beep suave nos últimos 5 segundos do cronômetro.
  - *Revelação*: Som harmônico ao exibir o gráfico de respostas.
  - *Fanfarra*: Arpejo comemorativo no momento da explosão de confetes do pódio.

### 3. Painel de Relatórios Históricos no Dashboard
- Nova seção no Painel do Professor: **"Histórico de Quizzes & Desempenho"**.
- Lista de sessões finalizadas com data, quantidade de alunos presentes, taxa geral de acerto da turma, vencedor do pódio e botão de reabrir relatório completo ou exportar CSV.

### 4. PWA e Instalação
- Botão "Instalar App" no cabeçalho para navegadores compatíveis (Chrome, Edge, Android).
- Guia passo a passo automático para iPhone/iPad (Safari).

---

## 3. Arquitetura do Sistema e Estrutura de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TELÃO DE APRESENTAÇÃO                           │
│  - PIN 6 dígitos + QR Code SVG direto (?pin=XXXXXX)                    │
│  - Motor Web Audio API (Tick, Fanfarra, Mudo)                          │
│  - Encerramento: salva relatório consolidado em /reports/{reportId}    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE FIRESTORE DB                           │
│  /users/{userId}               -> Perfil do professor                  │
│  /quizzes/{quizId}             -> Questionários salvos                 │
│  /sessions/{sessionId}         -> Sala ao vivo sincronizada            │
│  /reports/{reportId}           -> Relatórios históricos de desempenho  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PAINEL DO PROFESSOR (HISTÓRICO)                      │
│  - Aba de Relatórios de Aulas Passadas                                 │
│  - Diagnóstico de acertos e exportação de dados                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Schema da Coleção `/reports/{reportId}`
- `id`: Identificador único (`rep_...`)
- `teacherId`: `auth.currentUser.uid`
- `quizId`: ID do quiz executado
- `quizTitle`: Nome do questionário
- `subject`: Disciplina
- `totalQuestions`: Número de questões
- `totalPlayers`: Alunos participantes
- `averageAccuracy`: Percentual médio de acertos da turma
- `top3`: Lista com os 3 primeiros colocados (`nickname`, `score`)
- `questionsSummary`: Desempenho por pergunta (acertos, taxa de erro)
- `completedAt`: Timestamp ISO

---

## Próximos Passos na Execução

1. Instalação e configuração dos pacotes auxiliares: `qrcode` e `@types/qrcode`.
2. Criação do serviço de áudio nativo `src/lib/soundEffects.ts` usando Web Audio API.
3. Atualização de `firestore.rules` e `firebase-blueprint.json` incluindo a coleção `/reports` com regras seguras ABAC.
4. Integração do QR Code dinâmico no Lobby e na barra do Telão.
5. Criação do serviço de relatórios em `src/services/reportService.ts`.
6. Implementação da visualização de histórico de relatórios no `TeacherDashboard.tsx`.
7. Configuração do PWA (Web App Manifest, meta tags mobile e hook `usePWAInstall.ts`).
8. Verificação de compilação e teste final.
