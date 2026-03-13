import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeImage(file, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API Key is required. Please set it in Settings.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash for multimodal capabilities
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Convert file to base64 GoogleGenerativeAI.Part object
    const fileToGenerativePart = async (file) => {
      const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
      };
    };

    const imagePart = await fileToGenerativePart(file);

    const prompt = `
You are an AI dermatology screening assistant for an educational project. 
Analyze the provided image of a skin lesion. Identify any potential visible conditions, abnormalities, or points of interest.
Provide your analysis in a clear and structured manner.

Do not provide a definitive medical diagnosis.
Output your assessment in strictly valid JSON format with exactly three keys:
1. "risk_level": Must be exactly one of "Low", "Medium", or "High".
2. "observations": A brief explanation of what you see.
3. "disclaimer": A strong reminder to see a doctor and that this is not a medical diagnosis.
`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze image: " + error.message);
  }
}
