import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Dummy/Sample messy text mimicking a broken broker layout
const sampleMessyText = `
    ZERODHA BROKING LTD.
    DATE: 2026-06-20
    CLIENT ID: AJ7200
    --------------------------------------------------
    BILL DETAILS FOR EQUITY SEGMENT
    --------------------------------------------------
    Turnover: 1,50,000.00
    
    Here are the breakdown charges for your trades:
    - Exchange txn fee: 52.40 Rs
    - Government Stamp Duty charges applied: 15.00
    - Total Brokerage charged by Zerodha: 40.00 INR
    - Securities Transaction Tax (STT/CTT): 125.00
    
    Net amount payable/receivable: 14,200.00
    Thank you for trading with us.
`;

async function runSandboxTest() {
    console.log("🧠 Sending messy text to Gemini 2.0 Flash...");

    try {
        // We use gemini-2.0-flash because it's lightning fast and optimized for structured JSON outputs
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json" // 👈 FORCES Gemini to return pure JSON
            }
        });

        const prompt = `
            You are a precise financial data extraction engine. 
            Analyze the raw text from a broker statement PDF provided below and extract the hidden charges.
            
            You must return a valid JSON object matching this exact TypeScript interface:
            {
                "brokerage": number,
                "stt": number,
                "exchangeTransactionCharges": number,
                "stampDuty": number
            }

            Rules:
            1. Extract ONLY the numbers.
            2. If a charge is missing or not found, set its value to 0.
            3. Do not include any markdown formatting, wrappers, or text outside the JSON object.

            Raw Text:
            ${sampleMessyText}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log("\n✨ --- AI RAW RESPONSE ---");
        console.log(responseText);
        console.log("-------------------------\n");

        // Validate that it parses cleanly into an object
        const parsedData = JSON.parse(responseText);
        console.log("✅ Successfully parsed JSON object:", parsedData);
        console.log(`Brokerage is: ₹${parsedData.brokerage}`);

    } catch (error) {
        console.error("🚨 Sandbox Test Failed:", error);
    }
}

runSandboxTest();