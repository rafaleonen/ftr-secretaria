export type IInboxInputDTO = {
  contact: string;
  message: string;
};

export type IInboxOutputDTO = {
  sender: string;
  message: string;
};

export type IEmails = IInboxOutputDTO[];
