import { NextRequest, NextResponse } from "next/server";
import { getActionItems, formatActionItemsForSlack } from "@/lib/notifications";
import { sendSlackMessage } from "@/lib/slack";

// Triggered on a schedule (see .github/workflows/notify.yml) to post a Slack digest of anything
// due — unsent scheduled emails, unmarked engagement check-ins. Sends nothing if the queue is empty.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getActionItems();
  const message = formatActionItemsForSlack(items);

  if (message) {
    await sendSlackMessage(message);
  }

  return NextResponse.json({
    sent: !!message,
    dueEmails: items.dueEmails.length,
    dueEngagement: items.dueEngagement.length,
  });
}
