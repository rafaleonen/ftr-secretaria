import Anthropic from "@anthropic-ai/sdk";
import { calendarDefinitions } from "./tools/calendar.ts";
import { emailDefinitions } from "./tools/email.ts";
import readline from "readline/promises";
import env from "../config/env.ts";

const allDefinitions = [...calendarDefinitions, ...emailDefinitions];
const allDeclarations = allDefinitions.map((def) => def.declaration);
// Mapa nome -> função. Cada tool tem um tipo de argumento diferente, então o
// mapa aceita "any": quem valida o formato do input é o input_schema da tool
const allFunctions: Record<string, (args: any) => unknown> = Object.fromEntries(
  allDefinitions.map((def) => [def.declaration.name, def.function]),
);

const client = new Anthropic({ apiKey: env.anthropicApiKey });

// Histórico da conversa: o Claude é stateless, então enviamos tudo a cada chamada
const messages: Anthropic.Beta.BetaMessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Secretária pronta! Digite "sair" para encerrar.\n');

while (true) {
  const query = (await rl.question("Você: ")).trim();

  if (!query) continue;
  if (query.toLowerCase() === "sair") break;

  messages.push({ role: "user", content: query });

  // O modelo pode pedir várias tools em sequência antes de responder com texto
  while (true) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system:
        "Você é uma secretária virtual. Use as ferramentas disponíveis para consultar e alterar a agenda e os emails do usuário. Responda em português, de forma breve.",
      tools: allDeclarations,
      messages,
      // Se o modelo recusar o pedido, a API tenta de novo em um modelo de fallback
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    // Guardamos o content inteiro (inclusive blocos de thinking e tool_use),
    // não só o texto: a API exige que o histórico volte sem alterações
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "refusal") {
      console.log("\nSecretária: (o modelo recusou esse pedido)\n");
      break;
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      const text = response.content
        .filter(
          (block): block is Anthropic.Beta.BetaTextBlock =>
            block.type === "text",
        )
        .map((block) => block.text)
        .join("");

      console.log(`\nSecretária: ${text || "(sem resposta)"}\n`);
      break;
    }

    // Executa cada tool pedida; todos os resultados vão em UMA mensagem de usuário
    const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map(
      (toolUse) => {
        const fn = allFunctions[toolUse.name];

        if (!fn) {
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Função ${toolUse.name} não encontrada`,
          };
        }

        try {
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(fn(toolUse.input)),
          };
        } catch (error) {
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: String(error),
          };
        }
      },
    );

    messages.push({ role: "user", content: toolResults });
  }
}

rl.close();
