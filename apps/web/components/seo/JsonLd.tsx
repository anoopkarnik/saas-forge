import type { ReactElement } from "react";

// "<" is escaped so content such as "</script>" in a post title cannot end the tag.
const JsonLd = ({ data }: { data: Record<string, unknown> }): ReactElement => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);

export default JsonLd;
