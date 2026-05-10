"use server";

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatInputSchema = z.object({
  message: z.string(),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string(),
  })).optional(),
  spendingData: z.string().optional(),
});

const ChatOutputSchema = z.object({
  response: z.string(),
});

export async function chatWithAI(input: z.infer<typeof ChatInputSchema>) {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const prompt = `You are SpendWise AI, a helpful personal finance assistant. 
    Use the following spending data to answer the user's questions if relevant. 
    Be concise, friendly, and professional. 
    If you don't have enough data, ask for more details.
    
    Spending Data: ${input.spendingData || "No data available."}
    
    User Message: ${input.message}`;

    // Using the default model (Gemini 3.1 Flash-Lite) configured in genkit.ts
    const { text } = await ai.generate({
      prompt: prompt,
    });

    return { response: text };
  }
);
