import { render, screen } from "@testing-library/react";

function SanityTestComponent() {
  return <div>ok</div>;
}

describe("jest setup", () => {
  it("runs React + Testing Library", () => {
    render(<SanityTestComponent />);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
