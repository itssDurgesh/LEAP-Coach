"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ExternalLink, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";

export default function AdminPrivacyPage() {
  return (
    <AdminShell title="Privacy Policy" subtitle="Edit the policy shown on your public /privacy page" requires="homepage">
      <PrivacyAdmin />
    </AdminShell>
  );
}

function PrivacyAdmin() {
  const { privacyPolicy, savePrivacyPolicy } = useApp();
  const [text, setText] = React.useState(privacyPolicy);
  const [saved, setSaved] = React.useState(false);

  // Keep the editor in sync if the store loads/updates the value after mount.
  React.useEffect(() => setText(privacyPolicy), [privacyPolicy]);

  const dirty = text !== privacyPolicy;

  function save() {
    savePrivacyPolicy(text.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card padded className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold-600" />
          <h2 className="font-heading text-base font-semibold text-heading">Policy content</h2>
        </div>
        <Link href="/privacy" target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800">
          View public page <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      <p className="text-sm text-muted">
        Separate sections with a blank line. The first line of a section becomes its heading on the public page.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[420px] font-mono text-sm leading-relaxed"
        placeholder="Write your privacy policy…"
      />
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={save} disabled={!dirty || !text.trim()}>Save changes</Button>
      </div>
    </Card>
  );
}
