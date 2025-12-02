import MdxAlert from "@workspace/ui/components/mdx/Alert";
import MdxBadge from "@workspace/ui/components/mdx/Badge";
import blockquote from "@workspace/ui/components/mdx/blockquote";
import code from "@workspace/ui/components/mdx/code";
import h1 from "@workspace/ui/components/mdx/h1";
import h2 from "@workspace/ui/components/mdx/h2";
import h3 from "@workspace/ui/components/mdx/h3";
import MdxSeparator from "@workspace/ui/components/mdx/hr";
import Li from "@workspace/ui/components/mdx/li";
import Ol from "@workspace/ui/components/mdx/ol";
import Ul from "@workspace/ui/components/mdx/ul";

export const components:any = {
  h1: h1,
  h2: h2,
  h3: h3,
  blockquote: blockquote,
  Alert: MdxAlert,
  Badge: MdxBadge,
  hr: MdxSeparator,
  code: code,
  ul: Ul,
  ol: Ol,
  li: Li,
};