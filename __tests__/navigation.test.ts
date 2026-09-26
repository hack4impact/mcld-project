import { getNavItems, isNavItemActive } from "@/lib/navigation";
import { ROLES } from "@/lib/roles";

const hrefs = (role: unknown) => getNavItems(role).map((item) => item.href);
const titles = (role: unknown) => getNavItems(role).map((item) => item.title);

describe("getNavItems", () => {
   it("gives coordinators their lessons, availability, services and users", () => {
      expect(titles(ROLES.COORDINATOR)).toEqual([
         "Overview",
         "Scheduled lessons",
         "Availability",
         "Services",
         "Users",
      ]);
      expect(hrefs(ROLES.COORDINATOR)).toEqual([
         "/",
         "/scheduled-lessons",
         "/availability",
         "/services",
         "/users",
      ]);
   });

   it("gives members their registrations and children", () => {
      expect(titles(ROLES.USER)).toEqual([
         "Overview",
         "My registrations",
         "My children",
      ]);
      expect(hrefs(ROLES.USER)).toEqual(["/", "/registrations", "/children"]);
   });

   it("gives admins the full admin menu", () => {
      expect(titles(ROLES.ADMIN)).toEqual([
         "Overview",
         "Services",
         "Users",
         "Finance",
         "Memberships",
         "Forms",
      ]);
      expect(hrefs(ROLES.ADMIN)).toEqual([
         "/",
         "/services",
         "/users",
         "/finance",
         "/memberships",
         "/forms",
      ]);
   });

   it.each([null, undefined, "", "superuser", "constructor", "__proto__"])(
      "only shows Overview for a missing or unknown role (%p)",
      (role) => {
         expect(hrefs(role)).toEqual(["/"]);
      },
   );
});

describe("isNavItemActive", () => {
   it("only matches Overview on the root path", () => {
      expect(isNavItemActive("/", "/")).toBe(true);
      expect(isNavItemActive("/services", "/")).toBe(false);
   });

   it("matches a link and its nested routes", () => {
      expect(isNavItemActive("/services", "/services")).toBe(true);
      expect(isNavItemActive("/services/abc", "/services")).toBe(true);
      expect(
         isNavItemActive("/scheduled-lessons/123", "/scheduled-lessons"),
      ).toBe(true);
   });

   it("does not match routes that merely share a prefix", () => {
      expect(isNavItemActive("/servicesX", "/services")).toBe(false);
      expect(isNavItemActive("/users-archive", "/users")).toBe(false);
   });
});
