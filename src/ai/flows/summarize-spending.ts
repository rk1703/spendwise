// Summarize spending habits using AI.

'use server';

/**
 * @fileOverview Summarizes user spending habits using AI.
 *
 * - summarizeSpending - A function that summarizes spending habits.
 * - SummarizeSpendingInput - The input type for the summarizeSpending function.
 * - SummarizeSpendingOutput - The return type for the summarizeSpending function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSpendingInputSchema = z.object({
  spendingData: z
    .string()
    .describe(
      'A JSON string containing an array of spending objects. Each object should have amount and category properties.'
    ),
});
export type SummarizeSpendingInput = z.infer<typeof SummarizeSpendingInputSchema>;

const SummarizeSpendingOutputSchema = z.object({
  summary: z.string().describe('A summary of the user spending habits.'),
});
export type SummarizeSpendingOutput = z.infer<typeof SummarizeSpendingOutputSchema>;

export async function summarizeSpending(input: SummarizeSpendingInput): Promise<SummarizeSpendingOutput> {
  return summarizeSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSpendingPrompt',
  input: {schema: SummarizeSpendingInputSchema},
  output: {schema: SummarizeSpendingOutputSchema},
  prompt: `You are a personal finance expert. Analyze the following spending data and provide a concise summary of the user's spending habits.

Spending Data: {{{spendingData}}}

Summary:`,
});

const summarizeSpendingFlow = ai.defineFlow(
  {
    name: 'summarizeSpendingFlow',
    inputSchema: SummarizeSpendingInputSchema,
    outputSchema: SummarizeSpendingOutputSchema,
  },
  async input => {
    try {
      // Attempt to parse the spending data.  If it fails, it will throw an
      // exception which will be caught and re-thrown with more context.
      JSON.parse(input.spendingData);
    } catch (e: any) {
      throw new Error(`Error parsing spendingData: ${e.message}`);
    }
    const {output} = await prompt(input);
    return output!;
  }
);
