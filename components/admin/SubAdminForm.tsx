"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS, Permission, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Permission picker used when promoting a learner to sub-admin (users list + learner profile page). */
export function SubAdminForm({
  user,
  onSave,
  onCancel,
}: {
  user: User;
  onSave: (perms: Permission[]) => void;
  onCancel: () => void;
}) {
  const [perms, setPerms] = React.useState<Permission[]>(user.permissions ?? []);
  const toggle = (p: Permission) => setPerms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Avatar src={user.avatarUrl} name={user.name} size={44} />
        <div>
          <p className="font-heading font-semibold text-heading">{user.name}</p>
          <p className="text-xs text-faint">{user.email}</p>
        </div>
      </div>
      <p className="text-sm text-muted">
        Pick the areas this sub-admin can manage. They can never delete topics, manage users, change pricing, or publish
        without your approval — those stay owner-only.
      </p>
      <div className="space-y-2">
        {PERMISSIONS.map((p) => {
          const on = perms.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                on ? "border-gold-400 bg-v2-gold-soft" : "border-hair hover:border-faint",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2",
                  on ? "border-gold-500 bg-gold-500 text-white" : "border-hair",
                )}
              >
                {on && <ShieldCheck className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-heading">{p.label}</span>
                <span className="block text-xs text-muted">{p.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={() => onSave(perms)}>Save access</Button>
      </div>
    </div>
  );
}
