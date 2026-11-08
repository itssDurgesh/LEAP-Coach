#!/usr/bin/env node
// Move the site's existing Mux videos to signed playback.
//
// A public playback id plays for anyone who has it. This gives each session's video
// a signed playback id (it plays only with tokens from the site, see
// lib/mux/playback.ts), saves that id on the session in place of the public one
// and, as a separate last step, deletes the public ids so copies of them stop working.
//
// Nothing changes without --apply. Run it from the project folder (Node 20.6+):
//
//   1. node --env-file=.env.local scripts/mux-signed-playback.mjs
//        Look only: every session's playback id and what would change.
//
//   2. node --env-file=.env.local scripts/mux-signed-playback.mjs --apply
//        Adds a signed playback id to each video in Mux, checks a token signed with
//        MUX_SIGNING_KEY / MUX_PRIVATE_KEY plays it, then saves it on the sessions.
//        The site must already have the same two keys (Vercel → Settings →
//        Environment Variables, then redeploy), or these videos stop playing.
//
//   3. Open a few lessons on the site and check they play. Then:
//      node --env-file=.env.local scripts/mux-signed-playback.mjs --delete-public
//        Look only: the public ids that would be deleted.
//      node --env-file=.env.local scripts/mux-signed-playback.mjs --delete-public --apply
//        Deletes them. This cannot be undone: a video can be given a new public id,
//        but never the old one back.
//
// Needs, in the env file or the environment:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   the site's own
//   MUX_TOKEN_ID, MUX_TOKEN_SECRET   a Mux access token with Mux Video read + write
//                                    (Mux dashboard → Settings → Access tokens)
//   MUX_SIGNING_KEY, MUX_PRIVATE_KEY the signing key the site uses (step 2 only)

import { createPrivateKey, sign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const USAGE = `Usage: node --env-file=.env.local scripts/mux-signed-playback.mjs [--apply] [--delete-public]
  (no flags)                 list sessions and what would change
  --apply                    give each video a signed playback id and save it on its sessions
  --delete-public            list the public playback ids that would be deleted
  --delete-public --apply    delete them (cannot be undone)`;

const args = process.argv.slice(2);
const known = ["--apply", "--delete-public", "--help", "-h"];
if (args.some((a) => !known.includes(a))) {
  console.error(`Unknown option: ${args.filter((a) => !known.includes(a)).join(" ")}\n\n${USAGE}`);
  process.exit(2);
}
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const APPLY = args.includes("--apply");
const DELETE_PUBLIC = args.includes("--delete-public");

// MUX_API_URL / MUX_STREAM_URL exist only so the script can be tested against a stand-in.
const MUX_API = (process.env.MUX_API_URL || "https://api.mux.com").replace(/\/$/, "");
const MUX_STREAM = (process.env.MUX_STREAM_URL || "https://stream.mux.com").replace(/\/$/, "");

const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MUX_TOKEN_ID", "MUX_TOKEN_SECRET"];
if (APPLY && !DELETE_PUBLIC) need.push("MUX_SIGNING_KEY", "MUX_PRIVATE_KEY");
const missingEnv = need.filter((k) => !process.env[k]?.trim());
if (missingEnv.length) {
  console.error(`Missing ${missingEnv.join(", ")}. Put them in .env.local (see .env.local.example) and run with --env-file=.env.local.`);
  if (missingEnv.some((k) => k.startsWith("MUX_SIGNING") || k === "MUX_PRIVATE_KEY")) {
    console.error("--apply needs the signing key the site uses, to check the new signed ids play with it.");
  }
  process.exit(2);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const muxAuth = "Basic " + Buffer.from(`${process.env.MUX_TOKEN_ID.trim()}:${process.env.MUX_TOKEN_SECRET.trim()}`).toString("base64");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One Mux API call. 404 → { status: 404, data: null }; other failures throw. Waits out rate limits. */
async function mux(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(MUX_API + path, {
      method,
      headers: { Authorization: muxAuth, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 5) {
      await sleep((Number(res.headers.get("retry-after")) || 2 ** attempt) * 1000);
      continue;
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.status === 404) return { status: 404, data: null };
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Mux refused the access token (${res.status}). Check MUX_TOKEN_ID / MUX_TOKEN_SECRET, and that the token has Mux Video read and write.`);
    }
    if (!res.ok) throw new Error(`Mux ${method} ${path} failed (${res.status}): ${json?.error?.messages?.join(" ") ?? text.slice(0, 200)}`);
    return { status: res.status, data: json?.data ?? null };
  }
}

/** A real Mux id, not empty and not one of the seed's "mux_…" placeholders (same test as the site's). */
const isReal = (id) => !!id && !id.startsWith("mux_") && /^[A-Za-z0-9_-]{1,200}$/.test(id);

/** Every session with a real playback id, with its topic's title, grouped by id. */
async function loadSessions() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("videos")
      .select("id, title, course_id, order_index, mux_playback_id")
      .not("mux_playback_id", "is", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`Could not read the sessions: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const { data: courses, error } = await sb.from("courses").select("id, title");
  if (error) throw new Error(`Could not read the topics: ${error.message}`);
  const topic = new Map(courses.map((c) => [c.id, c.title]));
  const byId = new Map();
  for (const r of rows) {
    const playbackId = String(r.mux_playback_id).trim();
    if (!isReal(playbackId)) continue;
    const label = `${topic.get(r.course_id) ?? r.course_id} · session ${r.order_index}: ${r.title}`;
    if (!byId.has(playbackId)) byId.set(playbackId, []);
    byId.get(playbackId).push({ id: r.id, label });
  }
  return byId;
}

/** What Mux says about a playback id: its policy and its video (asset) with all of the video's ids. */
async function lookup(playbackId) {
  const pid = await mux("GET", `/video/v1/playback-ids/${encodeURIComponent(playbackId)}`);
  if (!pid.data) return { kind: "missing" };
  if (pid.data.object?.type !== "asset") return { kind: "other", type: pid.data.object?.type ?? "unknown" };
  const assetId = pid.data.object.id;
  const asset = await mux("GET", `/video/v1/assets/${encodeURIComponent(assetId)}`);
  if (!asset.data) return { kind: "missing" };
  return { kind: "asset", policy: pid.data.policy, assetId, playbackIds: asset.data.playback_ids ?? [] };
}

// ── Signing, the same way as lib/mux/playback.ts, to check a new id plays ──

function signingKey() {
  const raw = process.env.MUX_PRIVATE_KEY.trim();
  const pem = raw.includes("-----BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
  try {
    return { id: process.env.MUX_SIGNING_KEY.trim(), key: createPrivateKey(pem) };
  } catch (e) {
    console.error(`MUX_PRIVATE_KEY is not a usable private key: ${e.message}`);
    process.exit(2);
  }
}

function videoToken(key, playbackId) {
  const b64url = (s) => Buffer.from(s).toString("base64url");
  const restriction = process.env.MUX_PLAYBACK_RESTRICTION_ID?.trim();
  const header = { alg: "RS256", typ: "JWT", kid: key.id };
  const claims = { sub: playbackId, aud: "v", exp: Math.floor(Date.now() / 1000) + 600, kid: key.id, ...(restriction ? { playback_restriction_id: restriction } : {}) };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  return `${body}.${b64url(sign("sha256", Buffer.from(body), key.key))}`;
}

/** Whether the signed id plays with a token from the site's key (Mux answers the playlist). */
async function playsWithToken(key, playbackId) {
  const res = await fetch(`${MUX_STREAM}/${playbackId}.m3u8?token=${videoToken(key, playbackId)}`, { cache: "no-store" });
  await res.body?.cancel().catch(() => {});
  return res.status;
}

// ── Step 2: signed ids on the sessions ──────────────────────────────────────

async function convert() {
  const key = APPLY ? signingKey() : null;
  const byId = await loadSessions();
  const sessions = [...byId.values()].reduce((n, rows) => n + rows.length, 0);
  console.log(`${sessions} sessions use ${byId.size} Mux playback ids.${APPLY ? "" : " Looking only; nothing is changed without --apply."}\n`);
  const tally = { signed: 0, converted: 0, wouldConvert: 0, missing: 0, other: 0, failed: 0 };
  for (const [playbackId, rows] of byId) {
    const where = rows.map((r) => r.label).join("\n      ");
    try {
      const info = await lookup(playbackId);
      if (info.kind === "missing") {
        tally.missing++;
        console.log(`  NOT IN MUX   ${playbackId}\n      ${where}`);
        continue;
      }
      if (info.kind === "other") {
        tally.other++;
        console.log(`  SKIPPED      ${playbackId} is a ${info.type}, not a video\n      ${where}`);
        continue;
      }
      if (info.policy === "signed") {
        tally.signed++;
        console.log(`  SIGNED       ${playbackId}\n      ${where}`);
        continue;
      }
      let signed = info.playbackIds.find((p) => p.policy === "signed")?.id;
      if (!APPLY) {
        tally.wouldConvert++;
        console.log(`  PUBLIC       ${playbackId}: would ${signed ? `use the video's signed id ${signed}` : "add a signed id"}\n      ${where}`);
        continue;
      }
      if (!signed) {
        const created = await mux("POST", `/video/v1/assets/${encodeURIComponent(info.assetId)}/playback-ids`, { policy: "signed" });
        signed = created.data?.id;
        if (!signed) throw new Error("Mux did not return the new playback id.");
      }
      const status = await playsWithToken(key, signed);
      if (status !== 200) {
        throw new Error(
          status === 403
            ? `Mux refused a token signed with MUX_SIGNING_KEY ${key.id} (403). Check the key belongs to this Mux environment; the session keeps its public id.`
            : `The signed id ${signed} did not play (${status}); the session keeps its public id.`,
        );
      }
      const { data, error } = await sb.from("videos").update({ mux_playback_id: signed }).in("id", rows.map((r) => r.id)).select("id");
      if (error) throw new Error(`Could not save ${signed} on the sessions: ${error.message}`);
      if ((data?.length ?? 0) !== rows.length) throw new Error(`Saved ${signed} on ${data?.length ?? 0} of ${rows.length} sessions.`);
      tally.converted++;
      console.log(`  NOW SIGNED   ${playbackId} -> ${signed}\n      ${where}`);
    } catch (e) {
      tally.failed++;
      console.error(`  FAILED       ${playbackId}: ${e.message}\n      ${where}`);
      if (/refused the access token|refused a token signed/.test(e.message)) break; // every other id would fail the same way
    }
  }
  console.log(
    `\nSigned already: ${tally.signed}. ${APPLY ? `Switched to signed: ${tally.converted}.` : `Public, to switch: ${tally.wouldConvert}.`}` +
      ` Not in Mux: ${tally.missing}. Skipped: ${tally.other}. Failed: ${tally.failed}.`,
  );
  if (!APPLY && tally.wouldConvert) console.log("Run again with --apply once the site has MUX_SIGNING_KEY and MUX_PRIVATE_KEY.");
  if (APPLY && tally.converted) console.log("Check a few lessons play on the site, then run with --delete-public.");
  return tally.failed;
}

// ── Step 3: delete the public ids ───────────────────────────────────────────

async function deletePublic() {
  const byId = await loadSessions();
  console.log(`${APPLY ? "Deleting" : "Looking only: would delete"} the public playback ids of ${byId.size} videos' sessions.\n`);
  const inUse = new Set(byId.keys());
  const assets = new Set();
  const tally = { deleted: 0, wouldDelete: 0, stillPublic: 0, failed: 0 };
  for (const [playbackId, rows] of byId) {
    const where = rows.map((r) => r.label).join("\n      ");
    try {
      const info = await lookup(playbackId);
      if (info.kind !== "asset") continue;
      if (info.policy !== "signed") {
        tally.stillPublic++;
        console.log(`  STILL PUBLIC ${playbackId}: run with --apply first; nothing deleted for it\n      ${where}`);
        continue;
      }
      if (assets.has(info.assetId)) continue;
      assets.add(info.assetId);
      for (const p of info.playbackIds.filter((p) => p.policy === "public")) {
        if (inUse.has(p.id)) {
          tally.stillPublic++;
          console.log(`  IN USE       ${p.id} is still a session's id; not deleted`);
          continue;
        }
        if (!APPLY) {
          tally.wouldDelete++;
          console.log(`  WOULD DELETE ${p.id} (the video now plays as ${playbackId})\n      ${where}`);
          continue;
        }
        await mux("DELETE", `/video/v1/assets/${encodeURIComponent(info.assetId)}/playback-ids/${encodeURIComponent(p.id)}`);
        tally.deleted++;
        console.log(`  DELETED      ${p.id} (the video now plays as ${playbackId})\n      ${where}`);
      }
    } catch (e) {
      tally.failed++;
      console.error(`  FAILED       ${playbackId}: ${e.message}\n      ${where}`);
      if (/refused the access token/.test(e.message)) break;
    }
  }
  console.log(
    `\n${APPLY ? `Deleted: ${tally.deleted}.` : `Would delete: ${tally.wouldDelete}.`} Still public: ${tally.stillPublic}. Failed: ${tally.failed}.`,
  );
  if (!APPLY && tally.wouldDelete) console.log("Run again with --delete-public --apply to delete them. This cannot be undone.");
  return tally.failed;
}

try {
  const failed = DELETE_PUBLIC ? await deletePublic() : await convert();
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
}
