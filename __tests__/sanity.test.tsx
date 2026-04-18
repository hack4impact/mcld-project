import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(authenticated)/dashboard/page";

describe("jest setup", () => {
  it("runs React + Testing Library", async () =>  {
    const jsx = await DashboardPage();
    render(jsx);
    expect(screen.getByText("You are admin")).toBeInTheDocument();
  });
});
