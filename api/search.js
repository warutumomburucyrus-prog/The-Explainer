module.exports = async function handler(req, res) {
  const name = (req.query.q || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Please type an artist name." });
  }

  const url =
    "https://hackathon.api.qloo.com/search?query=" +
    encodeURIComponent(name) +
    "&types=urn:entity:artist&take=6";

  try {
    const response = await fetch(url, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY },
    });

    if (response.status === 404) {
      return res.status(200).json({ artists: [] });
    }
    if (!response.ok) {
      return res.status(502).json({ error: "Qloo could not be reached." });
    }

    const data = await response.json();
    const artists = (data.results || []).map((item) => ({
      id: item.entity_id,
      name: item.name,
      image: item.properties && item.properties.image ? item.properties.image.url : null,
    }));

    return res.status(200).json({ artists });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong." });
  }
};
