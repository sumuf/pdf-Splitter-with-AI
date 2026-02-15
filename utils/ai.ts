import { GoogleGenAI, Type } from "@google/genai";
import { SplitGroup } from '../types';

export const generateChapterSuggestions = async (
  pageTexts: { page: number; text: string }[]
): Promise<SplitGroup[]> => {
  
  // Initialize Gemini
  // API Key must be in process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare the context for the model
  const contextString = pageTexts
    .map(p => `[Page ${p.page}]: ${p.text}`)
    .join('\n\n');

  const prompt = `
    Analyze the following text extracted from a PDF document page by page. 
    Identify the start and end pages of logical chapters, sections, or parts based on headings (e.g., "Chapter 1", "Introduction", "Index").
    
    Rules:
    1. Create a logical grouping of the document.
    2. Groups should not overlap (unless necessary for context).
    3. Return a clean list of groups.
    4. Group names should be descriptive (e.g., "Chapter 1: The Beginning").
    5. The 'range' field must be a valid page range string (e.g., "1-5", "6-10", "11, 13").
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { text: contextString }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              range: { type: Type.STRING }
            },
            required: ["name", "range"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    
    // Map to SplitGroup interface with IDs
    return result.map((item: any) => ({
      id: crypto.randomUUID(),
      name: item.name,
      range: item.range
    }));

  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("Failed to analyze document structure. Ensure API Key is configured.");
  }
};