import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Database, Copy, Check, Download, FileCode, CheckSquare, 
  HelpCircle, Server, Key, AlertTriangle, List, ArrowRight 
} from 'lucide-react';

export default function SchemaViewer() {
  const [copied, setCopied] = useState(false);

  const mysqlScript = `-- =========================================================================
-- Facebook Content Planner & Analytics Management System
-- Target Database: MySQL v8.0+ / MariaDB
-- Purpose: Schema design for Customized Software Development Business Page
-- Created for: MySQL Workbench Compatibility
-- =========================================================================

CREATE DATABASE IF NOT EXISTS fb_content_planner;
USE fb_content_planner;

-- 1. Table: users (စနစ်အတွင်း ဝင်ရောက်အသုံးပြုသူများစာရင်း)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: contents (ပလန်ရေးဆွဲထားသော သို့မဟုတ် တင်ပြီးသော Post များ)
CREATE TABLE IF NOT EXISTS contents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(50) DEFAULT 'Facebook',
    topic VARCHAR(100) NOT NULL,
    post_date DATE NOT NULL,
    content_type ENUM('Image', 'Video', 'Carousels', 'Text', 'Link') NOT NULL,
    status ENUM('Draft', 'Scheduled', 'Posted') DEFAULT 'Draft',
    caption TEXT,
    image_prompt TEXT,
    hashtags VARCHAR(500),
    -- Facebook Engagement Analytics Metrics (တင်ပြီးမှသာ စာရင်းသွင်းမည်)
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    comments INT DEFAULT 0,
    clicks INT DEFAULT 0,
    reach INT DEFAULT 0,
    posted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_date (post_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: daily_suggestions (Gemini AI မှ ထုတ်ပေးသော နေ့စဉ် Content အကြံပြုချက်များ)
CREATE TABLE IF NOT EXISTS daily_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    suggested_caption TEXT,
    suggested_image_prompt TEXT,
    suggested_hashtags VARCHAR(500),
    is_added_to_planner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: page_analytics (Facebook Page တစ်ခုလုံး၏ စုစုပေါင်း Performance များ)
CREATE TABLE IF NOT EXISTS page_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_date DATE NOT NULL UNIQUE,
    total_followers INT DEFAULT 0,
    total_reach INT DEFAULT 0,
    total_engagement INT DEFAULT 0,
    profile_views INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_record_date (record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================================
-- SEED DATA (အစမ်းစမ်းသပ်ရန် Initial Data များထည့်သွင်းခြင်း)
-- =========================================================================

-- Seed User (password: 1)
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'Admin', 'admin')
ON DUPLICATE KEY UPDATE username=username;

-- Seed Sample Content (Custom Software posts)
INSERT INTO contents (title, topic, post_date, content_type, status, caption, image_prompt, hashtags, likes, shares, comments, clicks, reach, posted_at)
VALUES 
('Custom ERP Benefit Infographics', 'Custom ERP System ဖြင့် လုပ်ငန်းလည်ပတ်မှု မြှင့်တင်ခြင်း', '2026-07-16', 'Carousels', 'Posted', 
'📈 သင့်လုပ်ငန်းရဲ့ နေ့စဉ်လည်ပတ်မှုတွေ ရှုပ်ထွေးနေပါသလား?\\n\\nလုပ်ငန်းတစ်ခုကြီးထွားလာတာနဲ့အမျှ Excel တွေ၊ စက္ကူဖိုင်တွေနဲ့ စာရင်းကိုင်ရတာ အချိန်ကုန်ပြီး မှားယွင်းမှုတွေ ရှိလာတတ်ပါတယ်။ သင့်လုပ်ငန်းနဲ့ အတိအကျကိုက်ညီမယ့် Custom ERP Software တစ်ခုရှိခြင်းအားဖြင့် စတော့စာရင်း၊ အရောင်း၊ ဝယ်ယူမှုနဲ့ ဝန်ထမ်းရေးရာ အားလုံးကို တစ်နေရာတည်းကနေ စနစ်တကျ ထိန်းချုပ်နိုင်မှာပါ။\\n\\nCodeCraft မှ သင့်လုပ်ငန်းအမျိုးအစားအလိုက် အသင့်တော်ဆုံး စိတ်ကြိုက်ဆော့ဖ်ဝဲလ်များကို ရေးဆွဲပေးနေပါပြီ။',
'A sleek modern office infograph showing workflow optimization. Theme colors: dark slate blue and neon teal.',
'#CustomSoftware #ERPSystem #MyanmarBusiness #CodeCraft', 54, 18, 12, 105, 1850, '2026-07-16 09:30:00'),

('POS Software Retail Benefits', 'POS Software - ဆိုင်ရှင်များအတွက် အရောင်းစာရင်းကိုင်ရတာ လွယ်ကူစေဖို့', '2026-07-17', 'Image', 'Scheduled',
'🏪 ဆိုင်မှာ အရောင်းစာရင်းတွေ ခေါင်းကိုက်နေလား? POS စနစ်က ကူညီပေးပါလိမ့်မယ်!\\n\\nလက်ရှိရောင်းရငွေ ဘယ်လောက်လဲ၊ အမြတ်ဘယ်လောက်ကျန်လဲ၊ ဘယ်ပစ္စည်းတွေ စတော့ပြတ်တော့မလဲဆိုတာ ဖုန်း သို့မဟုတ် Laptop ထဲကနေ Real-time ကြည့်ရှုနိုင်မှာပါ။',
'A friendly shop owner holding a tablet showing retail store dashboard interface. Soft light 3D design.',
'#POSSoftware #RetailBusiness #MyanmarShop #CodeCraft', 0, 0, 0, 0, 0, NULL);
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mysqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([mysqlScript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "fb_content_planner_schema.sql";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8" id="schema-panel">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-sans tracking-tight">MySQL Database Schema Export</h1>
          <p className="text-xs text-slate-400 mt-1">
            MySQL Workbench တွင် တိုက်ရိုက် run ၍ Database တည်ဆောက်နိုင်မည့် SQL Scripts
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Copied Script!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy SQL Script
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" /> Download .sql File
          </button>
        </div>
      </div>

      {/* ER Diagram Section */}
      <div className="glass-panel rounded-3xl p-6">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans mb-6 flex items-center gap-2">
          <Server className="w-4.5 h-4.5 text-indigo-300" /> Entity-Relationship Structure Diagram (ERD Schema)
        </h2>

        {/* Dynamic relational view mapping tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'users',
              desc: 'စနစ်ဝင်ရောက်သူများ',
              fields: [
                { name: 'id', type: 'INT (PK, AI)', isKey: true },
                { name: 'username', type: 'VARCHAR(50) (UQ)', isKey: false },
                { name: 'password_hash', type: 'VARCHAR(255)', isKey: false },
                { name: 'full_name', type: 'VARCHAR(100)', isKey: false },
                { name: 'role', type: 'VARCHAR(20)', isKey: false },
                { name: 'created_at', type: 'TIMESTAMP', isKey: false },
              ]
            },
            {
              title: 'contents',
              desc: 'ပို့စ်များနှင့် တုံ့ပြန်မှုရလဒ်',
              fields: [
                { name: 'id', type: 'INT (PK, AI)', isKey: true },
                { name: 'title', type: 'VARCHAR(255)', isKey: false },
                { name: 'topic', type: 'VARCHAR(100)', isKey: false },
                { name: 'post_date', type: 'DATE', isKey: false },
                { name: 'content_type', type: 'ENUM(...)', isKey: false },
                { name: 'status', type: 'ENUM(...)', isKey: false },
                { name: 'caption', type: 'TEXT', isKey: false },
                { name: 'image_prompt', type: 'TEXT', isKey: false },
                { name: 'likes / reach', type: 'INT', isKey: false },
                { name: 'posted_at', type: 'DATETIME', isKey: false },
              ]
            },
            {
              title: 'daily_suggestions',
              desc: 'Gemini အကြံပြုချက်များ',
              fields: [
                { name: 'id', type: 'INT (PK, AI)', isKey: true },
                { name: 'topic', type: 'VARCHAR(255)', isKey: false },
                { name: 'description', type: 'TEXT', isKey: false },
                { name: 'content_type', type: 'VARCHAR(50)', isKey: false },
                { name: 'suggested_caption', type: 'TEXT', isKey: false },
                { name: 'suggested_image_prompt', type: 'TEXT', isKey: false },
                { name: 'is_added_to_planner', type: 'BOOLEAN', isKey: false },
              ]
            },
            {
              title: 'page_analytics',
              desc: 'FB Page စုစုပေါင်းမှတ်တမ်း',
              fields: [
                { name: 'id', type: 'INT (PK, AI)', isKey: true },
                { name: 'record_date', type: 'DATE (UQ)', isKey: false },
                { name: 'total_followers', type: 'INT', isKey: false },
                { name: 'total_reach', type: 'INT', isKey: false },
                { name: 'total_engagement', type: 'INT', isKey: false },
                { name: 'profile_views', type: 'INT', isKey: false },
                { name: 'updated_at', type: 'TIMESTAMP', isKey: false },
              ]
            },
          ].map((table, idx) => (
            <div key={idx} className="bg-black/25 rounded-2xl border border-white/10 overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="p-3 bg-black/20 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-xs font-bold text-slate-100 font-mono">{table.title}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-sans">{table.desc}</span>
              </div>
              <div className="p-3 divide-y divide-white/5 flex-1">
                {table.fields.map((f, fIdx) => (
                  <div key={fIdx} className="py-1.5 flex justify-between text-[10px] font-mono">
                    <span className={`font-semibold ${f.isKey ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                      {f.isKey && '🔑'} {f.name}
                    </span>
                    <span className="text-slate-400">{f.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Code Terminal */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-black/30 p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <FileCode className="w-4 h-4 text-indigo-300" />
            <span className="text-xs font-mono font-bold">fb_content_planner_schema.sql</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
        </div>
        <div className="p-6 bg-black/25 overflow-x-auto max-h-[420px] scrollbar-thin">
          <pre className="text-[11px] font-mono text-slate-300 leading-relaxed select-all">
            {mysqlScript}
          </pre>
        </div>
      </div>

      {/* Helper documentation cards on how to import */}
      <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-300" /> How to execute this script in MySQL Workbench?
        </h3>
        <ul className="space-y-2 text-xs text-slate-400 list-disc pl-5 font-sans leading-relaxed">
          <li>
            Click the <strong className="text-slate-200">"Download .sql File"</strong> button at the top right to save the file to your computer.
          </li>
          <li>
            Open <strong className="text-slate-200">MySQL Workbench</strong> and connect to your MySQL Server instance.
          </li>
          <li>
            Go to <strong className="text-slate-200">File &gt; Open SQL Script...</strong> and select your downloaded script file.
          </li>
          <li>
            Press <strong className="text-slate-200">Ctrl + Shift + Enter</strong> (or click the lightning bolt icon ⚡) to run the full script. This will provision the database, table schema constraints, and seeds the testing datasets immediately.
          </li>
        </ul>
      </div>
    </div>
  );
}
