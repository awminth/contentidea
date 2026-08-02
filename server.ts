import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  listIdeas,
  createIdeas,
  markIdeaPosted,
  markIdeaUnposted,
  deleteIdea,
  deleteIdeas,
  setIdeasPostedStatus,
  getPreviousWeekPosted,
  testDbConnection,
  ensureSchema,
} from "./db";

dotenv.config();

// Local default 6100 (Chrome blocks 6000). Render/hosting injects PORT.
const PORT = Number(process.env.PORT) || 6100;

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenAI | null {
  if (!ai && apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Gemini client successfully initialized.");
    } catch (err) {
      console.error("Failed to initialize Gemini client:", err);
    }
  }
  return ai;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  try {
    await ensureSchema();
    console.log("Database schema ready (plan_from / plan_to).");
  } catch (err) {
    console.warn("ensureSchema skipped (DB may be offline):", err);
  }

  app.get("/api/health", async (_req, res) => {
    let dbOk = false;
    try {
      dbOk = await testDbConnection();
    } catch (err) {
      console.error("DB health check failed:", err);
    }
    res.json({
      status: "ok",
      geminiConfigured: !!apiKey && apiKey !== "MY_GEMINI_API_KEY",
      dbConnected: dbOk,
    });
  });

  app.get("/api/ideas", async (_req, res) => {
    try {
      const ideas = await listIdeas();
      res.json({ ideas });
    } catch (error: any) {
      console.error("List ideas error:", error);
      res.status(500).json({ error: "Failed to load ideas", details: error.message });
    }
  });

  app.post("/api/ideas", async (req, res) => {
    try {
      const { ideas, planFrom, planTo } = req.body;
      if (!Array.isArray(ideas) || ideas.length === 0) {
        return res.status(400).json({ error: "ideas array is required" });
      }
      const created = await createIdeas(ideas, planFrom, planTo);
      res.json({ ideas: created });
    } catch (error: any) {
      console.error("Create ideas error:", error);
      res.status(500).json({ error: "Failed to save ideas", details: error.message });
    }
  });

  app.post("/api/ideas/bulk-status", async (req, res) => {
    try {
      const { ids, posted } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const affected = await setIdeasPostedStatus(
        ids.map(Number).filter(Boolean),
        !!posted
      );
      res.json({ success: true, affected });
    } catch (error: any) {
      console.error("Bulk status error:", error);
      res.status(500).json({ error: "Failed to update status", details: error.message });
    }
  });

  app.post("/api/ideas/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const affected = await deleteIdeas(ids.map(Number).filter(Boolean));
      res.json({ success: true, affected });
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      res.status(500).json({ error: "Failed to delete ideas", details: error.message });
    }
  });

  app.post("/api/ideas/:id/posted", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const ok = await markIdeaPosted(id);
      if (!ok) return res.status(404).json({ error: "Idea not found" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark posted error:", error);
      res.status(500).json({ error: "Failed to mark as posted", details: error.message });
    }
  });

  app.post("/api/ideas/:id/unposted", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const ok = await markIdeaUnposted(id);
      if (!ok) return res.status(404).json({ error: "Idea not found" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark unposted error:", error);
      res.status(500).json({ error: "Failed to unmark posted", details: error.message });
    }
  });

  app.delete("/api/ideas/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const ok = await deleteIdea(id);
      if (!ok) return res.status(404).json({ error: "Idea not found" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete idea error:", error);
      res.status(500).json({ error: "Failed to delete idea", details: error.message });
    }
  });

  app.post("/api/generate-range-suggestions", async (req, res) => {
    const { fromDate, toDate, language } = req.body;
    const client = getGeminiClient();
    const lang = language || "Burmese";

    const getDatesInRange = (fromStr: string, toStr: string) => {
      const dates: { date: string; dayName: string }[] = [];
      const start = new Date(fromStr);
      const end = new Date(toStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return dates;
      }

      let count = 0;
      const current = new Date(start);
      while (current <= end && count < 14) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        dates.push({
          date: `${yyyy}-${mm}-${dd}`,
          dayName: current.toLocaleDateString("en-US", { weekday: "long" }),
        });
        current.setDate(current.getDate() + 1);
        count++;
      }
      return dates;
    };

    const datesInRange = getDatesInRange(fromDate, toDate);

    let previousWeekPosted: Awaited<ReturnType<typeof getPreviousWeekPosted>> = [];
    try {
      previousWeekPosted = await getPreviousWeekPosted(fromDate);
    } catch (err) {
      console.error("Failed to load previous week ideas from DB:", err);
    }

    if (!client) {
      const mockSuggestions = getFallbackRangeSuggestions(
        datesInRange,
        lang,
        previousWeekPosted.map((p) => p.topic)
      );
      res.json({ suggestions: mockSuggestions, isMock: true, previousWeekAnalyzed: previousWeekPosted });
      return;
    }

    try {
      const prompt = `You are a Facebook content strategist for "Marctober Tech" — a Myanmar Facebook page that sells Customized Management Systems (custom-built business software such as ERP, POS, Payroll, HR, Inventory, Logistics, and similar systems).

Your job is NOT to write ready-to-publish Facebook posts.
Your job is ONLY to propose daily CONTENT IDEAS so the page owner knows WHAT theme/topic to post about each day.
The page owner will later decide the exact Management System product and write the final post themselves.

AUDIENCE (very important):
- Main readers are everyday Myanmar Facebook users — NOT IT professionals, developers, or tech experts.
- Ideas must feel easy, familiar, and interesting to ordinary people who just use a computer/phone for daily life or small business.
- Prefer "aha!" tips people want to save/share over impressive-sounding advanced topics.

Date range (one idea per date):
${JSON.stringify(datesInRange)}

Language for topic + ideaSummary: ${lang}

PREVIOUS WEEK ANALYSIS (strict — use ONLY this history, ignore anything older):
These are the ideas that were already posted in the 7 days BEFORE ${fromDate}:
${JSON.stringify(previousWeekPosted)}

Based on that previous week only:
- Avoid repeating the same topics, angles, or categories pattern too closely.
- Balance the new week so it feels fresh vs last week.
- If previous week is empty, create a strong balanced starter week.

CONTENT MIX RULE (strict):
- Alternate categories day by day across the range.
- Odd positions (1st, 3rd, 5th…): category = "Tech"
- Even positions (2nd, 4th, 6th…): category = "Management System"

CATEGORY MEANING:
1) "Tech" = mix of two easy themes for ordinary people (rotate both across Tech days — do not only use computer tips):
   A) Everyday computer / phone tips people rarely know but can use immediately
   B) Simple AI topics that anyone can understand and try (no jargon)

   GOOD computer-tip examples:
   - ကွန်ပျူတာ အသုံးကြာလို့ နည်းနည်းနှေးလာရင် ဘာလုပ်သင့်လဲ
   - Recent Files ဖျက်နည်း / Temp files ရှင်းနည်း
   - Screenshot မြန်မြန် ရိုက်နည်း၊ folder အမြန်ရှာနည်း၊ disk space လွတ်အောင်လုပ်နည်း

   GOOD simple-AI examples (must stay beginner-friendly):
   - AI ဆိုတာ ဘာလဲ — လူတိုင်းနားလည်အောင် တစ်ချက်ရှင်းပြ
   - ChatGPT / AI နဲ့ Facebook caption၊ စာတို၊ စျေးကြော်ငြာ စာရေးနည်း
   - AI ကို ဓာတ်ပုံတည်းဖြတ် / ပုံဖန်တီးဖို့ သုံးနည်း (လွယ်ကူသော tip)
   - ကျောင်းသား / ဆိုင်ပိုင်ရှင် AI ကို နေ့စဉ်အလုပ်မှာ ဘယ်လိုသုံးမလဲ
   - AI ကို မေးရင် ပိုကောင်းတဲ့ အဖြေရအောင် မေးနည်း (prompt tip for beginners)

   BAD examples (NEVER use — too advanced):
   - Digital transformation, cloud architecture, cybersecurity frameworks
   - Machine learning models, neural networks, AI engineering, DevOps, ERP industry trends
   - Abstract "tech authority" / LinkedIn thought-leadership education
2) "Management System" = simple, relatable ideas about customized management systems for small/medium business owners.
   Focus on everyday pain points (စာရင်းရှုပ်၊ stock ပျောက်၊ Excel အမှား၊ ဝန်ထမ်းစာရင်း) in plain language.
   Do NOT lock to one specific product name — keep it open so the owner can later choose which Management System to feature.
   Avoid heavy jargon (no "digital transformation roadmap", "enterprise scalability", etc.).

TOPIC / TITLE STYLE (strict):
- Short, clear, curiosity-friendly — like a Facebook post title ordinary people would click.
- Sound like a helpful friend tip, NOT a seminar or LinkedIn thought-leadership headline.
- Prefer concrete actions and situations over abstract concepts.
- For AI topics: explain in plain language a non-tech person would understand in 10 seconds.

STRICT OUTPUT RULES:
- Do NOT write full Facebook captions, CTAs, hashtag walls, or long sales copy.
- Keep each idea short, practical, and actionable as a planning note.
- Every Tech idea must be something a non-tech person can understand and try today (PC, phone, or a free AI chat tool).
- Across the date range, include BOTH computer tips and simple AI ideas on Tech days (roughly balanced when there are 2+ Tech days).

For EACH date return:
1. date — exact YYYY-MM-DD from the list
2. dayName — weekday name
3. category — exactly "Tech" or "Management System" following the mix rule
4. topic — short content idea title
5. ideaSummary — 1–3 short sentences explaining the idea angle (planning note only, not a post)
6. contentType — recommended format only: one of "Image", "Video", "Carousels", "Text", "Link"
7. postTime — suggested posting time like "10:00 AM"

Return a strict JSON array only.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Daily content ideas for Marctober Tech Facebook page",
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                dayName: { type: Type.STRING },
                category: { type: Type.STRING },
                topic: { type: Type.STRING },
                ideaSummary: { type: Type.STRING },
                contentType: { type: Type.STRING },
                postTime: { type: Type.STRING },
              },
              required: ["date", "dayName", "category", "topic", "ideaSummary", "contentType", "postTime"],
            },
          },
        },
      });

      const suggestions = JSON.parse((response.text || "[]").trim());
      res.json({ suggestions, isMock: false, previousWeekAnalyzed: previousWeekPosted });
    } catch (error: any) {
      console.error("Gemini range suggestion generation error:", error);
      res.status(500).json({ error: "Failed to generate range suggestions", details: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "::", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function getFallbackRangeSuggestions(
  dates: { date: string; dayName: string }[],
  language: string,
  previousPostedTopics: string[]
) {
  const isBurmese = language.toLowerCase().includes("burm") || language.toLowerCase().includes("myan");
  const previousSet = new Set((previousPostedTopics || []).map((t) => t.toLowerCase().trim()));

  const techIdeasMm = [
    { topic: "ကွန်ပျူတာ နှေးလာရင် ချက်ချင်းလုပ်သင့်တဲ့ အရာများ", ideaSummary: "အသုံးကြာပြီး နည်းနည်းနှေးလာတဲ့ PC အတွက် Recent files / Temp ရှင်းခြင်း စတဲ့ လူလုပ်လို့ရတဲ့ tip များ။", contentType: "Carousels" },
    { topic: "AI ဆိုတာ ဘာလဲ — တစ်မိနစ်နဲ့ နားလည်အောင်", ideaSummary: "AI ကို နည်းပညာစကားမပါဘဲ လူတိုင်းနားလည်အောင် ရိုးရှင်းစွာ ရှင်းပြမည့် idea။", contentType: "Image" },
    { topic: "ChatGPT နဲ့ Facebook caption ရေးနည်း", ideaSummary: "စာရေးမတတ်ရင်တောင် AI ကို မေးပြီး caption လှလှ ရအောင် လုပ်တဲ့ beginner tip။", contentType: "Carousels" },
    { topic: "Recent Files ဖျက်ပြီး သိမ်းဆည်းနေရာ လွတ်အောင်လုပ်နည်း", ideaSummary: "Recent / Quick Access ထဲက မလိုတော့တဲ့ ဖိုင်တွေ ရှင်းပြီး ကွန်ပျူတာ ပိုသက်သာအောင် လုပ်တဲ့ idea။", contentType: "Image" },
    { topic: "AI ကို မေးရင် ပိုကောင်းတဲ့ အဖြေရအောင်", ideaSummary: "လိုချင်တာကို ရှင်းရှင်းလင်းလင်း မေးနည်း — လူတိုင်းသုံးလို့ရတဲ့ prompt tip။", contentType: "Video" },
    { topic: "Disk နေရာ ပြည့်နေရင် ဘယ်လိုရှင်းမလဲ", ideaSummary: "Download folder၊ recycle bin၊ မလိုတော့တဲ့ installer များ ရှင်းခြင်း စတဲ့ everyday tip။", contentType: "Carousels" },
  ];

  const systemIdeasMm = [
    { topic: "Excel စာရင်းတွေ ရှုပ်လာရင် ဘာလုပ်သင့်လဲ", ideaSummary: "ဖိုင်များပြားလာပြီး အမှားများတဲ့အခါ စိတ်ကြိုက် management system က ဘယ်လို ကူညီနိုင်မလဲ ဆိုသည့် ရိုးရှင်းသော idea။", contentType: "Carousels" },
    { topic: "စတော့ပစ္စည်း ပျောက်လွယ်တာကို လျှော့ချနည်း", ideaSummary: "လက်ရေး/Excel နဲ့ စာရင်းလုပ်ရင်း ပစ္စည်းပျောက်တဲ့ ပြဿနာကို စနစ်နဲ့ ဖြေရှင်းမည့် idea။", contentType: "Image" },
    { topic: "အရောင်းစာရင်းကို တစ်နေရာတည်းက ကြည့်ချင်ရင်", ideaSummary: "နေ့စဉ်အရောင်းကို ဖုန်း/ကွန်ပျူတာကနေ တစ်ချက်ကြည့်နိုင်အောင် စနစ်သုံးခြင်း idea။", contentType: "Carousels" },
    { topic: "ဝန်ထမ်းလစာ စာရင်းကို လွယ်ကူအောင်လုပ်နည်း", ideaSummary: "လစဉ်လစာတွက်ချက်မှု ရှုပ်ထွေးမှုကို management system နဲ့ ရိုးရှင်းအောင်လုပ်မည့် idea။", contentType: "Text" },
  ];

  const techIdeasEn = [
    { topic: "What to do when your PC starts getting slow", ideaSummary: "Simple cleanup tips like clearing recent/temp files that everyday users can try right away.", contentType: "Carousels" },
    { topic: "What is AI? Explained in one minute", ideaSummary: "A plain-language explanation of AI that anyone can understand — no jargon.", contentType: "Image" },
    { topic: "Write a Facebook caption with ChatGPT", ideaSummary: "Beginner tip on asking AI for a nice caption even if you are not a writer.", contentType: "Carousels" },
    { topic: "Clear Recent Files to free up clutter fast", ideaSummary: "A practical tip on cleaning Recent/Quick Access so the computer feels lighter.", contentType: "Image" },
    { topic: "Ask AI better to get better answers", ideaSummary: "Simple beginner prompt tip: how to ask clearly so AI replies more usefully.", contentType: "Video" },
    { topic: "Easy ways to free disk space when storage is full", ideaSummary: "Everyday cleanup ideas: Downloads, Recycle Bin, old installers.", contentType: "Carousels" },
  ];

  const systemIdeasEn = [
    { topic: "When Excel sheets get too messy", ideaSummary: "Simple idea on how a customized management system can reduce spreadsheet chaos. Owner picks the product later.", contentType: "Carousels" },
    { topic: "Stop losing track of stock items", ideaSummary: "Relatable idea for shops that lose count with handwritten or Excel stock lists.", contentType: "Image" },
    { topic: "See daily sales in one place", ideaSummary: "Idea about checking sales from phone/PC without hunting through many files.", contentType: "Carousels" },
    { topic: "Make payroll less stressful each month", ideaSummary: "Plain-language idea on simplifying salary records with a management system.", contentType: "Text" },
  ];

  const techPool = isBurmese ? techIdeasMm : techIdeasEn;
  const systemPool = isBurmese ? systemIdeasMm : systemIdeasEn;
  const times = ["09:30 AM", "11:00 AM", "02:00 PM", "04:30 PM", "06:30 PM", "08:00 PM"];

  const pickIdea = (pool: typeof techPool, index: number) => {
    const filtered = pool.filter((t) => !previousSet.has(t.topic.toLowerCase().trim()));
    const finalPool = filtered.length > 0 ? filtered : pool;
    return finalPool[index % finalPool.length];
  };

  return dates.map((d, index) => {
    const isTech = index % 2 === 0;
    const idea = pickIdea(isTech ? techPool : systemPool, Math.floor(index / 2));
    return {
      date: d.date,
      dayName: d.dayName,
      category: isTech ? "Tech" : "Management System",
      topic: idea.topic,
      ideaSummary: idea.ideaSummary,
      contentType: idea.contentType,
      postTime: times[index % times.length],
    };
  });
}

startServer();
