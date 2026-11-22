# SecretarIA

Uma secretária virtual no terminal que consulta e altera uma **agenda** e uma **caixa de emails** usando *tool calling*.

O mesmo assistente está implementado de cinco formas, para comparar as abordagens:

| Pasta | O que é | SDK | Comando |
|---|---|---|---|
| [`src/gemini`](#srcgemini--tool-calling-com-o-sdk-do-gemini) | Chat com tool calling | `@google/genai` | `pnpm chat:gemini` |
| [`src/claude`](#srcclaude--tool-calling-com-o-sdk-da-anthropic) | Chat com tool calling | `@anthropic-ai/sdk` | `pnpm chat:claude` |
| [`src/ai-sdk`](#srcai-sdk--tool-calling-via-mcp-com-o-ai-sdk) | Chat com tools expostas via MCP | `ai` + `ai-sdk-provider-claude-code` | `pnpm chat` |
| [`src/mcp/http`](#srcmcphttp--servidor-mcp-via-http) | Servidor MCP via HTTP + chat cliente | `@modelcontextprotocol/server` + `@modelcontextprotocol/node` | `pnpm mcp` / `pnpm mcp:http` |
| [`src/mcp/stdio`](#srcmcpstdio--servidor-mcp-via-stdio) | Servidor MCP via stdio | `@modelcontextprotocol/server` | `pnpm mcp:stdio` |

---

## Requisitos

- **Node.js 24+**: o projeto roda arquivos `.ts` direto no Node (*type stripping*), sem etapa de build.
- **pnpm**: definido em `packageManager` no `package.json`.
- Conforme a implementação que você for usar:
  - **Gemini:** uma chave da API do Google AI.
  - **Claude:** uma chave da API da Anthropic.
  - **AI SDK e MCP via HTTP:** o [Claude Code](https://claude.com/claude-code) instalado e logado (`claude` no terminal). Não precisa de chave: o uso conta na sua conta do Claude Code.

## Instalação

```bash
pnpm install
cp .env.example .env
```

Preencha o `.env` com as chaves das implementações que for usar:

```env
GOOGLE_GEN_AI_API_KEY=sua-chave-do-google
ANTHROPIC_API_KEY=sua-chave-da-anthropic
```

O Node não lê o `.env` sozinho. Os scripts `chat:gemini` e `chat:claude` usam a flag `--env-file=.env` para carregá-lo, então rode sempre pelos scripts. As chaves são lidas em `src/config/env.ts`.

## Como usar o chat

Todos os chats funcionam do mesmo jeito:

```
Secretária pronta! Digite "sair" para encerrar.

Você: que dia é hoje?
Secretária: Hoje é quinta-feira, 1º de maio de 2025.

Você: quais eventos eu tenho nesse dia?
Secretária: Você tem o Feriado do Dia do Trabalhador e, às 13:00, um Churrasco em família.

Você: sair
```

O chat lembra o que já foi dito na conversa, então perguntas como "nesse dia" funcionam.

Exemplos de pedidos:

- "Que dia é hoje?"
- "Quais são meus compromissos de amanhã?"
- "Marque uma reunião com a Ana amanhã às 10:00"
- "Mude o churrasco para as 14:00"
- "Tenho algum email novo?"
- "Responda o email do Carlos dizendo que recebi o relatório"

---

## As ferramentas (tools)

As cinco implementações expõem as **mesmas 6 tools**. Só muda o formato em que cada SDK as declara.

### Agenda

| Tool | Parâmetros | O que faz | Retorno |
|---|---|---|---|
| `getTodayDate` | nenhum | Retorna a data de "hoje" da agenda | `"2025-05-01"` |
| `getEvents` | `date` (`yyyy-mm-dd`) | Lista os eventos de um dia | Lista de `{ title, time, attendees }` (vazia se não houver eventos) |
| `scheduleEvent` | `title`, `date` (`yyyy-mm-dd`), `time` (`HH:MM`), `attendees?` (lista de nomes) | Marca um novo evento | `"Evento adicionado com sucesso!"` |
| `rescheduleEvent` | `title`, `date` (`yyyy-mm-dd`), `newTime` (`HH:MM`) | Muda o horário de um evento existente, encontrado pelo título e pela data | `"Evento alterado com sucesso"` ou `"Evento não encontrado"` |

### Email

| Tool | Parâmetros | O que faz | Retorno |
|---|---|---|---|
| `getEmails` | nenhum | Lista os emails da caixa de entrada | Lista de `{ sender, message }` |
| `sendEmail` | `contact`, `message` | "Envia" um email: apenas imprime no terminal (`**Email enviado para ...`) | `"Email enviado!"` |

### Dados (mocks)

As tools trabalham sobre dados de exemplo em memória, em `src/mocks/`:

| Arquivo | Conteúdo |
|---|---|
| `days.ts` | A data de "hoje": `2025-05-01` |
| `calendar.ts` | Eventos de alguns dias, indexados por data (`{ "2025-05-01": [...] }`) |
| `email.ts` | Os emails da caixa de entrada |

**Os dados não são salvos.** As alterações (eventos marcados ou remarcados) valem enquanto o processo estiver rodando. Ao fechar o chat, tudo volta ao estado original.

A data de "hoje" é fixa no mock e difere da data real. Por isso, o prompt de sistema das versões que usam o Claude Code manda o modelo usar sempre o `getTodayDate`. Sem essa instrução, ele tende a usar a data do sistema.

---

## `src/gemini`: tool calling com o SDK do Gemini

```bash
pnpm chat:gemini
```

**Requer:** `GOOGLE_GEN_AI_API_KEY` no `.env`. **Modelo:** `gemini-2.5-flash`.

| Arquivo | Função |
|---|---|
| `main.ts` | Loop do chat e loop de tool calling |
| `tools/calendar.ts`, `tools/email.ts` | Tools no formato `IGeminiTool` (`function` + `declaration`) |

### Como funciona

Você mesmo controla o loop de tool calling:

```
Você digita ─► generateContent(histórico + tools)
                   │
                   ├─ resposta tem functionCalls? ─► executa cada função
                   │                                 └─► devolve functionResponse ─► generateContent de novo
                   │
                   └─ só texto ─► imprime a resposta
```

1. A pergunta entra no histórico (`contents`) como `{ role: "user", parts: [{ text }] }`.
2. `ai.models.generateContent` recebe o histórico inteiro e as declarações das tools em `config.tools`.
3. Se `response.functionCalls` vier preenchido, o código procura cada função pelo nome em `allFunctions` e a executa.
4. Os resultados voltam ao modelo como partes `functionResponse` e o modelo é chamado de novo.
5. Quando a resposta vem só com texto, ela é impressa e o chat espera a próxima pergunta.

### Formato das tools

```ts
declaration: {
  name: "getEvents",
  description: "Retorna os eventos do calendário para um determinado dia.",
  parameters: {
    type: Type.OBJECT,
    properties: { date: { type: Type.STRING, description: "..." } },
    required: ["date"],
  },
}
```

---

## `src/claude`: tool calling com o SDK da Anthropic

```bash
pnpm chat:claude
```

**Requer:** `ANTHROPIC_API_KEY` no `.env`. **Modelo:** `claude-opus-5-5`.

| Arquivo | Função |
|---|---|
| `main.ts` | Loop do chat e loop de tool calling |
| `tools/calendar.ts`, `tools/email.ts` | Tools no formato `IClaudeTool` (`function` + `declaration`) |

### Como funciona

O fluxo é o mesmo do Gemini, com o vocabulário da Messages API:

1. A pergunta entra em `messages` como `{ role: "user", content: query }`.
2. `client.beta.messages.create` recebe o histórico, as tools e um prompt de sistema.
3. O `response.content` inteiro é guardado no histórico como mensagem `assistant`, inclusive os blocos de *thinking* e de `tool_use`, não só o texto. A API exige que o histórico volte sem alterações.
4. Se houver blocos `tool_use`, cada tool é executada e o resultado volta como bloco `tool_result`, ligado ao `tool_use_id` do pedido. **Todos os resultados de uma rodada vão juntos numa única mensagem `user`.** Erros voltam com `is_error: true`.
5. Quando não há mais `tool_use`, os blocos de texto são impressos.

Além disso:

- **Recusa:** se o modelo recusar um pedido (`stop_reason: "refusal"`), o chat avisa e segue.
- **Fallback:** está ativado (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Se o modelo recusar, a API tenta de novo automaticamente em outro modelo. Para desligar, remova `betas` e `fallbacks` do `main.ts`.

### Formato das tools

```ts
declaration: {
  name: "getEvents",
  description: "Retorna os eventos do calendário para um determinado dia.",
  input_schema: {
    type: "object",
    properties: { date: { type: "string", description: "..." } },
    required: ["date"],
  },
}
```

Diferente do Gemini, o Claude exige `input_schema` mesmo em tools sem parâmetros (`{ type: "object", properties: {} }`).

---

## `src/ai-sdk`: tool calling via MCP com o AI SDK

```bash
pnpm chat
```

**Requer:** Claude Code instalado e logado. **Modelo:** `opus`, via Claude Code.

| Arquivo | Função |
|---|---|
| `main.ts` | Chat com `streamText` e o modelo `claudeCode` |
| `tools/calendar.ts`, `tools/email.ts` | Tools com `tool()` do AI SDK e schemas em Zod |

### Como funciona

O provider `ai-sdk-provider-claude-code` roda o **Claude Code** como modelo. Isso muda o jeito de usar tools:

- **As tools não vão no `streamText`:** o provider ignora o parâmetro `tools`, porque quem executa as tools é o próprio Claude Code. Por isso, `createAiSdkMcpServer` transforma as tools do AI SDK num **servidor MCP que roda dentro deste mesmo processo**, passado em `mcpServers`.
- **Nomes e permissões:** dentro do Claude Code, as tools viram `mcp__secretaria__<nome>` (por exemplo `mcp__secretaria__getEvents`) e são liberadas uma a uma em `allowedTools`.
- **Tools nativas desligadas:** `tools: []` impede o uso de Bash, Read, Edit etc. Ele só usa as tools da secretária.
- **Não há loop de tool calling no código:** o Claude Code chama as tools quantas vezes precisar.
- **Não há histórico no código:** cada chamada roda numa sessão do Claude Code, e o provider retoma essa sessão automaticamente nas chamadas seguintes feitas com o mesmo `model`. Por isso, cada turno manda só `prompt: query`. As sessões ficam salvas em `~/.claude/projects/`.

A resposta chega em streaming, lida de `result.stream`:

| Evento | O que o chat faz |
|---|---|
| `text-delta` | Escreve o texto no terminal conforme é gerado |
| `tool-call` | Mostra `[consultando getEvents...]` |
| `error` | Mostra o erro e volta para a próxima pergunta |

O stream precisa ser lido até o fim antes da próxima pergunta, porque é no final dele que o provider registra a sessão.

### Formato das tools

```ts
const getEvents = tool({
  description: "Retorna os eventos do calendário para um determinado dia.",
  inputSchema: z.object({
    date: z.string().describe("A data ..., no formato yyyy-mm-dd"),
  }),
  execute: async ({ date }) => calendar[date] ?? [],
});
```

O `ai-sdk-provider-claude-code` é um provider da comunidade, não oficial da Anthropic nem da Vercel.

---

## `src/mcp`: servidor MCP

As mesmas tools publicadas como um **servidor MCP** de verdade, que qualquer cliente MCP pode usar: Claude Code, Claude Desktop, IDEs etc.

| Arquivo | Função |
|---|---|
| `tools/calendar.ts`, `tools/email.ts` | `registerCalendarTools(server)` e `registerEmailTools(server)`: cadastram as tools com `server.registerTool` |
| `adapters/create-server.ts` | `createSecretariaServer()`: cria o `McpServer` com todas as tools. Usado pelos dois transportes |
| `stdio/server.ts` | Servidor via stdio |
| `http/server.ts` | Servidor via HTTP (`startHttpServer`) |
| `http/client.ts` | Chat que sobe o servidor HTTP e usa o Claude Code como cliente |

### Formato das tools

```ts
server.registerTool(
  "getEvents",
  {
    description: "Retorna os eventos do calendário para um determinado dia.",
    inputSchema: z.object({
      date: z.string().describe("A data ..., no formato yyyy-mm-dd"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ date }) => ({
    content: [{ type: "text", text: JSON.stringify(calendar[date] ?? []) }],
  }),
);
```

- **Validação:** o SDK converte o schema Zod para JSON Schema e valida os argumentos antes de chamar o callback. Argumentos inválidos voltam como erro de validação, sem executar a tool.
- **Retorno:** toda tool devolve um `CallToolResult` (`{ content: [...] }`). Objetos são enviados como texto JSON.
- **Erros:** `rescheduleEvent` devolve `isError: true` quando o evento não existe, para o cliente saber que a tool falhou.
- **Anotações:** `getTodayDate`, `getEvents` e `getEmails` são marcadas com `readOnlyHint: true`, e `rescheduleEvent` com `idempotentHint: true`. São dicas para o cliente, por exemplo para decidir o que pode rodar sem pedir confirmação.

### `src/mcp/stdio`: servidor MCP via stdio

```bash
pnpm mcp:stdio
```

Neste modo, **o cliente inicia o servidor** como processo filho e conversa com ele pelo stdin/stdout. Rodar o comando à mão só serve para conferir se ele sobe: o processo fica esperando mensagens do protocolo.

O projeto já registra esse servidor no Claude Code, no arquivo `.mcp.json` da raiz:

```json
{
  "mcpServers": {
    "secretaria": {
      "type": "stdio",
      "command": "node",
      "args": ["src/mcp/stdio/server.ts"]
    }
  }
}
```

Para usar no Claude Code:

1. Abra o Claude Code **na raiz do projeto**, porque o caminho no `.mcp.json` é relativo.
2. Na primeira vez, aprove o servidor `secretaria`.
3. Peça algo como "quais eventos tenho em 2025-05-01?". As tools aparecem como `mcp__secretaria__getEvents` etc.

Teste rápido, sem abrir o modo interativo:

```bash
claude -p "Que dia é hoje segundo a agenda?" \
  --mcp-config .mcp.json --strict-mcp-config \
  --allowedTools "mcp__secretaria" --tools ""
```

**Cuidado:** o stdout é o canal do protocolo. Qualquer `console.log` no servidor corrompe a comunicação, então os logs usam `console.error`, como faz o `sendEmail`.

**Limitação:** cada cliente inicia o seu próprio processo do servidor. Os dados em memória não são compartilhados entre processos, então um evento marcado num processo não aparece em outro.

### `src/mcp/http`: servidor MCP via HTTP

#### Chat completo (servidor + cliente)

```bash
pnpm mcp
```

**Requer:** Claude Code instalado e logado.

O `http/client.ts`:

1. Sobe o servidor HTTP **uma vez**, dentro do próprio processo, numa porta livre escolhida pelo sistema (`startHttpServer(0)`).
2. Passa a URL ao modelo `claudeCode`:
   ```ts
   mcpServers: { secretaria: { type: "http", url: mcpHttpServer.url } },
   allowedTools: ["mcp__secretaria"], // libera todas as tools do servidor
   ```
3. Roda o mesmo chat com streaming da versão `src/ai-sdk`.
4. No `sair`, fecha o servidor HTTP e o processo termina.

Como o servidor vive enquanto o chat estiver aberto, **a agenda é preservada entre as perguntas**, mesmo que cada pergunta inicie um Claude Code novo. Essa é a diferença em relação a usar o servidor stdio no chat: com stdio, cada pergunta iniciaria um servidor novo e as alterações se perderiam.

#### Só o servidor

```bash
pnpm mcp:http              # http://127.0.0.1:3333/mcp
PORT=4000 pnpm mcp:http    # outra porta
```

Assim, qualquer cliente MCP com suporte a Streamable HTTP pode se conectar. Por exemplo, para registrar no Claude Code:

```bash
claude mcp add --transport http secretaria-http http://127.0.0.1:3333/mcp
```

#### Detalhes do servidor

- **Transporte:** Streamable HTTP, com o `NodeStreamableHTTPServerTransport` do pacote `@modelcontextprotocol/node`, num endpoint único `/mcp`. Outras rotas respondem `404`.
- **Modo stateless:** um `McpServer` e um transporte são criados por requisição. O estado continua compartilhado porque fica nos mocks, que vivem no processo.
- **Segurança:** o servidor só escuta em `127.0.0.1`, então não fica visível na rede. Também recusa requisições cujo `Host` ou `Origin` não seja local, o que impede que um site aberto no navegador o acesse (*DNS rebinding*).

---

## Comparação

| | Gemini | Claude | AI SDK | MCP stdio | MCP HTTP |
|---|---|---|---|---|---|
| **Quem executa as tools** | Seu código | Seu código | Claude Code, via MCP no mesmo processo | O cliente MCP | O cliente MCP |
| **Loop de tool calling** | Manual | Manual | Automático | Do cliente | Do cliente (Claude Code no chat) |
| **Histórico da conversa** | Array `contents` | Array `messages` | Sessão do Claude Code | Do cliente | Sessão do Claude Code (no chat) |
| **Streaming da resposta** | Não | Não | Sim | — | Sim (no chat) |
| **Schema das tools** | `parameters` com `Type.*` | `input_schema` (JSON Schema) | Zod (`z.object`) | Zod (`z.object`) | Zod (`z.object`) |
| **Autenticação** | `GOOGLE_GEN_AI_API_KEY` | `ANTHROPIC_API_KEY` | Login do Claude Code | Do cliente | Login do Claude Code (no chat) |
| **Alterações na agenda duram** | Enquanto o chat estiver aberto | Enquanto o chat estiver aberto | Enquanto o chat estiver aberto | Enquanto o processo do servidor existir | Enquanto o servidor estiver aberto |

## Estrutura do projeto

```
src/
├── config/env.ts          # leitura das chaves do .env
├── mocks/                 # dados de exemplo (agenda, emails, data de hoje)
├── types/                 # tipos dos dados e das tools (IGeminiTool, IClaudeTool)
├── gemini/                # chat com o SDK do Gemini
├── claude/                # chat com o SDK da Anthropic
├── ai-sdk/                # chat com o AI SDK + Claude Code
└── mcp/
    ├── tools/             # tools no formato do servidor MCP
    ├── adapters/          # criação do McpServer
    ├── stdio/server.ts    # transporte stdio
    └── http/
        ├── server.ts      # transporte HTTP
        └── client.ts      # chat que usa o servidor HTTP
```

## Scripts

| Script | Comando |
|---|---|
| `pnpm chat:gemini` | `node --env-file=.env src/gemini/main.ts` |
| `pnpm chat:claude` | `node --env-file=.env src/claude/main.ts` |
| `pnpm chat` | `node src/ai-sdk/main.ts` |
| `pnpm mcp:stdio` | `node src/mcp/stdio/server.ts` |
| `pnpm mcp:http` | `node src/mcp/http/server.ts` |
| `pnpm mcp` | `node src/mcp/http/client.ts` |

Para checar os tipos: `pnpm exec tsc --noEmit`.
