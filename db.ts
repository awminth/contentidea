import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "72.61.126.206",
  port: Number(process.env.DB_PORT || 3311),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootpassword",
  database: process.env.DB_NAME || "mt_contentplanner",
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 10000,
});

export type IdeaRow = {
  id: number;
  title: string;
  description: string | null;
  topic: string;
  post_date: string;
  content_type: string;
  status: "Draft" | "Scheduled" | "Posted";
  caption: string | null;
  image_prompt: string | null;
  hashtags: string | null;
  posted_at: string | null;
  created_at: string;
  plan_from?: string | null;
  plan_to?: string | null;
};

let schemaReady: Promise<void> | null = null;

function formatDate(value: unknown): string {
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(value).slice(0, 10);
}

function formatBatchKey(value: unknown): string {
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    const hh = String(value.getHours()).padStart(2, "0");
    const mi = String(value.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }
  return String(value).slice(0, 16);
}

function parseRangeKey(hashtags: string): { from: string; to: string } | null {
  const match = (hashtags || "").match(/RANGE:(\d{4}-\d{2}-\d{2})\|(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return { from: match[1], to: match[2] };
}

/** Ensure plan_from / plan_to columns exist */
export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const col of ["plan_from", "plan_to"]) {
        try {
          await pool.query(`ALTER TABLE contents ADD COLUMN ${col} DATE NULL`);
          console.log(`Added column contents.${col}`);
        } catch (err: any) {
          // ER_DUP_FIELDNAME = 1060
          if (err?.errno !== 1060 && err?.code !== "ER_DUP_FIELDNAME") {
            console.warn(`ensureSchema ${col}:`, err.message);
          }
        }
      }
      await repairLegacyWeekRanges();
    })();
  }
  await schemaReady;
}

/**
 * Legacy ideas without week range were stored per-day.
 * Group by created_at minute (same Generate+Save batch) → one week range.
 */
async function repairLegacyWeekRanges(): Promise<void> {
  try {
    const [rows] = await pool.query(
      `SELECT id, post_date, hashtags, created_at, plan_from, plan_to
       FROM contents`
    );
    const list = rows as any[];

    type Bucket = { ids: number[]; dates: string[] };
    const buckets = new Map<string, Bucket>();

    for (const row of list) {
      const hashtags = row.hashtags || "";
      const fromHashtags = parseRangeKey(hashtags);
      const planFrom = row.plan_from ? formatDate(row.plan_from) : null;
      const planTo = row.plan_to ? formatDate(row.plan_to) : null;

      // Already has a real week range spanning more than one day, or explicit RANGE
      if (fromHashtags && fromHashtags.from !== fromHashtags.to) continue;
      if (planFrom && planTo && planFrom !== planTo) continue;

      const batch = formatBatchKey(row.created_at);
      if (!buckets.has(batch)) buckets.set(batch, { ids: [], dates: [] });
      const b = buckets.get(batch)!;
      b.ids.push(row.id);
      b.dates.push(formatDate(row.post_date));
    }

    for (const [, bucket] of buckets) {
      if (bucket.ids.length < 2) continue;
      const sorted = [...bucket.dates].sort();
      const from = sorted[0];
      const to = sorted[sorted.length - 1];
      if (from === to) continue;

      const rangeKey = `RANGE:${from}|${to}`;
      await pool.query(
        `UPDATE contents
         SET plan_from = ?, plan_to = ?, hashtags = ?
         WHERE id IN (${bucket.ids.map(() => "?").join(",")})`,
        [from, to, rangeKey, ...bucket.ids]
      );
      console.log(`Repaired week range ${from} → ${to} for ${bucket.ids.length} ideas`);
    }
  } catch (err: any) {
    console.warn("repairLegacyWeekRanges:", err.message);
  }
}

export async function listIdeas(): Promise<any[]> {
  await ensureSchema();
  const [rows] = await pool.query(
    `SELECT id, title, description, topic, post_date, content_type, status, caption,
            image_prompt, hashtags, posted_at, created_at, plan_from, plan_to
     FROM contents
     ORDER BY post_date ASC, id ASC`
  );

  return (rows as IdeaRow[]).map((row) => {
    const fromHashtags = parseRangeKey(row.hashtags || "");
    const postDate = formatDate(row.post_date);
    const planFrom = row.plan_from
      ? formatDate(row.plan_from)
      : fromHashtags?.from || null;
    const planTo = row.plan_to ? formatDate(row.plan_to) : fromHashtags?.to || null;
    const hasWeekRange = !!(planFrom && planTo);

    return {
      id: String(row.id),
      title: row.title,
      category: row.description || "Tech",
      topic: row.topic,
      postDate,
      contentType: row.content_type,
      status: row.status,
      caption: row.caption || "",
      imagePrompt: row.image_prompt || "",
      hashtags: row.hashtags || "",
      postedAt: row.posted_at,
      createdBatch: formatBatchKey(row.created_at),
      hasWeekRange,
      planFrom: planFrom || postDate,
      planTo: planTo || postDate,
    };
  });
}

export async function createIdeas(
  ideas: {
    topic: string;
    category: string;
    postDate: string;
    contentType: string;
    ideaSummary: string;
    postTime?: string;
  }[],
  planFrom?: string,
  planTo?: string
): Promise<any[]> {
  await ensureSchema();
  const created: any[] = [];
  const dates = ideas.map((i) => i.postDate).sort();
  const from = planFrom || dates[0] || "";
  const to = planTo || dates[dates.length - 1] || from;
  const rangeKey = from && to ? `RANGE:${from}|${to}` : "";

  for (const idea of ideas) {
    const title = idea.postTime ? `${idea.topic} (${idea.postTime})` : idea.topic;
    const [result] = await pool.query(
      `INSERT INTO contents
        (title, description, platform, topic, post_date, content_type, status, caption, image_prompt, hashtags, plan_from, plan_to)
       VALUES (?, ?, 'Facebook', ?, ?, ?, 'Draft', ?, '', ?, ?, ?)`,
      [
        title,
        idea.category,
        idea.topic,
        idea.postDate,
        idea.contentType,
        idea.ideaSummary,
        rangeKey,
        from || null,
        to || null,
      ]
    );
    const insertId = (result as mysql.ResultSetHeader).insertId;
    created.push({
      id: String(insertId),
      title,
      category: idea.category,
      topic: idea.topic,
      postDate: idea.postDate,
      contentType: idea.contentType,
      status: "Draft",
      caption: idea.ideaSummary,
      imagePrompt: "",
      hashtags: rangeKey,
      postTime: idea.postTime || "",
      hasWeekRange: true,
      planFrom: from,
      planTo: to,
    });
  }

  return created;
}

export async function markIdeaPosted(id: number): Promise<boolean> {
  const [result] = await pool.query(
    `UPDATE contents
     SET status = 'Posted', posted_at = NOW()
     WHERE id = ?`,
    [id]
  );
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}

export async function markIdeaUnposted(id: number): Promise<boolean> {
  const [result] = await pool.query(
    `UPDATE contents
     SET status = 'Draft', posted_at = NULL
     WHERE id = ?`,
    [id]
  );
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}

export async function deleteIdea(id: number): Promise<boolean> {
  const [result] = await pool.query(`DELETE FROM contents WHERE id = ?`, [id]);
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}

export async function deleteIdeas(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const [result] = await pool.query(
    `DELETE FROM contents WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  return (result as mysql.ResultSetHeader).affectedRows;
}

export async function setIdeasPostedStatus(ids: number[], posted: boolean): Promise<number> {
  if (!ids.length) return 0;
  const [result] = await pool.query(
    posted
      ? `UPDATE contents SET status = 'Posted', posted_at = NOW() WHERE id IN (${ids.map(() => "?").join(",")})`
      : `UPDATE contents SET status = 'Draft', posted_at = NULL WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  return (result as mysql.ResultSetHeader).affectedRows;
}

/** Posted ideas from the 7 days before the new plan's fromDate */
export async function getPreviousWeekPosted(fromDate: string): Promise<
  { topic: string; category: string; postDate: string; ideaSummary: string; contentType: string }[]
> {
  await ensureSchema();
  const [rows] = await pool.query(
    `SELECT topic, description, post_date, caption, content_type
     FROM contents
     WHERE status = 'Posted'
       AND post_date >= DATE_SUB(?, INTERVAL 7 DAY)
       AND post_date < ?
     ORDER BY post_date ASC`,
    [fromDate, fromDate]
  );

  return (rows as any[]).map((row) => ({
    topic: row.topic,
    category: row.description || "",
    postDate: formatDate(row.post_date),
    ideaSummary: row.caption || "",
    contentType: row.content_type,
  }));
}

export async function testDbConnection(): Promise<boolean> {
  const conn = await pool.getConnection();
  conn.release();
  return true;
}
