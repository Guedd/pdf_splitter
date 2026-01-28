
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestSections = async (pdf: any, pageCount: number) => {
  // Extract text from the first few pages and middle pages to find chapter headings
  const samples = [];
  const maxPagesToSample = Math.min(pageCount, 10);
  
  for (let i = 1; i <= maxPagesToSample; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ').substring(0, 1000);
    samples.push(`Page ${i}: ${pageText}`);
  }

  const prompt = `Based on the following text samples from the first ${maxPagesToSample} pages of a PDF document, suggest a logical breakdown of sections. Return the start and end pages for each major section or chapter you can identify. The document has ${pageCount} total pages.
  
  Samples:
  ${samples.join('\n\n')}
  
  Current total pages: ${pageCount}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Descriptive name for the section' },
            startPage: { type: Type.INTEGER, description: 'Starting page number (1-indexed)' },
            endPage: { type: Type.INTEGER, description: 'Ending page number (1-indexed)' }
          },
          required: ['name', 'startPage', 'endPage']
        }
      }
    }
  });

  return JSON.parse(response.text);
};
