import { Type } from "@google/genai";
import { emails } from "../../mocks/email.ts";
import type { IEmails, IInboxInputDTO } from "../../types/email.ts";
import type { IGeminiTool } from "../../types/tool.ts";

const getEmail: IGeminiTool<void, IEmails> = {
  function: () => {
    return emails;
  },
  declaration: {
    name: "getEmails",
    description: "Retorna todos os emails na caixa de entrada",
  },
};

const sendEmail: IGeminiTool<IInboxInputDTO, string> = {
  function: ({ contact, message }) => {
    console.log(`**Email enviado para ${contact}: ${message}`);

    return "Email enviado!";
  },
  declaration: {
    name: "sendEmail",
    description: "Envia um email para um contato",
    parameters: {
      type: Type.OBJECT,
      properties: {
        contact: {
          type: Type.STRING,
          description: "O nome do contato para enviar a mensagem",
        },
        message: {
          type: Type.STRING,
          description: "A mensagem a ser enviada",
        },
      },
      required: ["contact", "message"],
    },
  },
};

export const emailDefinitions = [getEmail, sendEmail];
