import { render, screen } from "@testing-library/react";

describe("jest setup", () => {
  it("runs React + Testing Library", () => {
    render(<div>ok</div>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
