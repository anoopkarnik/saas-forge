import { expect, it } from "vitest";
import type { Messages as IntlMessages } from "use-intl";
import { getMessages } from "./messages";

// Checked by `tsc` (typecheck): if the AppConfig augmentation in messages.ts
// stopped applying, use-intl's Messages would be a loose record, and the
// expected-error directive below would itself be reported as unused.
it("types use-intl messages from the English catalogue", () => {
  const known: IntlMessages["common"]["language"] = getMessages("en").common.language;
  // @ts-expect-error unknown keys are a type error
  const unknown: IntlMessages["common"]["nope"] = "x";
  expect([known, unknown]).toEqual(["Language", "x"]);
});
