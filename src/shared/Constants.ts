import { OpenAIModel } from "@/types/Model";

export const LS_UUID = "@ls/uuid";

export const DEFAULT_OPENAI_MODEL = {
  name: "Gemini 1.5 Pro",
  id: "gemini-1.5-pro",
  available: true,
};

export const GPT4_OPENAI_MODEL = {
  name: "Gemini 1.5 Flash",
  id: "gemini-1.5-flash",
  available: true,
};

export const OPENAI_MODELS: OpenAIModel[] = [
  DEFAULT_OPENAI_MODEL,
  GPT4_OPENAI_MODEL,
];
