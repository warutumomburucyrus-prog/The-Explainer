module.exports = async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  if (!/^[0-9A-Fa-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: "Give an artist id like ?id=..." });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch("https://hackathon.api.qloo.com/entities?entity_ids=" + id, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY },
      signal: controller.signal,
    });
    const data = await r.json();
    const list = (data.results && data.results.entities) || data.entities || data.results || [];
    const first = Array.isArray(list) ? list[0] : null;
    const p = (first && first.properties) || {};
    return res.status(200).json({
      status: r.status,
      topKeys: Object.keys(data),
      name: first && first.name,
      performance_style: p.performance_style,
      adjectives_for_performance_style: p.adjectives_for_performance_style,
      adjectives_for_fans: p.adjectives_for_fans,
      adjectives_for_music: p.adjectives_for_music,
      known_for: p.known_for,
      lyrical_themes: p.lyrical_themes,
    });
  } catch (err) {
    return res.status(200).json({ error: "request failed" });
  } finally {
    clearTimeout(timer);
  }
};
