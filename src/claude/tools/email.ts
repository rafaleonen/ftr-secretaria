import { emails } from "../../mocks/email.ts";
import type { IEmails, IInboxInputDTO } from "../../types/email.ts";
import type { IClaudeTool } from "../../types/tool.ts";

const getEmail: IClaudeTool<void, IEmails> = {
  function: () => {
    return emails;
  },
  declaration: {
    name: "getEmails",
    description: "Retorna todos os emails na caixa de entrada",
    input_schema: { type: "object", properties: {} },
  },
};

const sendEmail: IClaudeTool<IInboxInputDTO, string> = {
  function: ({ contact, message }) => {
    console.log(`**Email enviado para ${contact}: ${message}`);

    return "Email enviado!";
  },
  declaration: {
    name: "sendEmail",
    description: "Envia um email para um contato",
    input_schema: {
      type: "object",
      properties: {
        contact: {
          type: "string",
          description: "O nome do contato para enviar a mensagem",
        },
        message: {
          type: "string",
          description: "A mensagem a ser enviada",
        },
      },
      required: ["contact", "message"],
    },
  },
};

export const emailDefinitions = [getEmail, sendEmail];
