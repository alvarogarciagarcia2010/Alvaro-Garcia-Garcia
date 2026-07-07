import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Lazy initialize Gemini API client to prevent startup crash if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY environment variable is not defined. AI Chat will run in simulated mode.');
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI Chatbot Proxy using @google/genai
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const client = getGeminiClient();
      
      const systemInstruction = `Eres "Lumina AI", el asistente virtual premium inteligente de la clínica dental "Lumina Dental".
Tu tono de voz debe ser profesional, sumamente amable, tranquilizador y experto. 
Usa un lenguaje claro para explicar procedimientos dentales (Invisalign, implantes de titanio, limpieza dental, blanqueamiento LED, etc.).
Ayuda a los pacientes con:
1. Estimación de precios y financiamiento:
   - Limpieza Avanzada: Desde 65€
   - Ortodoncia Invisalign: Desde 2400€
   - Implante de Titanio Premium: Desde 850€ (corona y cirugía guiada 3D incluida)
   - Blanqueamiento LED: Desde 180€
   - Odontopediatría: Desde 50€
2. Consejos de higiene dental (cepillado, uso de hilo dental, enjuagues).
3. Orientación para reservas de citas (diles que pueden reservar directamente desde el portal en la pestaña "Mis Citas").
4. Respuesta a miedos comunes sobre dentistas (enfoque en sedación consciente y tecnología 3D indolora).

Mantén tus respuestas relativamente cortas, amigables, estructuradas con viñetas elegantes si es necesario, y siempre en español. No uses lenguaje técnico incomprensible.`;

      if (!client) {
        // Fallback simulation mode if GEMINI_API_KEY is not defined
        setTimeout(() => {
          let reply = `[Simulación] Hola, soy Lumina AI. (Llave API no configurada en este momento). `;
          if (message.toLowerCase().includes('precio') || message.toLowerCase().includes('cuanto') || message.toLowerCase().includes('€')) {
            reply += `En Lumina Dental ofrecemos tratamientos premium: Limpieza Avanzada por 65€, Ortodoncia Invisalign desde 2.400€, e Implantes de Titanio Premium desde 850€. ¿Te gustaría agendar una valoración gratuita?`;
          } else if (message.toLowerCase().includes('cita') || message.toLowerCase().includes('reservar')) {
            reply += `¡Por supuesto! Puedes registrarte o ingresar a tu Área Privada y reservar tu cita directamente seleccionando la fecha, doctor y tratamiento preferido en segundos.`;
          } else {
            reply += `¡Entendido! Estoy aquí para responder cualquier consulta sobre tu salud bucal, darte consejos de cepillado y guiarte con nuestros tratamientos avanzados. ¿En qué más te puedo ayudar?`;
          }
          res.json({ text: reply });
        }, 1200);
        return;
      }

      // Convert history to format expected by @google/genai
      // History is array of { role: 'user' | 'model', content: string }
      const contents = [];
      
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }]
          });
        }
      }
      
      // Append current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      console.log('Sending request to Gemini with model gemini-2.5-flash');
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "Lo siento, estoy teniendo dificultades para procesar tu consulta dental ahora mismo. ¿Puedes repetirla?";
      res.json({ text: replyText });

    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: 'Hubo un error al conectar con Lumina AI. Por favor, intenta de nuevo.' });
    }
  });

  // API Route: Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for SPA routing
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving built static files in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumina Dental Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Lumina Dental Server:', err);
});
