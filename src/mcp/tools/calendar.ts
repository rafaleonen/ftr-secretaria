import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { today } from "../../mocks/days.ts";
import { calendar } from "../../mocks/calendar.ts";

// Toda tool MCP devolve um CallToolResult: uma lista de blocos de conteúdo.
// Objetos são enviados como texto JSON.
const toResult = (data: unknown): CallToolResult => ({
  content: [
    {
      type: "text",
      text: typeof data === "string" ? data : JSON.stringify(data),
    },
  ],
});

export function registerCalendarTools(server: McpServer) {
  server.registerTool(
    "getTodayDate",
    {
      description: "Retorna a data de hoje no formato yyyy-mm-dd",
      annotations: { readOnlyHint: true },
    },
    // Sem inputSchema, o callback recebe só o `ctx` (não há argumentos)
    async () => toResult(today),
  );

  server.registerTool(
    "getEvents",
    {
      description: "Retorna os eventos do calendário para um determinado dia.",
      // O inputSchema é um z.object(...); o SDK converte para JSON Schema e
      // valida os argumentos antes de chamar o callback
      inputSchema: z.object({
        date: z
          .string()
          .describe(
            "A data para qual queremos retornar os eventos, no formato yyyy-mm-dd",
          ),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ date }) => toResult(calendar[date] ?? []),
  );

  server.registerTool(
    "scheduleEvent",
    {
      description: "Marca um novo evento na agenda",
      inputSchema: z.object({
        title: z.string().describe("O título do evento"),
        date: z.string().describe("A data do evento, no formato yyyy-mm-dd"),
        time: z.string().describe("A hora do evento, no formato HH:MM"),
        attendees: z
          .array(z.string())
          .optional()
          .describe("Os nomes dos participantes do evento"),
      }),
    },
    async ({ title, date, time, attendees }) => {
      const eventList = calendar[date] ?? [];
      eventList.push({ title, time, attendees: attendees ?? [] });
      calendar[date] = eventList;

      return toResult("Evento adicionado com sucesso!");
    },
  );

  server.registerTool(
    "rescheduleEvent",
    {
      description: "Altera o horário de um evento existente na agenda",
      inputSchema: z.object({
        title: z.string().describe("O título do evento"),
        date: z.string().describe("A data do evento, no formato yyyy-mm-dd"),
        newTime: z.string().describe("A nova hora do evento, no formato HH:MM"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ title, date, newTime }) => {
      const event = calendar[date]?.find((event) => event.title === title);

      if (!event) {
        // isError avisa o cliente que a tool falhou, sem derrubar o servidor
        return { ...toResult("Evento não encontrado"), isError: true };
      }

      event.time = newTime;

      return toResult("Evento alterado com sucesso");
    },
  );
}
