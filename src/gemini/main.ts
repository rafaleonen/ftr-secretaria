import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { calendarDefinitions } from "./tools/calendar.ts";
import { emailDefinitions } from "./tools/email.ts";
import readline from "readline/promises";
import env from "../config/env.ts";

const allDefinitions = [...calendarDefinitions, ...emailDefinitions];
const allDeclarations = allDefinitions.map((def) => def.declaration);
const allFunctions = Object.fromEntries(
  allDefinitions.map((def) => [def.declaration.name, def.function]),
);

const ai = new GoogleGenAI({ apiKey: env.googleGenApiKey });

// Histórico da conversa: é enviado inteiro a cada chamada para o modelo ter contexto
const contents: Content[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Secretária pronta! Digite "sair" para encerrar.\n');

while (true) {
  const query = (await rl.question("Você: ")).trim();

  if (!query) continue;
  if (query.toLowerCase() === "sair") break;

  contents.push({ role: "user", parts: [{ text: query }] });

  // O modelo pode pedir várias funções em sequência antes de responder com texto
  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        tools: [{ functionDeclarations: allDeclarations }],
      },
    });

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const functionCalls = response.functionCalls ?? [];

    if (functionCalls.length === 0) {
      console.log(`\nSecretária: ${response.text ?? "(sem resposta)"}\n`);
      break;
    }

    // Executa cada função pedida e devolve o resultado ao modelo
    const functionResponses: Part[] = functionCalls.map((call) => {
      const fn = allFunctions[call.name!];
      let result: unknown;

      try {
        result = fn
          ? fn(call.args)
          : { error: `Função ${call.name} não encontrada` };
      } catch (error) {
        result = { error: String(error) };
      }

      return {
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { result },
        },
      };
    });

    contents.push({ role: "user", parts: functionResponses });
  }
}

rl.close();
