# The Explainer

Learn any topic from the artists you love. A student picks up to three favorite artists, asks anything, and the artists teach it together in one short scene, each in their own style and language mix. Qloo's taste data shapes every voice, and Gemini writes the lesson.

Live demo: https://the-explainer-six.vercel.app

## How it works

1. **Pick artists.** `api/search.js` finds artists through the Qloo API. `api/related.js` shows similar artists when you tap one.
2. **Ask a question.** `api/explain.js` asks Qloo for each favorite artist's genres, lyrical themes and musical qualities.
3. **Write the lesson.** The taste profile and the question go to Gemini, which writes the scene. The page also shows a "How Qloo shaped this answer" panel with the data that was used.

Favorites are saved in the browser (localStorage). There is no database and no login.

## Files

- `index.html` is the whole front end.
- `api/search.js`, `api/related.js`, `api/explain.js` are small serverless functions that keep the API keys on the server.
- `vercel.json` gives `explain.js` extra time to answer.

## Run your own copy

1. Fork this repo.
2. Get a Qloo hackathon API key (see the Qloo developer guide) and a Gemini API key from Google AI Studio.
3. Create a free project on Vercel and import your fork.
4. In the Vercel project settings, add two environment variables: `QLOO_API_KEY` and `GEMINI_API_KEY`.
5. Deploy. Open the Vercel link, pick up to three artists, and ask a question.

The keys are never in the code. They live only in Vercel's environment variables.

## Notes

- Artist images come from Qloo's API and are shown only for the Qloo Agentic Hackathon.
- The writing is AI-generated in the style of each artist. It is not their real words.
- Questions go to Google's Gemini free tier, where prompts may be used by Google.

## License

MIT
