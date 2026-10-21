module.exports = async function handler(req, res) {
  const id = (req.query.id || "").trim();

  const looksLikeId = /^[0-9A-Fa-f-]{36}$/.test(id);
  if (!looksLikeId) {
    return res.status(400).json({ error: "That artist id does not look right." });
  }

  const url =
    "https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:artist" +
    "&signal.interests.entities=" +
    id +
    "&take=6";

  try {
    const response = await fetch(url, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Qloo could not be reached." });
    }

    const data = await response.json();
    const entities = (data.results && data.results.entities) || [];

    const artists = entities.map((item) => ({
      id: item.entity_id,
      name: item.name,
      image: item.properties && item.properties.image ? item.properties.image.url : null,
      affinity: item.query ? item.query.affinity : null,
    }));

    return res.status(200).json({ artists });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong." });
  }
};
