import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLaunchpad,
  completeTask,
  importReport,
} from "@/lib/scaffold/launchpad/state";
import { LaunchpadView } from "./Launchpad";
import type {
  LaunchpadAIView,
  OperationView,
} from "@/lib/scaffold/launchpad/ai-types";

const project = {
  name: "Demo",
  slug: "demo",
  templateVersion: "2.0.0",
  config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe" },
  modules: ["billing"],
  platforms: ["web"],
};
const data = () => ({
  ...buildLaunchpad(project, null),
  markdown: "# Demo guide",
  ai: {
    brief: null,
    operations: [],
    helpHistory: [],
    stageStale: {},
  } as LaunchpadAIView,
});
const handlers = () => ({
  onPreferences: vi.fn(),
  onComplete: vi.fn(),
  onImport: vi.fn(async () => {}),
  busy: false,
  onSaveBrief: vi.fn(async () => {}),
  onConfirmBrief: vi.fn(),
  onStartOperation: vi.fn(),
  onCancelOperation: vi.fn(),
  onAcceptDraft: vi.fn(),
  onDiscardDraft: vi.fn(),
});
afterEach(cleanup);
function operation(overrides: Partial<OperationView>): OperationView {
  return {
    jobId: "job-1",
    kind: "generate",
    stage: "local",
    fingerprint: "f",
    briefRevision: 2,
    createdAt: new Date().toISOString(),
    status: "PENDING",
    result: null,
    error: null,
    stale: false,
    ...overrides,
  };
}

describe("Launchpad interface", () => {
  it("lets users jump freely between stages and confirms manual completion separately", () => {
    const props = handlers();
    render(<LaunchpadView data={data()} {...props} />);
    expect(screen.getByRole("heading", { name: "Demo" })).toBeTruthy();
    expect(screen.queryByText("Agent prompt")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Copy agent prompt" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Build your MVP/ }));
    expect(
      screen.getByRole("heading", {
        name: "Describe the first useful customer outcome",
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Mark complete" })[0]!,
    );
    expect(props.onComplete).toHaveBeenCalledWith("curated:mvp.define.1", true);
  });
  it("continues to the next task even within the already selected stage", async () => {
    const state = completeTask(
      project,
      null,
      "curated:local.account.postgres",
      true,
    );
    render(
      <LaunchpadView
        data={{
          ...data(),
          ...buildLaunchpad(project, state),
          markdown: "guide",
        }}
        {...handlers()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue setup" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Prepare Stripe" }),
      ),
    );
  });
  it("uses one guided view and lets users revisit completed tasks", () => {
    const props = handlers();
    const state = completeTask(
      project,
      null,
      "curated:local.account.postgres",
      true,
    );
    render(
      <LaunchpadView
        data={{ ...data(), ...buildLaunchpad(project, state) }}
        {...props}
      />,
    );
    expect(screen.queryByLabelText("Guide mode")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Prepare Postgres/ }));
    expect(
      screen.getByRole("heading", { name: "Prepare Postgres" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Undo completion" }),
    ).toBeTruthy();
    expect(screen.getByText(/1 of .* tasks complete/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Prepare Stripe/ }));
    expect(
      screen.queryByRole("heading", { name: "Prepare Postgres" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Prepare Stripe" }),
    ).toBeTruthy();
  });
  it("shows a curated guide and documentation immediately without starting AI", () => {
    const props = handlers();
    render(<LaunchpadView data={data()} {...props} />);
    expect(
      screen.queryByRole("button", { name: "Generate stage checklist" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /project brief/i }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Prepare Postgres" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "PostgreSQL documentation" })
        .getAttribute("href"),
    ).toBe("https://www.postgresql.org/docs/current/");
    expect(props.onStartOperation).not.toHaveBeenCalled();
  });
  it("does not display legacy AI drafts or replace curated instructions", () => {
    const initial = data();
    initial.ai.operations = [
      operation({
        status: "SUCCEEDED",
        result: { kind: "generate", tasks: [] },
      }),
    ];
    render(<LaunchpadView data={initial} {...handlers()} />);
    expect(
      screen.getByRole("heading", { name: "Prepare Postgres" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Accept checklist" }),
    ).toBeNull();
  });
  it("copies the curated installation command", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<LaunchpadView data={data()} {...handlers()} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Install project dependencies —/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Copy command: pnpm install" }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("pnpm install"));
  });
  it("does not restore an older draft after the latest draft is discarded", () => {
    const initial = data();
    const tasks = [
      {
        key: "old",
        anchorId: "local.accounts",
        title: "Superseded draft",
        purpose: "Prepare",
        instructions: ["Create an account"],
        technicalDetails: [],
        commandIds: [],
        filePaths: [],
        acceptance: ["Account exists"],
        verification: "Inspect account",
        fixes: [],
        sourceIds: [],
        dependencies: [],
      },
    ];
    initial.ai.operations = [
      operation({
        jobId: "old-job",
        status: "SUCCEEDED",
        result: { kind: "generate", tasks },
      }),
      operation({
        jobId: "new-job",
        status: "SUCCEEDED",
        discarded: true,
        result: { kind: "generate", tasks: [] },
      }),
    ];
    render(<LaunchpadView data={initial} {...handlers()} />);
    expect(
      screen.queryByRole("heading", { name: /Superseded draft/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Accept checklist" }),
    ).toBeNull();
  });
  it("shows active work and cancellation on a resumed operation", () => {
    const props = handlers();
    const initial = data();
    initial.ai.operations = [operation({ status: "RUNNING" })];
    render(<LaunchpadView data={initial} {...props} />);
    expect(screen.getByText(/An earlier AI checklist request/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    expect(props.onCancelOperation).toHaveBeenCalledWith("job-1");
  });
  it("asks for task help and shows answers without marking progress complete", () => {
    const props = handlers();
    const initial = data();
    initial.ai.helpHistory = [
      {
        taskId: "curated:local.account.postgres",
        question: "Which account first?",
        answer: "Start with your database account.",
        sourceIds: [],
        at: new Date().toISOString(),
      },
    ];
    render(<LaunchpadView data={initial} {...props} />);
    fireEvent.change(screen.getByLabelText("Question about this task"), {
      target: { value: "Can I use a local database?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask for help" }));
    expect(props.onStartOperation).toHaveBeenCalledWith({
      kind: "help",
      stage: "local",
      taskId: "curated:local.account.postgres",
      message: "Can I use a local database?",
    });
    expect(screen.getByText("Start with your database account.")).toBeTruthy();
    expect(props.onComplete).not.toHaveBeenCalled();
  });
  it("keeps task help optional without offering generated checklist changes", () => {
    const initial = data();
    initial.ai.helpHistory = [
      {
        taskId: initial.tasks[0]!.id,
        question: "Explain setup",
        answer: "Use the documented service",
        sourceIds: [],
        at: new Date().toISOString(),
      },
    ];
    render(<LaunchpadView data={initial} {...handlers()} />);
    expect(screen.getByText("Use the documented service")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Request stage changes" }),
    ).toBeNull();
  });
  it("shows a failed help operation and directs users to ask again", () => {
    const initial = data();
    initial.ai.operations = [
      operation({
        kind: "help",
        taskId: "curated:local.account.postgres",
        status: "FAILED",
        error: "The help service is unavailable.",
      }),
    ];
    render(<LaunchpadView data={initial} {...handlers()} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "The help service is unavailable.",
    );
    expect(screen.getByRole("alert").textContent).toContain("ask again");
  });
  it("sends sanitized report data and the selected environment, never raw messages", async () => {
    const props = handlers();
    render(<LaunchpadView data={data()} {...props} />);
    fireEvent.change(screen.getByLabelText("Report environment"), {
      target: { value: "production" },
    });
    const file = new File(
      [
        JSON.stringify({
          modules: ["billing"],
          platforms: ["web"],
          checks: [
            {
              group: "services",
              id: "stripe",
              status: "ok",
              message: "sk_live_secret",
              data: { token: "secret" },
            },
          ],
        }),
      ],
      "report.json",
      { type: "application/json" },
    );
    fireEvent.change(screen.getByLabelText("Import doctor JSON report"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(props.onImport).toHaveBeenCalledWith(
        {
          modules: ["billing"],
          platforms: ["web"],
          checks: [{ group: "services", id: "stripe", status: "ok" }],
        },
        "production",
      ),
    );
  });
  it("shows failed report evidence distinctly and keeps production unchecked", () => {
    const state = importReport(
      project,
      null,
      {
        modules: ["billing"],
        platforms: ["web"],
        checks: [{ group: "services", id: "stripe", status: "fail" }],
      },
      "local",
    );
    render(
      <LaunchpadView
        data={{
          ...data(),
          ...buildLaunchpad(project, state),
          markdown: "guide",
        }}
        {...handlers()}
      />,
    );
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Launch —/ }));
    expect(screen.queryByText("Passed imported check")).toBeNull();
    expect(screen.getAllByText("Not checked").length).toBeGreaterThan(0);
  });
  it("reports malformed imports without making a mutation", async () => {
    const props = handlers();
    render(<LaunchpadView data={data()} {...props} />);
    const file = new File(["not JSON"], "report.json");
    fireEvent.change(screen.getByLabelText("Import doctor JSON report"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(props.onImport).not.toHaveBeenCalled();
  });
});
