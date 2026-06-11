import { render, screen } from "@testing-library/react";
import { TestComponent } from "./test-component";

describe("jest setup", () => {
   it("runs React + Testing Library", () => {
      render(<TestComponent />);
      expect(screen.getByText("ok")).toBeInTheDocument();
   });
});
