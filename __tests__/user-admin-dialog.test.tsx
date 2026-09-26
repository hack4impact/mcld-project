import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import {
   CreateUserDialog,
   EditUserDialog,
} from "@/app/(authenticated)/users/_components/user-admin-dialog";
import type { UserRow } from "@/app/(authenticated)/users/profile-role-label";

jest.mock("@/app/(authenticated)/users/actions", () => ({
   createUserAdmin: jest.fn(),
   updateUserAdmin: jest.fn(),
}));

const user: UserRow = {
   id: "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70",
   firstName: "Ada",
   lastName: "Lovelace",
   email: "ada@example.com",
   role: "user",
   isActive: true,
   lastLoginAt: new Date("2026-09-01T00:00:00Z"),
   stripeCustomerId: null,
   address: "123 Main St",
   gender: "female",
   dob: "1990-04-12",
   phone: "5145550100",
};

function hiddenValue(name: string) {
   const input = document.querySelector<HTMLInputElement>(
      `input[type="hidden"][name="${name}"]`,
   );
   if (!input) throw new Error(`No hidden input named ${name}`);
   return input.value;
}

describe("EditUserDialog", () => {
   it("prefills the user's contact details", () => {
      render(<EditUserDialog user={user} open onOpenChange={jest.fn()} />);

      expect(screen.getByLabelText("Phone")).toHaveValue("5145550100");
      expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-04-12");
      expect(screen.getByLabelText("Address")).toHaveValue("123 Main St");
      expect(
         screen.getByRole("combobox", { name: "Gender" }),
      ).toHaveTextContent("Female");
      expect(hiddenValue("gender")).toBe("female");
      expect(hiddenValue("dob")).toBe("1990-04-12");
   });

   it("submits an empty gender when none is set", () => {
      render(
         <EditUserDialog
            user={{
               ...user,
               gender: null,
               dob: null,
               phone: null,
               address: null,
            }}
            open
            onOpenChange={jest.fn()}
         />,
      );

      expect(
         screen.getByRole("combobox", { name: "Gender" }),
      ).toHaveTextContent("Not specified");
      expect(hiddenValue("gender")).toBe("");
      expect(screen.getByLabelText("Phone")).toHaveValue("");
      expect(screen.getByLabelText("Address")).toHaveValue("");
   });
});

describe("CreateUserDialog", () => {
   it("shows empty, optional contact details", () => {
      render(<CreateUserDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Add user" }));

      expect(screen.getByText("Contact details")).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Phone")).toHaveValue("");
      expect(screen.getByLabelText("Date of birth")).toHaveValue("");
      expect(screen.getByLabelText("Address")).toHaveValue("");
      expect(hiddenValue("gender")).toBe("");
   });
});
