"use client";

import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { initials } from "@/lib/initials";
import { ASSIGNABLE_ROLES, can } from "@/lib/permissions";
import { fr } from "@/messages/fr";
import { removeMember, updateMemberRole } from "../actions";
import { useShop } from "../shop-context";
import type { Member } from "../types";

const t = fr.members;

export function MembersList({ members }: { members: Member[] }) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
      {members.map((member) => (
        <MemberRow key={member.userId} member={member} />
      ))}
    </ul>
  );
}

function MemberRow({ member }: { member: Member }) {
  const { shop, role, user } = useShop();
  const [pending, startTransition] = useTransition();
  const isSelf = member.userId === user.id;
  // Nobody edits the owner; members do not change their own role from here.
  const editable = can(role, "manageMembers") && member.role !== "owner" && !isSelf;

  const changeRole = (next: string) => {
    const parsed = ASSIGNABLE_ROLES.find((value) => value === next);
    if (!parsed) return;
    startTransition(async () => {
      const result = await updateMemberRole(shop.id, member.userId, parsed);
      if (result.ok) toast.success(t.roleUpdated);
      else toast.error(errorMessage(result.error));
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-cognac-tint font-semibold text-cognac"
      >
        {initials(member.fullName || member.email || "")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">
          {member.fullName}
          {isSelf ? (
            <span className="font-normal text-muted-foreground"> ({fr.common.you})</span>
          ) : null}
        </span>
        <span className="truncate text-sm text-muted-foreground">{member.email}</span>
        <span className="text-xs text-subtle">
          {t.since} {formatDate(member.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2 max-sm:w-full max-sm:pl-15">
        {editable ? (
          <>
            <Select value={member.role} onValueChange={changeRole} disabled={pending}>
              <SelectTrigger
                aria-label={`${t.changeRole} — ${member.fullName}`}
                className="min-w-40 max-sm:flex-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((value) => (
                  <SelectItem key={value} value={value} className="min-h-10">
                    {fr.shop.roles[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t.remove} — ${member.fullName}`}
                  disabled={pending}
                >
                  <UserMinus aria-hidden="true" />
                </Button>
              }
              title={t.removeTitle}
              description={t.removeDescription}
              confirmLabel={t.remove}
              onConfirm={async () => {
                const result = await removeMember(shop.id, member.userId);
                if (result.ok) toast.success(t.removed);
                else toast.error(errorMessage(result.error));
                return result.ok;
              }}
            />
          </>
        ) : (
          <span className="inline-flex h-8 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold">
            {fr.shop.roles[member.role]}
          </span>
        )}
      </div>
    </li>
  );
}
