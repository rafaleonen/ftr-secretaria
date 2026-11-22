import type { IClaudeTool } from "../../types/tool.ts";
import { today } from "../../mocks/days.ts";
import { calendar } from "../../mocks/calendar.ts";
import type {
  IDateInputDTO,
  IDateOutputDTO,
  IEventInputDTO,
  IEventOutputDTO,
  IRescheduleEventInputDTO,
} from "../../types/calendar.ts";

const getTodayDate: IClaudeTool<void, IDateOutputDTO> = {
  function: () => {
    return today;
  },
  declaration: {
    name: "getTodayDate",
    description: "Retorna a data de hoje no formato yyyy-mm-dd",
    // No Claude, input_schema é obrigatório mesmo quando não há parâmetros
    input_schema: { type: "object", properties: {} },
  },
};

const getEvents: IClaudeTool<IDateInputDTO, IEventOutputDTO[]> = {
  function: ({ date }) => {
    return calendar[date] ?? [];
  },
  declaration: {
    name: "getEvents",
    description: "Retorna os eventos do calendário para um determinado dia.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "A data para qual queremos retornar os eventos, no formato yyyy-mm-dd",
        },
      },
      required: ["date"],
    },
  },
};

const scheduleEvent: IClaudeTool<IEventInputDTO, string> = {
  function: ({ time, title, date, attendees }) => {
    const eventList = calendar[date] ?? [];
    eventList.push({
      title,
      time,
      attendees: attendees ?? [],
    });

    calendar[date] = eventList;

    return "Evento adicionado com sucesso!";
  },
  declaration: {
    name: "scheduleEvent",
    description: "Marca um novo evento na agenda",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "O título do evento",
        },
        date: {
          type: "string",
          description: "A data do evento, no formato yyyy-mm-dd",
        },
        time: {
          type: "string",
          description: "A hora do evento, no formato HH:MM",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Os nomes dos participantes do evento",
        },
      },
      required: ["title", "date", "time"],
    },
  },
};

const rescheduleEvent: IClaudeTool<IRescheduleEventInputDTO, string> = {
  function: ({ date, newTime, title }) => {
    const event = calendar[date]?.find((event) => event.title === title);

    if (!event) {
      return "Evento não encontrado";
    }

    event.time = newTime;

    return "Evento alterado com sucesso";
  },
  declaration: {
    name: "rescheduleEvent",
    description: "Altera o horário de um evento existente na agenda",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "O título do evento",
        },
        date: {
          type: "string",
          description: "A data do evento, no formato yyyy-mm-dd",
        },
        newTime: {
          type: "string",
          description: "A nova hora do evento, no formato HH:MM",
        },
      },
      required: ["title", "date", "newTime"],
    },
  },
};

export const calendarDefinitions = [
  getTodayDate,
  getEvents,
  scheduleEvent,
  rescheduleEvent,
];
