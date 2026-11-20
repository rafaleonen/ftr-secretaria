import { FunctionDeclaration } from "@google/genai";

export interface ITool<T = any, K = unknown> {
  function: (args: T) => K;
  declaration: FunctionDeclaration;
}
