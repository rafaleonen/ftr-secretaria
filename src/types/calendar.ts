export type IDateInputDTO = { date: string };
export type IDateOutputDTO = string;

export type IEventInputDTO = {
  title: string;
  date: string;
  time: string;
  attendees: string[];
};

export type IEventOutputDTO = {
  title: string;
  time: string;
  attendees: string[];
};

export type IRescheduleEventInputDTO = {
  title: string;
  date: string;
  newTime: string;
};

export type ICalendar = {
  [key: string]: IEventOutputDTO[];
};
