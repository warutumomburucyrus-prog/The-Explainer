# The Explainer

Learn any topic from the artists you love. A student picks up to three favorite artists, asks anything, and the artists teach it together in one short scene, each in their own style and language mix. Qloo's taste data shapes every voice, and Gemini writes the lesson.

Live demo: https://the-explainer-six.vercel.app

Built for the Qloo Agentic Hackathon.

## How it works

1. **Suggest artists near you.** On a first visit, `api/popular.js` asks Qloo for popular artists in the visitor's city (or country if the city has none). Vercel supplies the city and country in the request headers. The app never stores or uses the IP address.
2. **Pick artists.** `api/search.js` finds artists through Qloo as you type. `api/related.js` shows similar artists when you tap one.
3. **Ask a question.** `api/explain.js` fetches each favorite artist's own Qloo entry (genres, lyrical themes, stage style and style words) and keeps each artist's data separate. It also fetches artists similar to each favorite as background.
4. **Write the lesson.** The per-artist data and the question go to Gemini, which writes one scene where the artists teach together: the first opens, each next one reacts and adds a new idea, and the last wraps up.
5. **Show the evidence.** The answer card has a "How Qloo shaped this answer" panel with the genres, themes and qualities, plus a block per artist with the style words and the stage-style description that Qloo supplied.

Favorites are saved in the browser (localStorage). There is no database and no login.

## Qloo calls used

All calls go to the Qloo hackathon API (`hackathon.api.qloo.com`) from serverless functions, so the key stays on the server.

- Artist search (`/search`) for the picker.
- Insights with a taste signal (`/v2/insights`, `filter.type=urn:entity:artist`, `signal.interests.entities`) for similar artists.
- Insights for one artist's full entry (`filter.results.entities`) for genres, lyrical themes, stage style, style words and fan words.
- Insights with a location signal (`signal.location.query`) for popular artists near the visitor.

## Files

- `index.html` is the whole front end.
- `api/popular.js`, `api/search.js`, `api/related.js`, `api/explain.js` are small serverless functions.
- `vercel.json` gives `explain.js` extra time to answer.

## Run your own copy

1. Fork this repo.
2. Get a Qloo hackathon API key (see the Qloo developer guide) and a Gemini API key from Google AI Studio.
3. Create a free project on Vercel and import your fork.
4. In the Vercel project settings, add two environment variables, `QLOO_API_KEY` and `GEMINI_API_KEY`, and enable them for Production and Preview.
5. Deploy. Open the Vercel link, pick up to three artists, and ask a question.

The location suggestions rely on headers that Vercel adds, so they only work when deployed on Vercel. Elsewhere the page falls back to the search box.

## Notes

- Artist images come from Qloo's API and are shown only for the Qloo Agentic Hackathon.
- Suggestions come straight from Qloo and can occasionally include entries that are not musicians.
- The writing is AI-generated in the style of each artist. It is not their real words and may contain language mistakes.
- Questions go to Google's Gemini free tier, where prompts may be used by Google.

## License

MIT
