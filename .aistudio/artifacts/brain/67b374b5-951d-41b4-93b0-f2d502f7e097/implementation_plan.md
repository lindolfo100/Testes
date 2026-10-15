# Criação e Organização Inteligente de Quizzes com Gemini AI

Permite aos professores colar textos brutos com perguntas e respostas, anotações de aula ou temas curriculares para que a IA Gemini organize e monte automaticamente as questões formatadas para o quiz ao vivo, com escolha do tipo de questão (Verdadeiro ou Falso, Múltipla Escolha ou Mistas).

## Decisões Confirmadas e Revisão do Usuário

> [!IMPORTANT]
> As decisões principais foram confirmadas pelo usuário para a geração inteligente:

- **Modo de Entrada Flexível**: O professor poderá escolher entre **Colar Texto Bruto** (anotações de aula, questões já existentes, gabaritos ou listas de perguntas/respostas) OU **Gerar por Tema** (assunto, série escolar e objetivos de aprendizagem).
- **Seletor de Formato de Questões**: A interface terá um seletor claro para o professor definir a estrutura desejada:
  1. *Apenas Verdadeiro ou Falso (V/F)*
  2. *Apenas Múltipla Escolha (4 alternativas)*
  3. *Mistas (V/F e Múltipla Escolha combinadas)*
- **Fidelidade ao Conteúdo do Professor**: A IA organizará com rigor o texto colado pelo professor, preservando enunciados e respostas originais sem inventar alternativas desnecessárias ou alterar o sentido pedagógico, gerando explicações claras para o telão.
- **Arquitetura Full-Stack Segura**: Execução do modelo `gemini-3.8-flash` via `@google/genai` estritamente no backend Express (`server.ts`), protegendo a chave `GEMINI_API_KEY` do navegador.

---

## 1. Visão Geral e Conceito Central

- **O que faz**: Adiciona um assistente de IA dentro do painel do professor e do editor de quizzes. O professor pode simplesmente colar um texto desordenado com perguntas e respostas anotadas (de uma prova anterior, apostila ou slide) ou digitar um tema. A IA Gemini analisa, padroniza enunciados, estrutura as opções (V/F ou A, B, C, D), identifica o gabarito correto e adiciona justificativas pedagógicas prontas para exibição no telão.
- **Público-alvo**: Professores que desejam economizar tempo de digitação e preparar quizzes rápidos para suas aulas em segundos.
- **Valor Principal**: Elimina o retrabalho manual de cadastrar alternativa por alternativa, transformando qualquer anotação em um quiz interativo pronto para jogar em tempo real com a turma.

---

## 2. Experiência do Usuário e Design Visual

### Fluxo de Criação com IA
1. **Acesso no Painel / Editor**:
   - No painel do professor e no topo do modal de criação de quiz, haverá o botão destacado: **"✨ Criar / Organizar com IA"**.
2. **Configuração da Geração**:
   - **Abas de Entrada**:
     - *Colar Texto / Questões*: Grande área de texto com placeholder indicando exemplos (ex: "1. O que é mitocôndria? R: organela de energia; 2. O Sol é planeta? R: Falso").
     - *Gerar por Tema*: Campo para disciplina, tópico e nível de ensino.
   - **Formato das Questões**: Seletor visual tipo rádio/chips:
     - `Verdadeiro ou Falso`
     - `Múltipla Escolha`
     - `Mistas (V/F + Múltipla)`
   - **Quantidade Desejada**: Controle numérico (ex: 3 a 10 perguntas).
   - **Tempo de Resposta Padrão**: Sugestão de tempo por pergunta (15s, 20s, 30s).
3. **Prévia e Edição Imediata**:
   - A IA processa em segundos com indicador de carregamento animado.
   - Apresenta as questões geradas em formato de cartões interativos antes de salvar.
   - O professor pode revisar, ajustar enunciados, alterar o gabarito ou excluir perguntas antes de inserir no quiz oficial.
4. **Aplicação no Quiz**:
   - Botão **"Inserir no Meu Quiz"**: preenche instantaneamente o questionário e permite salvar no Firestore ou iniciar imediatamente no telão.

---

## 3. Decisões Técnicas e Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENTE REACT (SPA)                             │
│  - Botão "✨ Criar com IA" no QuizEditor / TeacherDashboard            │
│  - Modal de entrada: colar texto bruto ou selecionar tema              │
│  - Seletor de tipo: V/F, Múltipla Escolha ou Mistas                    │
│  - Preview interativo de perguntas antes da inserção                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ POST /api/gemini/generate-quiz
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SERVIDOR EXPRESS (server.ts)                       │
│  - Endpoint seguro com validação de payload                            │
│  - SDK @google/genai com User-Agent 'aistudio-build'                   │
│  - Modelo: 'gemini-3.8-flash' com responseSchema JSON estruturado      │
│  - Prompt engenheirado para fidelidade textual aos dados colados       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GEMINI 3.8 FLASH API                            │
│  - Extração de entidades estruturadas (pergunta, opções, gabarito)     │
│  - Retorno JSON tipado compatível com o modelo de dados do Firestore   │
└────────────────────────────────────────────────────────────────────────┘
```

### Schema Estruturado do Gemini (`responseSchema`)
A requisição ao modelo `gemini-3.8-flash` utilizará `responseMimeType: "application/json"` com o seguinte esquema estrito:
- `title`: Título sugerido para o quiz
- `subject`: Disciplina identificada
- `questions`: Array de objetos:
  - `type`: `'boolean' | 'multiple'`
  - `question`: Enunciado claro e direto
  - `options`: Array de strings (`['Verdadeiro', 'Falso']` ou 4 opções para múltipla escolha)
  - `correctAnswer`: String idêntica à opção correta
  - `timeLimit`: Número de segundos (15, 20 ou 30)
  - `explanation`: Explicação pedagógica sucinta para projeção no telão

---

## Próximos Passos na Execução

1. Configuração do entry point full-stack `server.ts` integrando Express, `@google/genai` e `vite.middlewares`.
2. Criação da rota `POST /api/gemini/generate-quiz` com prompt especializado em extração e organização fiel de perguntas e respostas.
3. Atualização do script `"dev": "tsx server.ts"` e `"start": "node server.ts"` em `package.json`.
4. Construção do componente modal `AiQuizGenerator.tsx` com suporte a colagem de texto bruto, seletor de tipo (V/F, Múltipla ou Mistas) e prévia em tempo real.
5. Integração com o `QuizEditor.tsx` e `TeacherDashboard.tsx`.
6. Validação e verificação via `compile_applet`.
