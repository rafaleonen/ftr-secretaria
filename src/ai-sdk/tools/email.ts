import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { emails } from "../../mocks/email.ts";

const getEmails = tool({
  description: "Retorna todos os emails na caixa de entrada",
  inputSchema: z.object({}),
  execute: async () => emails,
});

const sendEmail = tool({
  description: "Envia um email para um contato",
  inputSchema: z.object({
    contact: z.string().describe("O nome do contato para enviar a mensagem"),
    message: z.string().describe("A mensagem a ser enviada"),
  }),
  execute: async ({ contact, message }) => {
    console.log(`**Email enviado para ${contact}: ${message}`);

    return "Email enviado!";
  },
});

export const emailTools: ToolSet = { getEmails, sendEmail };
