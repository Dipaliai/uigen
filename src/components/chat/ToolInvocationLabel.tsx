"use client";

interface ToolInvocation {
  toolName: string;
  command?: string;
  path?: string;
  state?: string;
  result?: string;
}

interface ToolInvocationLabelProps {
  toolInvocation: ToolInvocation;
}

const actionLabel = (command: string | undefined, path?: string, state?: string) => {
  const fileLabel = path ? `"${path}"` : "a file";
  const isResult = state === "result";

  switch (command) {
    case "create":
      return isResult ? `Created file ${fileLabel}` : `Creating file ${fileLabel}`;
    case "str_replace":
      return isResult ? `Edited file ${fileLabel}` : `Editing file ${fileLabel}`;
    case "insert":
      return isResult ? `Inserted text into ${fileLabel}` : `Inserting text into ${fileLabel}`;
    case "view":
      return isResult ? `Viewed file ${fileLabel}` : `Viewing file ${fileLabel}`;
    case "undo_edit":
      return isResult ? `Reverted edits in ${fileLabel}` : `Reverting edits in ${fileLabel}`;
    default:
      return path ? `Running ${command ?? "tool"} on ${fileLabel}` : `Running ${command ?? "tool"}`;
  }
};

export function ToolInvocationLabel({ toolInvocation }: ToolInvocationLabelProps) {
  return (
    <span className="text-neutral-700">
      {actionLabel(toolInvocation.command, toolInvocation.path, toolInvocation.state)}
    </span>
  );
}
