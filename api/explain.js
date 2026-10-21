const MODEL = "gemini-3.8-flash";
const ID_PATTERN = /^[0-9A-Fa-f-]{36}$/;

const SYSTEM =
  "You are The Explainer, a friendly tutor for students. " +
  "Explain the student's topic clearly and correctly in under 200 words, " +
  "using one or two analogies drawn from the student's musical taste described below. " +
  "Use only the taste details you are given (artist names, genres, themes). " +
  "Do not make claims about specific songs, lyrics, or the artists' lives. " +
  "The topic must be explained accurately: the analogy helps, it never replaces the facts. " +
  "Use plain, simple language.";

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
    7000
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

  let step = "Qloo";
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

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";

    step = "Gemini";
    const g = await fetchWithTimeout(
      geminiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      },
      20000
    );

    if (g.status === 429) {
      return res.status(429).json({ error: "Lots of people are asking right now. Please try again in a moment." });
    }
    if (!g.ok) {
      let detail = "";
      try { detail = (await g.json()).error.message; } catch (e) {}
      return res.status(502).json({ error: "The explainer could not answer just now.", status: g.status, detail: String(detail).slice(0, 300) });
    }

    const gd = await g.json();
    const parts =
      gd.candidates && gd.candidates[0] && gd.candidates[0].content && gd.candidates[0].content.parts;
    const text = parts ? parts.map((p) => p.text || "").join("") : "";
    if (!text) {
      return res.status(502).json({ error: "The explainer had no answer. Try rephrasing." });
    }

    return res.status(200).json({ explanation: text, taste: { genres, themes, traits } });
  } catch (err) {
    if (err && err.name === "AbortError") {
      return res.status(504).json({ error: "That took too long. Please try again.", step: step });
    }
    return res.status(500).json({ error: "Something went wrong.", step: step });
  }
};
