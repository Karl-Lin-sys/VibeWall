import { GoogleGenAI } from "@google/genai";

export async function generateImagesBase64(
  prompt: string,
  model: string,
  qualityOpts: { aspectRatio: string; imageSize: string },
  referenceImageBase64?: string
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const contents: any[] = [];
  
  if (referenceImageBase64) {
    contents.push({
      inlineData: {
        data: referenceImageBase64,
        mimeType: "image/png"
      }
    });
  }
  
  contents.push({ text: prompt });

  // Generate 4 images concurrently
  // (Since nano/pro image endpoints might only generate 1 at a time natively via generateContent)
  // We'll run 4 promises in parallel.
  const promises = Array.from({ length: 4 }).map(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: contents },
      config: {
        imageConfig: {
          aspectRatio: qualityOpts.aspectRatio,
          imageSize: qualityOpts.imageSize
        }
      }
    });

    let base64 = null;
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        base64 = part.inlineData.data;
        break;
      }
    }
    
    if (!base64) {
      throw new Error("No image data returned from model API.");
    }
    return base64;
  });

  const results = await Promise.allSettled(promises);
  
  // Extract successful generations
  const successes = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value);
    
  if (successes.length === 0) {
    const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    throw new Error(firstError?.reason?.message || "Failed to generate images");
  }

  return successes;
}
