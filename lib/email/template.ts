/**
 * Branded HTML email template (inline styles — email clients ignore stylesheets).
 * Gold / navy / cream, matching the site. Body text is plain text split into
 * paragraphs on blank lines; all user content is HTML-escaped.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.leapcoach.in";

const NAVY = "#16305C";
const GOLD = "#D49B1E";
const CREAM = "#FAF5EA";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#31405A;">${esc(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export function renderBroadcastEmail(args: {
  kicker: string; // small label above the title, e.g. "Announcement" / "Live session"
  title: string;
  body: string;
  cta?: { label: string; url: string };
  detailLines?: string[]; // e.g. session date/time, instructor
  unsubscribeUrl?: string; // per-recipient opt-out link (rendered in the footer when present)
}): string {
  const detail = (args.detailLines ?? []).filter(Boolean);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEE5D2;">
        <tr>
          <td style="background:${NAVY};padding:22px 32px;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.3px;">LEAP <span style="color:${GOLD};">Coach</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 32px 8px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${GOLD};">${esc(args.kicker)}</p>
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:${NAVY};">${esc(args.title)}</h1>
            ${
              detail.length
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${CREAM};border-radius:10px;width:100%;"><tr><td style="padding:12px 16px;">${detail
                    .map((l) => `<p style="margin:0;font-size:14px;line-height:1.7;color:${NAVY};font-weight:600;">${esc(l)}</p>`)
                    .join("")}</td></tr></table>`
                : ""
            }
            ${paragraphs(args.body)}
          </td>
        </tr>
        ${
          args.cta
            ? `<tr><td style="padding:8px 32px 30px;">
                 <a href="${esc(args.cta.url)}" style="display:inline-block;background:${GOLD};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;">${esc(args.cta.label)}</a>
               </td></tr>`
            : `<tr><td style="padding:0 32px 26px;"></td></tr>`
        }
        <tr>
          <td style="background:#FCFAF4;border-top:1px solid #EEE5D2;padding:18px 32px;">
            <p style="margin:0;font-size:12px;line-height:1.7;color:#8A97AC;">
              You're receiving this because you have a LEAP Coach account.
              Replies to this email reach our team directly.
              <br/><a href="${esc(SITE_URL)}" style="color:${GOLD};text-decoration:none;font-weight:600;">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a>${
                args.unsubscribeUrl
                  ? `
              <br/><span style="color:#B4BDCB;">Don't want these emails? <a href="${esc(args.unsubscribeUrl)}" style="color:#8A97AC;text-decoration:underline;">Unsubscribe</a>.</span>`
                  : ""
              }
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
