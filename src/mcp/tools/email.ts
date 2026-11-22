import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { emails } from "../../mocks/email.ts";

export function registerEmailTools(server: McpServer) {
  server.registerTool(
    "getEmails",
    {
      description: "Retorna todos os emails na caixa de entrada",
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(emails) }],
    }),
  );

  server.registerTool(
    "sendEmail",
    {
      description: "Envia um email para um contato",
      inputSchema: z.object({
        contact: z
          .string()
          .describe("O nome do contato para enviar a mensagem"),
        message: z.string().describe("A mensagem a ser enviada"),
      }),
    },
    async ({ contact, message }) => {
      // Num servidor MCP via stdio, o stdout é o canal do protocolo:
      // qualquer log precisa ir para o stderr
      console.error(`**Email enviado para ${contact}: ${message}`);

      return { content: [{ type: "text", text: "Email enviado!" }] };
    },
  );
}
