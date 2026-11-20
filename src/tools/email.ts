import { Type } from "@google/genai";
import { emails } from "../mocks/email";
import { IEmails, IInboxInputDTO } from "../types/email";
import { ITool } from "../types/tool";

const getEmail: ITool<void, IEmails> = {
  function: () => {
    return emails;
  },
  declaration: {
    name: "getEmails",
    description: "Retorna todos os emails na caixa de entrada",
  },
};

const sendEmail: ITool<IInboxInputDTO, string> = {
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
