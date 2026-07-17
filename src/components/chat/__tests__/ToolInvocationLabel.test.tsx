import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ToolInvocationLabel } from "../ToolInvocationLabel";

afterEach(() => {
  cleanup();
});

describe("ToolInvocationLabel", () => {
  test("renders create tool label with path", () => {
    render(
      <ToolInvocationLabel
        toolInvocation={{
          toolName: "str_replace_editor",
          command: "create",
          path: "src/App.jsx",
          state: "result",
        }}
      />
    );

    expect(screen.getByText('Created file "src/App.jsx"')).toBeDefined();
  });

  test("renders editing tool label with path", () => {
    render(
      <ToolInvocationLabel
        toolInvocation={{
          toolName: "str_replace_editor",
          command: "str_replace",
          path: "src/App.jsx",
        }}
      />
    );

    expect(screen.getByText('Editing file "src/App.jsx"')).toBeDefined();
  });

  test("renders inserting tool label with path", () => {
    render(
      <ToolInvocationLabel
        toolInvocation={{
          toolName: "str_replace_editor",
          command: "insert",
          path: "src/App.jsx",
        }}
      />
    );

    expect(screen.getByText('Inserting text into "src/App.jsx"')).toBeDefined();
  });

  test("falls back to generic text when no path is provided", () => {
    render(
      <ToolInvocationLabel
        toolInvocation={{
          toolName: "str_replace_editor",
          command: "view",
        }}
      />
    );

    expect(screen.getByText('Viewing file a file')).toBeDefined();
  });
});
