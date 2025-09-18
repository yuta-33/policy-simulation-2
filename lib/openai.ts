import OpenAI from 'openai';
export function getClient(){
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}
export const EMBEDDING_MODEL = 'text-embedding-3-small';
