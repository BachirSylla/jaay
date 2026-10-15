"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { fr } from "@/messages/fr";

type ArchiveButtonProps = {
  archived: boolean;
  title: string;
  description: string;
  archivedToast: string;
  unarchivedToast: string;
  onToggle: (archived: boolean) => Promise<ActionResult>;
};

/** Archive (with confirmation) or restore a reference record. */
export function ArchiveButton({
  archived,
  title,
  description,
  archivedToast,
  unarchivedToast,
  onToggle,
}: ArchiveButtonProps) {
  if (archived) {
    return (
      <Button
        variant="outline"
        onClick={async () => {
          const result = await onToggle(false);
          if (result.ok) toast.success(unarchivedToast);
          else toast.error(errorMessage(result.error));
        }}
      >
        <ArchiveRestore data-icon="inline-start" aria-hidden="true" />
        {fr.common.unarchive}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline">
          <Archive data-icon="inline-start" aria-hidden="true" />
          {fr.common.archive}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={fr.common.archive}
      onConfirm={async () => {
        const result = await onToggle(true);
        if (result.ok) toast.success(archivedToast);
        else toast.error(errorMessage(result.error));
        return result.ok;
      }}
    />
  );
}
