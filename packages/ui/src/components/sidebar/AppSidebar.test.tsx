import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", resolvedTheme: "light" }) }));
vi.mock("@workspace/ui/components/shadcn/sidebar", () => {
  const Pass = ({ children }: any) => <div>{children}</div>;
  return {
    Sidebar: Pass,
    SidebarContent: Pass,
    SidebarFooter: Pass,
    SidebarGroup: Pass,
    SidebarGroupLabel: Pass,
    SidebarHeader: Pass,
    SidebarMenu: Pass,
    SidebarMenuButton: Pass,
    SidebarMenuItem: Pass,
  };
});

describe("AppSidebar slots", () => {
  it("renders the workspace slot in the header", () => {
    render(
      <AppSidebar
        navbarConfig={null}
        pathname="/"
        onNavigateHome={vi.fn()}
        slotWorkspace={<div>workspace-switcher</div>}
      />,
    );
    expect(screen.getByText("workspace-switcher")).toBeTruthy();
  });
});
