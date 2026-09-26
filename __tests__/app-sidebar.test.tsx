import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROLES, type Role } from "@/lib/roles";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
jest.mock("@/app/login/actions", () => ({ signout: jest.fn() }));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

beforeAll(() => {
   Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
         matches: false,
         media: query,
         onchange: null,
         addEventListener: jest.fn(),
         removeEventListener: jest.fn(),
         addListener: jest.fn(),
         removeListener: jest.fn(),
         dispatchEvent: jest.fn(),
      }),
   });
});

function renderSidebar(role: Role | null | undefined, pathname = "/") {
   mockUsePathname.mockReturnValue(pathname);
   return render(
      <TooltipProvider>
         <SidebarProvider>
            <AppSidebar
               role={role}
               viewer={{ name: "Ada Lovelace", email: "ada@example.com" }}
            />
         </SidebarProvider>
      </TooltipProvider>,
   );
}

function mainMenuLinks() {
   const menu = screen.getByText("Menu").closest('[data-slot="sidebar-group"]');
   expect(menu).not.toBeNull();
   return within(menu as HTMLElement)
      .getAllByRole("link")
      .map((link) => link.textContent);
}

const ADMIN_ONLY = ["Finance", "Memberships", "Forms"];

describe("AppSidebar", () => {
   it.each([
      [
         ROLES.COORDINATOR,
         ["Overview", "Scheduled lessons", "Availability", "Services", "Users"],
      ],
      [ROLES.USER, ["Overview", "My registrations", "My children"]],
      [
         ROLES.ADMIN,
         ["Overview", "Services", "Users", "Finance", "Memberships", "Forms"],
      ],
   ] as const)("shows exactly the %s menu", (role, expected) => {
      renderSidebar(role);
      expect(mainMenuLinks()).toEqual(expected);
      expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
         "href",
         "/settings",
      );
      expect(
         screen.getByRole("button", { name: "Sign out" }),
      ).toBeInTheDocument();
   });

   it.each([null, undefined, "superuser" as Role])(
      "falls back to Overview only for role %p",
      (role) => {
         renderSidebar(role);
         expect(mainMenuLinks()).toEqual(["Overview"]);
         for (const title of [...ADMIN_ONLY, "Availability", "Users"]) {
            expect(
               screen.queryByRole("link", { name: title }),
            ).not.toBeInTheDocument();
         }
         expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
      },
   );

   it("highlights the matching link on nested routes", () => {
      renderSidebar(ROLES.COORDINATOR, "/scheduled-lessons/abc");
      expect(
         screen.getByRole("link", { name: "Scheduled lessons" }),
      ).toHaveAttribute("data-active", "true");
      expect(
         screen.getByRole("link", { name: "Overview" }),
      ).not.toHaveAttribute("data-active", "true");
   });

   it("only highlights Overview on the root path", () => {
      renderSidebar(ROLES.USER, "/");
      expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
         "data-active",
         "true",
      );
      expect(
         screen.getByRole("link", { name: "My children" }),
      ).not.toHaveAttribute("data-active", "true");
   });
});
