import { streamText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";
import readline from "readline/promises";
import { startHttpServer } from "./server.ts";

const SERVER_NAME = "secretaria";

// Sobe o servidor MCP via HTTP UMA vez, dentro deste processo. Assim a agenda
// em memória dura a conversa toda, mesmo que cada pergunta inicie um processo
// novo do Claude Code. Porta 0 = o sistema escolhe uma porta livre.
const mcpHttpServer = await startHttpServer(0);

const model = claudeCode("opus", {
  systemPrompt:
    "Você é uma secretária virtual. Use as ferramentas disponíveis para consultar e alterar a agenda e os emails do usuário. " +
    "A data de hoje é sempre a retornada pela ferramenta getTodayDate; ignore a data do sistema. " +
    "Responda em português, de forma breve.",
  // O Claude Code já é um cliente MCP: passamos a URL do servidor e ele se
  // conecta sozinho a cada pergunta
  mcpServers: {
    [SERVER_NAME]: { type: "http", url: mcpHttpServer.url },
  },
  // "mcp__<servidor>" libera todas as tools desse servidor de uma vez
  allowedTools: [`mcp__${SERVER_NAME}`],
  // Desliga as tools nativas do Claude Code (Bash, Read, Edit...)
  tools: [],
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Secretária pronta! Digite "sair" para encerrar.\n');

while (true) {
  const query = (await rl.question("Você: ")).trim();

  if (!query) continue;
  if (query.toLowerCase() === "sair") break;

  try {
    // Não precisamos de loop de tools aqui: o Claude Code chama as tools
    // quantas vezes precisar e vai mandando o texto conforme escreve.
    // Também não reenviamos o histórico: cada chamada roda numa sessão do
    // Claude Code, e o provider retoma essa sessão automaticamente nas
    // chamadas seguintes feitas com o mesmo `model`.
    const result = streamText({ model, prompt: query });

    process.stdout.write("\nSecretária: ");
    let atLineStart = false;

    // O stream precisa ser lido até o fim antes da próxima pergunta: é no
    // final dele que o provider registra a sessão para retomar a conversa
    for await (const part of result.stream) {
      switch (part.type) {
        case "text-delta":
          process.stdout.write(part.text);
          atLineStart = part.text.endsWith("\n");
          break;
        case "tool-call": {
          // As tools chegam como "mcp__secretaria__getEvents"; mostramos só o nome
          const toolName = part.toolName.split("__").pop();
          process.stdout.write(
            `${atLineStart ? "" : "\n"}[consultando ${toolName}...]\n`,
          );
          atLineStart = true;
          break;
        }
        case "error":
          throw part.error;
      }
    }

    process.stdout.write("\n\n");
  } catch (error) {
    console.error(`\nErro ao falar com o Claude Code: ${String(error)}\n`);
  }
}

rl.close();
// Sem isso, o servidor HTTP manteria o processo vivo depois do "sair"
await mcpHttpServer.close();
