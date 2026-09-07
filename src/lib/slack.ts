// Posts a message to the Slack Incoming Webhook configured in SLACK_WEBHOOK_URL. Not set up until
// that env var exists — silently no-ops so the rest of the app never depends on Slack being wired.
export async function sendSlackMessage(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
