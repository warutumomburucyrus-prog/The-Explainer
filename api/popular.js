function clean(text, max) {
  return String(text || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

async function popularIn(place) {
  const url =
    "https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:artist" +
    "&signal.location.query=" + encodeURIComponent(place) + "&take=8";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY },
      signal: controller.signal,
    });
    if (!response.ok) return { status: response.status, entities: [] };
    const data = await response.json();
    const entities = (data.results && data.results.entities) || [];
    return { status: response.status, entities: entities };
  } catch (err) {
    return { status: "error", entities: [] };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const code = clean(req.headers["x-vercel-ip-country"], 2).toUpperCase();
  let city = "";
  try { city = decodeURIComponent(req.headers["x-vercel-ip-city"] || ""); } catch (e) {}
  city = clean(req.query.city || city, 60);

  let country = "";
  try {
    country = code ? new Intl.DisplayNames(["en"], { type: "region" }).of(code) : "";
  } catch (e) {}

  const tried = [];
  for (const place of [city, country].filter(Boolean)) {
    const result = await popularIn(place);
    tried.push({ place: place, status: result.status, count: result.entities.length });
    if (result.entities.length > 0) {
      return res.status(200).json({
        place: place,
        tried: tried,
          artists: result.entities.map((e) => ({
          id: e.entity_id || e.id,
          name: e.name,
          image: (e.properties && e.properties.image && e.properties.image.url) || null,
        })),
      });
    }
  }
  return res.status(200).json({ place: null, tried: tried, artists: [] });
};
