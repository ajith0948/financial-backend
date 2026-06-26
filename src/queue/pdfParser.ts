import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function extractFinancialData(fileBuffer: Buffer) {
    const pdfData = await pdf(fileBuffer);
    
    // We are logging the raw text here to make sure it's actually reading the PDF
    console.log("📝 PDF TEXT LENGTH:", pdfData.text.length); 

    const prompt = `
    Analyze this text from a bank statement. Find the "Balance" amount.
    Return ONLY a raw JSON object with no markdown:
    {
      "category": "Bank Statement",
      "totalAmount": 116149.46,
      "extractedData": { "summary": "Detected bank statement" }
    }
    Text: ${pdfData.text.substring(0, 2000)}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}