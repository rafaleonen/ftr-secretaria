import type { FunctionDeclaration } from "@google/genai";
import type Anthropic from "@anthropic-ai/sdk";

export interface IGeminiTool<T = any, K = unknown> {
  function: (args: T) => K;
  declaration: FunctionDeclaration;
}

export interface IClaudeTool<T = any, K = unknown> {
  function: (args: T) => K;
  declaration: Anthropic.Beta.BetaTool;
}
