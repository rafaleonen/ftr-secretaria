import { Type, GoogleGenAI } from "@google/genai";
import { calendarDefinitions } from "./tools/calendar";
import { emailDefinitions } from "./tools/email";

const allDefinitions = [...calendarDefinitions, ...emailDefinitions];
const allDeclarations = allDefinitions.map((def) => def.declaration);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEN_AI_API_KEY });

const contents: any = [
  {
    role: "user",
    parts: [{ text: "que dia é hoje" }],
  },
];

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents,
  config: {
    tools: [
      {
        functionDeclarations: allDeclarations,
      },
    ],
  },
});

contents.push(response?.candidates?.[0]?.content);

console.log(contents);
