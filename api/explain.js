const MODELS = [
  { name: "gemini-3.5-flash", timeoutMs: 30000 },
  { name: "gemini-3.5-flash-lite", timeoutMs: 15000 },
];
const ID_PATTERN = /^[0-9A-Fa-f-]{36}$/;

const SYSTEM =
  "You are The Explainer, a friendly tutor for students. " +
  "Write the answer as one lively scene: the student's favorite artists are in the same room, teaching the student together. " +
  "Keep the whole answer under 340 words. " +
  "Before writing, silently think about how each favorite artist really talks in interviews, on stage and in their music: their casual speech, slang, rhythm, and the way they switch between languages. " +
  "Do NOT say any artist's name, band name, member name, nickname, or stage persona anywhere in the answer, and do not use words from a band's own branding or mythology. The student must recognize each artist only by how they speak. " +
  "Each artist speaks in their own short paragraph, in first person, directly to the student, in the same order the favorite artists are listed. Never describe what an artist is doing in the third person. " +
  "Write the way people actually talk, never like a textbook, a dictionary, or a translation. Use short, punchy sentences, casual phrasing, and the artist's natural attitude. " +
  "Use the language mix that artist is known for. If they naturally mix languages or slang, mix them the way a real speaker would, and keep technical words such as the name of the topic in English, because real speakers do. Do not translate the explanation word for word into another language. " +
  "If an artist is known for English, write in English with their mood and diction. If an artist's style is formal, dark, or poetic, show that through solemn, poetic English, not through slang. " +
  "Only if a paragraph is entirely in a language other than English, add one short plain-English sentence in the same voice. " +
  "Use only words and grammar you are completely sure of. If you are not sure how an artist speaks, write that artist's paragraph in simple, natural English. " +
  "The first artist opens with a clear, simple explanation of the topic. " +
  "Each next artist reacts to what the one before just said, for example by agreeing, adding to it, or teasing a little, and then adds one NEW idea, example, or step. Never repeat a point already made. " +
  "The last artist wraps up the lesson so the student can remember it. " +
  "If there is only one favorite artist, that artist teaches the whole answer alone. " +
  "Let the THEMES and QUALITIES you are given guide each voice. " +
  "This is playful style, not their real words: do not mention specific songs, lyrics, or facts about the artists' lives. " +
  "The similar artists are background only: never name them. " +
  "The topic must be explained accurately and build step by step: the voices help, they never replace the facts. " +
  "Write in plain text with short paragraphs. Never use asterisks, underscores, hashes, bullet characters, or any other markdown symbols.";

function clean(text, max) {
  return String(text || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function top(list, n) {
  const counts = {};
  list.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, n);
}

function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function tasteFor(id) {
  const url =
    "https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:artist" +
    "&signal.interests.entities=" + id + "&take=5";
  const response = await fetchWithTimeout(
    url,
    { headers: { "X-Api-Key": process.env.QLOO_API_KEY } },
    6000
  );
  const out = { genres: [], themes: [], traits: [], similar: [] };
  if (!response.ok) return out;
  const data = await response.json();
  const entities = (data.results && data.results.entities) || [];
  entities.forEach((e) => {
    const p = e.properties || {};
    out.similar.push(e.name);
    out.genres.push(...(p.primary_genres || []));
    out.themes.push(...(p.lyrical_themes || []));
    out.traits.push(...(p.characteristics || []));
  });
  return out;
}

async function askGemini(model, body) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" + model.name + ":generateContent";
  try {
    const g = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      },
      model.timeoutMs
    );
    if (!g.ok) return { ok: false, status: g.status };
    const gd = await g.json();
    const parts =
      gd.candidates && gd.candidates[0] && gd.candidates[0].content && gd.candidates[0].content.parts;
    const text = parts ? parts.map((p) => p.text || "").join("") : "";
    if (!text) return { ok: false, status: "empty" };
    return { ok: true, text: text };
  } catch (err) {
    return { ok: false, status: err && err.name === "AbortError" ? "timeout" : "error" };
  }
}

module.exports = async function handler(req, res) {
  const question = clean(req.query.q, 300);
  const ids = String(req.query.ids || "")
    .split(",").map((s) => s.trim()).filter((s) => ID_PATTERN.test(s)).slice(0, 3);
  const names = String(req.query.names || "")
    .split("|").map((s) => clean(s, 60)).filter(Boolean).slice(0, 3);

  if (!question) {
    return res.status(400).json({ error: "Please type what you want explained." });
  }
  if (ids.length === 0) {
    return res.status(400).json({ error: "Pick at least one favorite artist first." });
  }

  try {
    const tastes = await Promise.all(ids.map(tasteFor));
    const all = { genres: [], themes: [], traits: [], similar: [] };
    tastes.forEach((t) => {
      all.genres.push(...t.genres);
      all.themes.push(...t.themes);
      all.traits.push(...t.traits);
      all.similar.push(...t.similar);
    });

    const genres = top(all.genres, 4);
    const themes = top(all.themes, 5);
    const traits = top(all.traits, 4);
    const similar = top(all.similar, 6);

    const tasteText = [
      "Favorite artists: " + (names.join(", ") || "not given"),
      "Genres around them: " + (genres.join(", ") || "not available"),
      "Themes in this music: " + (themes.join(", ") || "not available"),
      "Qualities of this music: " + (traits.join(", ") || "not available"),
      "Similar artists they may like: " + (similar.join(", ") || "not available"),
    ].join("\n");

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [{ text: "Student's taste:\n" + tasteText + "\n\nExplain this to the student: " + question }],
        },
      ],
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    };

    const attempts = [];
    for (const model of MODELS) {
      const result = await askGemini(model, body);
      if (result.ok) {
        return res.status(200).json({
          explanation: result.text,
          taste: { genres, themes, traits },
          model: model.name,
        });
      }
      attempts.push({ model: model.name, status: result.status });
    }

    const busy = attempts.some((a) => a.status === 429);
    return res.status(busy ? 429 : 502).json({
      error: busy
        ? "Lots of people are asking right now. Please try again in a moment."
        : "The explainer could not answer just now. Please try again.",
      attempts: attempts,
    });
  } catch (err) {
    if (err && err.name === "AbortError") {
      return res.status(504).json({ error: "The music lookup took too long. Please try again." });
    }
    return res.status(500).json({ error: "Something went wrong." });
  }
};
