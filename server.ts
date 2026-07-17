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
1) "Tech" = general technology / digital transformation / software industry education ideas that build authority. NOT a hard product sales pitch.
2) "Management System" = ideas about customized management systems in general. Do NOT lock to one specific product name — keep it open so the owner can later choose which Management System to feature.

STRICT OUTPUT RULES:
- Do NOT write full Facebook captions, CTAs, hashtag walls, or long sales copy.
- Keep each idea short, practical, and actionable as a planning note.

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
    { topic: "SME များအတွက် Digital Transformation စတင်နည်း", ideaSummary: "လုပ်ငန်းငယ်များ နည်းပညာစတင်အသုံးပြုရာတွင် ဘယ်နေရာက စရမလဲဆိုသည့် အခြေခံလမ်းညွှန် idea။", contentType: "Carousels" },
    { topic: "လုပ်ငန်းဒေတာ လုံခြုံရေး အခြေခံအချက်များ", ideaSummary: "Password, backup, access control စသည့် cybersecurity awareness idea။", contentType: "Image" },
    { topic: "Cloud သုံးခြင်း၏ အားသာချက်များ", ideaSummary: "ရုံးပြင်ပမှ ဒေတာကြည့်နိုင်မှုနှင့် backup အကျိုးကျေးဇူးကို ရှင်းပြမည့် tech education idea။", contentType: "Text" },
    { topic: "Manual အလုပ်များကို Automation လုပ်ခြင်း", ideaSummary: "လူကိုယ်တိုင်လုပ်ရသော repetitive tasks များကို နည်းပညာဖြင့် လျှော့ချနိုင်ပုံ idea။", contentType: "Video" },
  ];

  const systemIdeasMm = [
    { topic: "Customized Management System က ဘာကြောင့်လိုအပ်သလဲ", ideaSummary: "Ready-made ထက် စိတ်ကြိုက်စနစ်က လုပ်ငန်း workflow နဲ့ ကိုက်ညီပုံကို ယေဘုယျရှင်းပြမည့် idea။ ဘယ် system တင်မလဲ ကိုယ်တိုင်ရွေးရန်။", contentType: "Carousels" },
    { topic: "လုပ်ငန်းစာရင်းရှုပ်ထွေးမှုကို စနစ်ဖြင့် ဖြေရှင်းခြင်း", ideaSummary: "Excel/စာရွက်စာတမ်း အမှားများ လျော့ချရန် management system တစ်ခု၏ အခန်းကဏ္ဍ idea။", contentType: "Image" },
    { topic: "တစ်နေရာတည်းကနေ လုပ်ငန်းစီမံခန့်ခွဲခြင်း", ideaSummary: "အရောင်း၊ စတော့၊ ဝန်ထမ်း စသည်တို့ကို တစ်ခုတည်းသော dashboard ကနေ ကြည့်နိုင်သည့် concept idea။", contentType: "Carousels" },
    { topic: "လုပ်ငန်းကြီးထွားလာတဲ့အခါ System က ဘယ်လိုကူညီမလဲ", ideaSummary: "Scale up လုပ်တဲ့အခါ customized management system က ဘယ်လို အထောက်အကူပြုမလဲ ဆိုသည့် planning idea။", contentType: "Text" },
  ];

  const techIdeasEn = [
    { topic: "Digital transformation basics for SMEs", ideaSummary: "A simple education idea on where small businesses should start with technology.", contentType: "Carousels" },
    { topic: "Essential cybersecurity habits for business owners", ideaSummary: "Awareness idea covering passwords, backups, and access control.", contentType: "Image" },
    { topic: "Why cloud access matters for growing teams", ideaSummary: "Tech education idea about remote data access and safer backups.", contentType: "Text" },
    { topic: "Replacing repetitive manual work with automation", ideaSummary: "Idea about reducing human error through smarter digital workflows.", contentType: "Video" },
  ];

  const systemIdeasEn = [
    { topic: "Why customized management systems matter", ideaSummary: "Open idea on tailored systems vs rigid templates. Owner chooses which system later.", contentType: "Carousels" },
    { topic: "Fixing messy business records with one system", ideaSummary: "Idea about reducing spreadsheet chaos with a customized management approach.", contentType: "Image" },
    { topic: "Manage operations from one dashboard", ideaSummary: "Concept idea for unified visibility across sales, stock, and staff processes.", contentType: "Carousels" },
    { topic: "How systems support business growth", ideaSummary: "Planning idea on scaling operations with a customized management system.", contentType: "Text" },
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
