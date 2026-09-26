import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Role } from "@/lib/roles";

jest.mock("next/navigation", () => ({
   usePathname: () => "/",
}));

jest.mock("@/app/login/actions", () => ({
   signout: jest.fn(),
}));

beforeAll(() => {
   window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
   });
});

function renderSidebar(role: Role) {
   render(
      <TooltipProvider>
         <SidebarProvider>
            <AppSidebar role={role} />
         </SidebarProvider>
      </TooltipProvider>,
   );
}

describe("AppSidebar", () => {
   it.each(["admin", "coordinator"] as const)(
      "links %ss to Availability",
      (role) => {
         renderSidebar(role);
         expect(
            screen.getByRole("link", { name: "Availability" }),
         ).toHaveAttribute("href", "/availability");
      },
   );

   it("doesn't show Availability to regular users", () => {
      renderSidebar("user");
      expect(
         screen.queryByRole("link", { name: "Availability" }),
      ).not.toBeInTheDocument();
   });
});
