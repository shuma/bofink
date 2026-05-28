"use client";

import { XIcon } from "lucide-react";
import { usePromptInputAttachments } from "./prompt-input";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type PromptInputAttachmentsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputAttachments = ({
  className,
  ...props
}: PromptInputAttachmentsProps) => {
  const { files, remove } = usePromptInputAttachments();

  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2 p-2 pb-0", className)}
      {...props}
    >
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative flex items-center gap-2 rounded-lg border bg-muted/50 p-1.5 pr-2"
        >
          {file.mediaType?.startsWith("image/") && file.url ? (
            /* eslint-disable-next-line @next/next/no-img-element -- blob URLs are not supported by next/image */
            <img
              src={file.url}
              alt={file.filename ?? "Attachment"}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
              {getFileExtension(file.filename)}
            </div>
          )}
          <span className="max-w-[100px] truncate text-xs text-muted-foreground">
            {file.filename ?? "File"}
          </span>
          <button
            type="button"
            onClick={() => remove(file.id)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity hover:bg-foreground/80 group-hover:opacity-100"
            aria-label={`Ta bort ${file.filename ?? "bilaga"}`}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

function getFileExtension(filename: string | undefined): string {
  if (!filename) return "FILE";
  const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
  return ext.length > 4 ? ext.slice(0, 4) : ext;
}
