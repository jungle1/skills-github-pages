# Financial Accounting Knowledge Toolbox Quiz

This version includes:

- `index.html`: the public quiz page
- `netlify/functions/score.js`: the private AI scoring backend
- `netlify.toml`: Netlify deployment settings

## Deploy With AI Scoring

GitHub Pages can host `index.html`, but it cannot run the AI scorer because API keys must stay private. Deploy this repository to Netlify to make automatic scoring work.

1. Push these files to a GitHub repository.
2. Go to Netlify and choose **Add new site > Import an existing project**.
3. Select the GitHub repository.
4. Leave the build command empty.
5. Use `.` as the publish directory.
6. Add an environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: your OpenAI API key
7. Deploy the site.

After deployment, the quiz page will call:

```text
/.netlify/functions/score
```

Netlify keeps the API key server-side, so students can use the quiz without seeing the key.

## Keeping GitHub Pages

If you want to keep the quiz page on GitHub Pages and use Netlify only for the scorer, set this before the main quiz script in `index.html`:

```html
<script>
  window.AI_SCORING_ENDPOINT = "https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/score";
</script>
```

Replace `YOUR-NETLIFY-SITE` with the real Netlify site name.

## Optional Model Setting

By default, the function uses:

```text
gpt-4o-mini
```

To use another model, add this environment variable in Netlify:

```text
OPENAI_MODEL
```
