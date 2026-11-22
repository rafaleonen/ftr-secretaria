import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { today } from "../../mocks/days.ts";
import { calendar } from "../../mocks/calendar.ts";

const getTodayDate = tool({
  description: "Retorna a data de hoje no formato yyyy-mm-dd",
  inputSchema: z.object({}),
  execute: async () => today,
});

const getEvents = tool({
  description: "Retorna os eventos do calendário para um determinado dia.",
  inputSchema: z.object({
    date: z
      .string()
      .describe(
        "A data para qual queremos retornar os eventos, no formato yyyy-mm-dd",
      ),
  }),
  execute: async ({ date }) => calendar[date] ?? [],
});

const scheduleEvent = tool({
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
  execute: async ({ title, date, time, attendees }) => {
    const eventList = calendar[date] ?? [];
    eventList.push({ title, time, attendees: attendees ?? [] });
    calendar[date] = eventList;

    return "Evento adicionado com sucesso!";
  },
});

const rescheduleEvent = tool({
  description: "Altera o horário de um evento existente na agenda",
  inputSchema: z.object({
    title: z.string().describe("O título do evento"),
    date: z.string().describe("A data do evento, no formato yyyy-mm-dd"),
    newTime: z.string().describe("A nova hora do evento, no formato HH:MM"),
  }),
  execute: async ({ title, date, newTime }) => {
    const event = calendar[date]?.find((event) => event.title === title);

    if (!event) {
      return "Evento não encontrado";
    }

    event.time = newTime;

    return "Evento alterado com sucesso";
  },
});

export const calendarTools: ToolSet = {
  getTodayDate,
  getEvents,
  scheduleEvent,
  rescheduleEvent,
};
