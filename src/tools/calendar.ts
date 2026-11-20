import { Type } from "@google/genai";
import { ITool } from "../types/tool";
import { today } from "../mocks/days";
import { calendar } from "../mocks/calendar";
import {
  IDateInputDTO,
  IDateOutputDTO,
  IEventInputDTO,
  IEventOutputDTO,
  IRescheduleEventInputDTO,
} from "../types/calendar";

const getTodayDate: ITool<void, IDateOutputDTO> = {
  function: () => {
    return today;
  },
  declaration: {
    name: "getTodayDate",
    description: "Retorna a data de hoje no formato yyyy-mm-dd",
  },
};

const getEvents: ITool<IDateInputDTO, IEventOutputDTO[]> = {
  function: ({ date }) => {
    return calendar[date] ?? [];
  },
  declaration: {
    name: "getEvents",
    description: "Retorna os eventos do calendário para um determinado dia.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description:
            "A data para qual queremos retornar os eventos, no formato yyyy-mm-dd",
        },
      },
      required: ["date"],
    },
  },
};

const scheduleEvent: ITool<IEventInputDTO, string> = {
  function: ({ time, title, date, attendees }) => {
    const eventList = calendar[date] ?? [];
    eventList.push({
      title,
      time,
      attendees,
    });

    calendar[date] = eventList;

    return "Evento adicionado com sucesso!";
  },
  declaration: {
    name: "scheduleEvent",
    description: "Marca um novo evento na agenda",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "O título do evento",
        },
        date: {
          type: Type.STRING,
          description: "A data do evento, no formato yyyy-mm-dd",
        },
        time: {
          type: Type.STRING,
          description: "A hora do evento, no formato HH:MM",
        },
        attendees: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A hora do evento, no formato HH:MM",
        },
      },
      required: ["title", "date", "time"],
    },
  },
};

const rescheduleEvent: ITool<IRescheduleEventInputDTO, string> = {
  function: ({ date, newTime, title }) => {
    const eventList = calendar[date];

    if (!Array.isArray(eventList)) {
      return "Evento não encontrado";
    }

    const index = eventList.findIndex((event) => event.title === title);

    calendar[date][index].time = newTime;

    return "Evento alterado com sucesso";
  },
  declaration: {
    name: "rescheduleEvent",
    description: "Marca um novo evento na agenda",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "O título do evento",
        },
        date: {
          type: Type.STRING,
          description: "A data do evento, no formato yyyy-mm-dd",
        },
        newTime: {
          type: Type.STRING,
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
