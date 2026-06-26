import { PDFParse } from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// 🛡️ Helper function to extract text cleanly using pdf-parse
const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();
    return result.text;
};

export async function extractFinancialData(fileBuffer: Buffer, customApiKey?: string) {
    try {
        console.log("📄 Extracting text from PDF using pdf-parse...");
        
        // 1. Get raw text using the new bulletproof method
        const rawText = await extractTextFromPDF(fileBuffer);
        
        console.log(`📝 SUCCESS: Extracted ${rawText.length} characters of text!`);

        // 2. Ask Gemini to analyze the text
        const prompt = `
Analyze this text from a financial statement document. 
Identify what type of document it is and find the total final value or final balance.

Return ONLY a raw JSON object with no markdown code blocks:
{
  "category": "<You MUST choose exactly one of these words: 'Trading', 'Vehicle', 'Retail', or 'Others'. Choose 'Others' if the document does not clearly fit the other categories. Do not invent new categories>",
  "totalAmount": <the final balance or total amount found as a clean number>,
  "extractedData": { "summary": "A brief execution summary." }
}
Text: ${rawText.substring(0, 3000)}
`;

        console.log("🧠 Handing off to Gemini AI...");
        const aiClient = customApiKey ? new GoogleGenerativeAI(customApiKey) : genAI;
        const model = aiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        
        // Clean the markdown blocks if Gemini adds them
        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(responseText);

    } catch (error) {
        console.error("❌ PDF Processing Error:", error);
        throw error; 
    }
}