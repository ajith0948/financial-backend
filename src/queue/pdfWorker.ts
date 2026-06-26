import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { StatementModel } from '../models/Statement.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PDFParser from 'pdf2json';

// Initialize Gemini with your .env API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost', // The crucial fix
    port: 6379,
    maxRetriesPerRequest: null
});

export const pdfWorker = new Worker('pdf-parsing-queue', async job => {
    console.log(`\n⚙️ [Worker] Processing file with Gemini AI: ${job.data.fileName}...`);

    try {
        const { fileBuffer, fileName, userId, folderId, customApiKey } = job.data;

        // 1. Decode the base64 file buffer from the queue
        const buffer = Buffer.from(fileBuffer, 'base64');
        
        // 2. Extract raw text using pdf2json
        const text: string = await new Promise((resolve, reject) => {
            const pdfParser = new PDFParser(null, 1);
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => {
                resolve(pdfParser.getRawTextContent());
            });
            pdfParser.parseBuffer(buffer);
        });

        console.log(`🧠 Text extracted from PDF via pdf-parse. Sending payload to Gemini...`);

        // 3. Configure Gemini to enforce strict JSON output matching our schema
        const aiClient = customApiKey ? new GoogleGenerativeAI(customApiKey) : genAI;
        const model = aiClient.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `
            You are a precise financial data extraction engine. 
            Analyze the raw text from a broker statement PDF provided below and extract the hidden charges.
            
            You must return a valid JSON object matching this exact structure:
            {
                "brokerage": number,
                "stt": number,
                "exchangeTransactionCharges": number,
                "stampDuty": number
            }

            Rules:
            1. Extract ONLY the numbers.
            2. If a charge is missing, not explicitly named, or not found, set its value to 0.
            3. Do not include any markdown formatting, wrappers, or text outside the JSON object.

            Raw Text:
            ${text.substring(0, 6000)}
        `;

        const aiResult = await model.generateContent(prompt);
        const responseText = aiResult.response.text();
        
        // 4. Parse the clean JSON object given by AI
        const extractedData = JSON.parse(responseText);

        const totalCharges = (extractedData.brokerage || 0) + 
                            (extractedData.stt || 0) + 
                            (extractedData.exchangeTransactionCharges || 0) + 
                            (extractedData.stampDuty || 0);

        // 5. Save the structured AI data directly into MongoDB
        await StatementModel.create({
            userId,
            folderId: folderId || undefined,
            originalFileName: fileName,
            category: 'Trading',
            totalAmount: totalCharges,
            extractedData: {
                brokerage: extractedData.brokerage || 0,
                sttCharges: extractedData.stt || 0,
                stampDuty: extractedData.stampDuty || 0,
                exchangeTransactionCharges: extractedData.exchangeTransactionCharges || 0,
                summary: `Successfully parsed trading statement via background queue.`
            },
            processedAt: new Date()
        });

        console.log(`✅ [Worker] AI Extraction Successful! Saved to DB for user ${userId}:`);
        console.log(`   - Brokerage: ₹${extractedData.brokerage}`);
        console.log(`   - STT: ₹${extractedData.stt}`);
        console.log(`   - Exchange Charges: ₹${extractedData.exchangeTransactionCharges}`);
        console.log(`   - Stamp Duty: ₹${extractedData.stampDuty}\n`);

    } catch (error) {
        console.error(`🚨 [Worker] AI Processing Failed for ${job.data.fileName}:`, error);
        throw error; 
    }
}, { connection: redisConnection });