import type { Bot } from "grammy";
import { sb, chatsForRole, chatForUser } from "./supabase";

/** Send without crashing the stream if a user has blocked/deleted the chat. */
async function safeSend(bot: Bot, chatId: number, text: string): Promise<void> {
  try {
    await bot.api.sendMessage(chatId, text);
  } catch (e: any) {
    console.warn(`[bot] send to ${chatId} failed:`, e?.message ?? e);
  }
}

/**
 * Subscribe to Supabase Realtime and push:
 *   • new published announcements  → learners matching target_role
 *   • new published topics/courses → everyone (deduped per process run)
 *   • reply / @mention notifications → the mentioned user
 *
 * Uses the service-role websocket (outbound only — works on localhost). The bot does
 * NOT write any "already notified" flags (it stays read-only on app data), so course
 * announcements are deduped in memory for the lifetime of the process.
 */
export function startNotifier(bot: Bot) {
  const announcedCourses = new Set<string>();

  return sb
    .channel("leap-bot-notify")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, async (payload) => {
      const a: any = payload.new;
      if (!a?.published) return;
      const chats = await chatsForRole(a.target_role);
      for (const c of chats) await safeSend(bot, c, `📢 Announcement: ${a.title}\n\n${a.body ?? ""}`);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "courses" }, async (payload) => {
      const c: any = payload.new;
      if (!c?.published || announcedCourses.has(c.id)) return;
      announcedCourses.add(c.id);
      const chats = await chatsForRole("all");
      for (const ch of chats) await safeSend(bot, ch, `🆕 New topic just launched: ${c.title}\nOpen LEAP Coach to start learning.`);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses" }, async (payload) => {
      const c: any = payload.new;
      if (!c?.published || announcedCourses.has(c.id)) return;
      announcedCourses.add(c.id);
      const chats = await chatsForRole("all");
      for (const ch of chats) await safeSend(bot, ch, `🆕 New topic just launched: ${c.title}\nOpen LEAP Coach to start learning.`);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, async (payload) => {
      const n: any = payload.new;
      const chatId = await chatForUser(n.user_id);
      if (!chatId) return;
      const verb = n.type === "mention" ? "mentioned you" : "replied to you";
      await safeSend(bot, chatId, `💬 ${n.actor_name ?? "Someone"} ${verb} in a discussion:\n“${n.preview ?? ""}”`);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") console.log("[bot] realtime notifications: live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[bot] realtime status:", status);
    });
}
