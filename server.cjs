var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("\u26A0\uFE0F GEMINI_API_KEY is not defined. Feedback will run in offline fallback mode.");
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/status", (req, res) => {
    res.json({
      geminiConnected: !!process.env.GEMINI_API_KEY,
      message: process.env.GEMINI_API_KEY ? "Connected to Gemini Oral Coach Server." : "Running in offline demo mode. Please set GEMINI_API_KEY in Secrets."
    });
  });
  app.post("/api/evaluate", async (req, res) => {
    const { questionId, questionText, userAnswer } = req.body;
    if (!questionText || userAnswer === void 0) {
      return res.status(400).json({ error: "Missing questionText or userAnswer in request body." });
    }
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer) {
      return res.json({
        isCorrect: false,
        score: 0,
        feedbackEs: "Parece que no has proporcionado ninguna respuesta. \xA1Int\xE9ntalo de nuevo!",
        grammarFeedback: "La respuesta est\xE1 vac\xEDa. Intenta responder usando las plantillas de ayuda abajo.",
        improvedAnswer: "I was born in...",
        alternativeAnswers: ["Yes, I was at home yesterday.", "No, I didn't."],
        grammarAlert: {
          mistake: "Respuesta vac\xEDa",
          correction: "Responde en ingl\xE9s",
          rule: "Siempre intenta elaborar una respuesta, de preferencia usando sujeto + verbo en pasado."
        }
      });
    }
    try {
      const ai = getGeminiClient();
      const prompt = `
        You are an expert, friendly English oral examiner evaluating a basic English student (English cycle IV).
        The student is practicing with exact questions from their final oral exam.
        The grammatical scope is the PAST SIMPLE, specifically focusing on the correct use of "was/were", "did/didn't", and regular/irregular verbs in the past.

        Here is the evaluation context:
        - Question ID: ${questionId || "Unknown"}
        - Question: "${questionText}"
        - User's Answer: "${trimmedAnswer}"

        Your job:
        1. Evaluate if they answered the question correctly (both grammatically acceptable and responding to the prompt logically).
        2. Give them a score from 0 (completely incorrect, incomprehensible, or not in English) to 10 (perfectly correct past tense response).
        3. Highlight any basic mistakes, especially:
          - Saying things like "I borned" or "I was borned" instead of "I was born" (born takes "was/were born").
          - Spelling errors with -ed verbs (e.g. "cryed", "studyed").
          - Misuse of was/were values (e.g. "I were born", "You was inside").
          - Double structure failures with "did/didn't" (e.g. "I didn't worked", "Did you went?").
          - Forgetting to put the verb in the past for affirmative answers (e.g. "I study English last year" or "I download a song").
        4. Provide encouraging, supportive feedback in Spanish ("feedbackEs"). Always praise their effort!
        5. Provide specific grammatical corrections in Spanish ("grammarFeedback") explaining any patterns they missed.
        6. Offer the single best simplified improvement ("improvedAnswer") that sounds natural but stays strictly within basic English level IV. Do not offer complex structures using past perfect or passive voice.
        7. Provide 2 simple alternative answers ("alternativeAnswers").
        8. If there was a major mistake in verbs or 'was/were', isolate it in 'grammarAlert' (otherwise set it to NULL).
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              isCorrect: { type: import_genai.Type.BOOLEAN, description: "Whether the answer is logically and grammatically acceptable (scores of 7+)." },
              score: { type: import_genai.Type.INTEGER, description: "Rating of the grammar and answering structure from 0 to 10." },
              feedbackEs: { type: import_genai.Type.STRING, description: "Friendly, encouraging summary of the user's answer and correction in Spanish, highlighting effort." },
              grammarFeedback: { type: import_genai.Type.STRING, description: "Detailed grammatical breakdown of any errors, or confirmation of correct past tense usage, in Spanish." },
              improvedAnswer: { type: import_genai.Type.STRING, description: "A grammatically correct, highly natural yet simple answer corresponding to basic English Level IV." },
              alternativeAnswers: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "2 alternative ways to answer this question naturally using basic English structures."
              },
              grammarAlert: {
                type: import_genai.Type.OBJECT,
                properties: {
                  mistake: { type: import_genai.Type.STRING, description: "The specific mistake found in the answer (e.g. 'I was borned')." },
                  correction: { type: import_genai.Type.STRING, description: "The correct form ('I was born')." },
                  rule: { type: import_genai.Type.STRING, description: "The rule explained briefly in Spanish." }
                },
                description: "An isolated alert for a specific past tense mistake. Return null or leave fields empty if there is no major mistake."
              }
            },
            required: ["isCorrect", "score", "feedbackEs", "grammarFeedback", "improvedAnswer", "alternativeAnswers"]
          }
        }
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini.");
      }
      const parsedJSON = JSON.parse(responseText.trim());
      return res.json(parsedJSON);
    } catch (err) {
      console.error("Gemini Evaluation error:", err);
      const isKeyMissing = err.message === "GEMINI_API_KEY_MISSING";
      let score = 5;
      let msgGrammar = "Estamos en modo offline de demostraci\xF3n o hubo un error con el servidor.";
      let improved = "I was born in Lima.";
      let grammarAlert = null;
      const lowerAnswer = trimmedAnswer.toLowerCase();
      if (questionText.toLowerCase().includes("where was") || questionText.toLowerCase().includes("where were")) {
        improved = "I was born in Tacna.";
        if (lowerAnswer.includes("borned")) {
          score = 4;
          grammarAlert = {
            mistake: "borned",
            correction: "born",
            rule: "En ingl\xE9s, no existe 'borned'. Decimos 'I was born'."
          };
          msgGrammar = "\xA1Cuidado! Usaste 'borned' lo cual no existe. Recuerda usar 'I was born in...'.";
        } else if (lowerAnswer.includes("was born") || lowerAnswer.includes("were born")) {
          score = 9;
          msgGrammar = "\xA1Excelente uso de 'was born'!";
        } else {
          score = 6;
          msgGrammar = "Para responder a 'Where', intenta usar la frase completa: 'I was born in ...'.";
        }
      } else if (questionText.toLowerCase().includes("did you")) {
        improved = "Yes, I did. I studied English.";
        if (lowerAnswer.includes("did studied") || lowerAnswer.includes("didn't studied")) {
          score = 4;
          grammarAlert = {
            mistake: "didn't studied",
            correction: "didn't study",
            rule: "Cuando usas el auxiliar 'did' o 'didn't', el verbo principal vuelve a su forma base (infinitivo)."
          };
          msgGrammar = "Recuerda que con el auxiliar 'didn't' o 'did' de pregunta, el verbo ya no lleva '-ed'.";
        } else if (lowerAnswer.includes("yes, i did") || lowerAnswer.includes("no, i didn't")) {
          score = 9;
          msgGrammar = "\xA1Muy buena respuesta corta usando el auxiliar 'did/didn't' correctamente!";
        }
      }
      return res.json({
        isCorrect: score >= 7,
        score,
        feedbackEs: isKeyMissing ? "\xA1Excelente intento de pr\xE1ctica! Tu respuesta se ha procesado con nuestro sistema de validaci\xF3n local porque no se ha configurado la clave de Gemini en Configuraci\xF3n > Secretos." : `\xA1Buen esfuerzo! (Validaci\xF3n local adaptativa debido a un retraso de red).`,
        grammarFeedback: msgGrammar,
        improvedAnswer: improved,
        alternativeAnswers: [improved, "Yes, I was there yesterday."],
        grammarAlert
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
