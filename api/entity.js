async function ask(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(url, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY },
      signal: controller.signal,
    });
    const data = await r.json();
    const results = data.results;
    const list = Array.isArray(results) ? results : (results && results.entities) || [];
    const first = list[0] || null;
    const p = (first && first.properties) || {};
    return {
      status: r.status,
      count: list.length,
      name: first && first.name,
      propertyKeys: Object.keys(p),
      performance_style: p.performance_style,
      adjectives_for_performance_style: p.adjectives_for_performance_style,
      known_for: p.known_for,
    };
  } catch (err) {
    return { error: "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  if (!/^[0-9A-Fa-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: "Give an artist id like ?id=..." });
  }
  const base = "https://hackathon.api.qloo.com";
  const lookup = await ask(base + "/entities?entity_ids=" + id);
  const viaFilter = await ask(
    base + "/v2/insights?filter.type=urn:entity:artist&filter.results.entities=" + id
  );
  const viaFilterAndSignal = await ask(
    base + "/v2/insights?filter.type=urn:entity:artist&signal.interests.entities=" + id +
      "&filter.results.entities=" + id
  );
  return res.status(200).json({ lookup, viaFilter, viaFilterAndSignal });
};
