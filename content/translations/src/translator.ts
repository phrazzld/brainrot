// src/translator.ts
import OpenAI from "openai";
import { flexibleChunkText } from "./chunk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

// your original sets, plus gemini-pro in OPENROUTER_MODELS
const OPENAI_MODELS = ["o3-mini", "o1", "gpt-4o"];
// we keep references to openrouter if you still want to use them:
const OPENROUTER_MODELS = ["deepseek/deepseek-r1", "google/gemini-pro-1.5"];

const MAX_RETRIES = 3;

export interface TranslateOptions {
   openaiApiKey?: string;
   openrouterApiKey?: string;
   model: string;
   notes?: string;
}

// we still keep the openrouter helper if you want to do normal meltdown translations using openrouter
export function createOpenRouterClient(openrouterApiKey: string): OpenAI {
   return new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
   });
}

function instantiateOpenAiClient(opts: TranslateOptions): OpenAI {
   const { model, openaiApiKey, openrouterApiKey } = opts;
   console.log(`using model: ${model}`);

   if (OPENAI_MODELS.includes(model)) {
      if (!openaiApiKey) {
         throw new Error("missing OPENAI_API_KEY for openai model");
      }
      return new OpenAI({ apiKey: openaiApiKey });
   } else if (OPENROUTER_MODELS.includes(model)) {
      if (!openrouterApiKey) {
         throw new Error("missing OPENROUTER_API_KEY for openrouter usage");
      }
      console.log("using openrouter configuration with baseURL https://openrouter.ai/api/v1");
      return createOpenRouterClient(openrouterApiKey);
   }
   throw new Error(`unknown or unsupported model: '${model}'`);
}

async function callChatCompletion(
   client: OpenAI,
   model: string,
   systemPrompt: string,
   userPrompt: string,
   temperature: number
): Promise<string> {
   console.log(
      `calling chat completion for model ${model} with ${["o3-mini", "o1"].includes(model) ? "reasoning_effort" : "temperature: " + temperature
      }`
   );

   const response = await client.chat.completions.create({
      model,
      messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt },
      ],
      ...(["o3-mini", "o1"].includes(model)
         ? { reasoning_effort: "high" }
         : { temperature }),
   });

   const choice = response.choices[0];
   if (!choice || !choice.message || !choice.message.content) {
      throw new Error("no content returned from openai");
   }
   console.log(`chat completion returned content length ${choice.message.content.length}`);
   return choice.message.content;
}

async function translateChunkWithRetries(
   client: OpenAI,
   systemPrompt: string,
   userPrompt: string,
   chunk: string,
   model: string,
   temperature: number,
   chunkIndex: number,
   chunkCount: number
): Promise<string> {
   let attempts = 0;
   while (attempts < MAX_RETRIES) {
      attempts++;
      try {
         console.log(`translating chunk ${chunkIndex}/${chunkCount}, attempt ${attempts}...`);
         const text = `${userPrompt}

---

original text chunk:

${chunk}`;
         const result = await callChatCompletion(client, model, systemPrompt, text, temperature);
         console.log(`chunk ${chunkIndex} translated successfully (length ${result.length})`);
         return result;
      } catch (err) {
         console.warn(`error in chunk ${chunkIndex}/${chunkCount} (attempt ${attempts}): ${String(err)}`);
         if (attempts >= MAX_RETRIES) {
            throw err;
         }
         // small delay before retry
         await new Promise((r) => setTimeout(r, 3000));
      }
   }
   throw new Error("exceeded max retries");
}

export async function translateFullText(
   text: string,
   author: string,
   title: string,
   opts: TranslateOptions
): Promise<string> {
   const { model, notes = "" } = opts;
   console.log(`starting translation for "${title}" by ${author} using model ${model}`);
   const client = instantiateOpenAiClient(opts);
   const chunks = flexibleChunkText(text);
   console.log(`split text into ${chunks.length} chunk(s)`);
   const systemPrompt = buildSystemPrompt(author, title, notes);
   const userPrompt = buildUserPrompt(author, title);

   const translations: string[] = [];
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`translating chunk ${i + 1}/${chunks.length} (size ${chunk.length})`);
      const chunkTranslation = await translateChunkWithRetries(
         client,
         systemPrompt,
         userPrompt,
         chunk,
         model,
         0.6,
         i + 1,
         chunks.length
      );
      translations.push(chunkTranslation);
   }
   const combined = translations.join("\n\n");
   console.log(`final translated text length: ${combined.length}`);
   return combined;
}

// re-export if needed
export { callChatCompletion, translateChunkWithRetries };
