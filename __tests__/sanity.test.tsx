import DashboardPage from "@/app/dashboard/page";

const redirect = jest.fn();

jest.mock("next/navigation", () => ({
   redirect: (...args: unknown[]) => redirect(...args),
}));

describe("jest setup", () => {
   it("redirects the dashboard root to programs", () => {
      DashboardPage();
      expect(redirect).toHaveBeenCalledWith("/dashboard/services/programs");
   });
});
