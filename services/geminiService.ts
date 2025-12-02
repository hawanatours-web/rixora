
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    // This value is replaced at build time by Vite
    const key = process.env.API_KEY;
    
    if (!key) {
        console.error("Gemini Service: API Key is missing. Please check your Vercel Environment Variables (API_KEY or VITE_API_KEY) and redeploy.");
        return null;
    }
    
    // Debug log (safe version)
    console.log("Gemini Service: API Key present (Starts with " + key.substring(0, 4) + "...)");
    
    return new GoogleGenAI({ apiKey: key });
};

export const analyzeFinancialQuery = async (query: string, contextData: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) return "عذراً، مفتاح الربط مع الذكاء الاصطناعي مفقود (API Key Missing). يرجى التأكد من الإعدادات.";

    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      أنت مساعد مالي ذكي ومتخصص في أنظمة المحاسبة لشركات السياحة.
      تتحدث اللغة العربية بطلاقة ومهنية.
      
      دورك هو مساعدة المستخدم في فهم البيانات المالية، تقديم نصائح لتحسين الربحية، أو الإجابة عن أسئلة محاسبية.
      استخدم البيانات السياقية المقدمة (JSON) للإجابة بدقة عن وضع الشركة الحالي.
      
      إذا كان السؤال خارج نطاق البيانات المالية أو السياحة، اعتذر بلطف ووجه المستخدم للأسئلة ذات الصلة.
      اجعل إجاباتك موجزة ومفيدة.
    `;

    const prompt = `
      سياق البيانات المالية الحالية (JSON):
      ${contextData}

      سؤال المستخدم:
      ${query}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        // Removed thinkingConfig to avoid potential conflicts with Flash model defaults or budget 0 issues
      },
    });

    return response.text || "عذراً، لم أتمكن من تحليل البيانات في الوقت الحالي.";
  } catch (error: any) {
    console.error("Gemini API Connection Error:", error);
    return `حدث خطأ أثناء الاتصال بالمساعد الذكي: ${error.message || 'Unknown error'}`;
  }
};

// --- NEW FUNCTION: Flight Details Fetcher ---
export const getFlightDetails = async (flightNo: string, date: string): Promise<any> => {
    try {
        const ai = getClient();
        if (!ai) return null;

        // Using Pro model for better search reasoning + grounding if available, otherwise fallback
        const model = 'gemini-2.5-flash'; 
        
        const prompt = `
            Find the flight schedule/status for flight number "${flightNo}" on date "${date}".
            
            I need the standard scheduled departure and arrival times, the airline name, and the route (Origin Airport Code - Destination Airport Code).
            
            Return ONLY a raw JSON object (no markdown, no explanation) with this exact structure:
            {
                "airline": "String (e.g. Royal Jordanian)",
                "departureTime": "HH:MM (24-hour format)",
                "arrivalTime": "HH:MM (24-hour format)",
                "route": "XXX-YYY (e.g. AMM-DXB)",
                "aircraft": "String (optional, e.g. Airbus A320)"
            }
            
            If you cannot find specific details, try to infer the standard schedule for this flight number.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }], // Enable Grounding
            }
        });

        const text = response.text;
        if (!text) return null;

        try {
            // Clean up json markdown if present
            let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Extract JSON object if there's extra text
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse flight JSON", e);
            console.log("Raw response text:", text);
            return null;
        }

    } catch (error) {
        console.error("Flight Fetch Error:", error);
        return null;
    }
};

// --- NEW FUNCTION: Hotel Details Fetcher ---
export const getHotelDetails = async (hotelName: string, city?: string): Promise<any> => {
    try {
        const ai = getClient();
        if (!ai) return null;

        const model = 'gemini-2.5-flash'; 
        
        const prompt = `
            Find the full address and location for the hotel named "${hotelName}" ${city ? `in ${city}` : ''}.
            
            Return ONLY a raw JSON object (no markdown, no explanation) with this exact structure:
            {
                "address": "Full Address String",
                "city": "City Name",
                "country": "Country Name"
            }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }], // Enable Grounding
            }
        });

        const text = response.text;
        if (!text) return null;

        try {
            let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse hotel JSON", e);
            return null;
        }

    } catch (error) {
        console.error("Hotel Fetch Error:", error);
        return null;
    }
};
