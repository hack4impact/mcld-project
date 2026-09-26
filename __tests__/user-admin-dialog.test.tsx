import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import {
   CreateUserDialog,
   EditUserDialog,
} from "@/app/(authenticated)/users/_components/user-admin-dialog";
import { updateUserAdmin } from "@/app/(authenticated)/users/actions";
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
   invitePending: false,
};

// The server actions read these exact names from the submitted FormData.
function submitted(name: string) {
   const inputs = document.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]`,
   );
   if (inputs.length !== 1) {
      throw new Error(`Expected one input named ${name}, got ${inputs.length}`);
   }
   return inputs[0]!.value;
}

describe("EditUserDialog", () => {
   it("prefills the user's contact details under the names the action reads", () => {
      render(<EditUserDialog user={user} open onOpenChange={jest.fn()} />);

      expect(screen.getByLabelText("Phone")).toHaveValue("5145550100");
      expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-04-12");
      expect(screen.getByLabelText("Address")).toHaveValue("123 Main St");
      expect(
         screen.getByRole("combobox", { name: "Gender" }),
      ).toHaveTextContent("Female");

      expect(submitted("phone")).toBe("5145550100");
      expect(submitted("dob")).toBe("1990-04-12");
      expect(submitted("address")).toBe("123 Main St");
      expect(submitted("gender")).toBe("female");
   });

   it("leaves every field empty when the user has no details", () => {
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
      expect(submitted("gender")).toBe("");
      expect(submitted("phone")).toBe("");
      expect(submitted("dob")).toBe("");
      expect(submitted("address")).toBe("");
   });

   it("keeps the typed values when the server rejects them", async () => {
      jest.mocked(updateUserAdmin).mockResolvedValue({
         errors: { phone: ["Phone number must be 10–15 digits"] },
      });
      render(<EditUserDialog user={user} open onOpenChange={jest.fn()} />);

      fireEvent.change(screen.getByLabelText("Phone"), {
         target: { value: "12345" },
      });
      fireEvent.change(screen.getByLabelText("Address"), {
         target: { value: "456 Side St" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      expect(
         await screen.findByText("Phone number must be 10–15 digits"),
      ).toBeInTheDocument();
      const formData = jest.mocked(updateUserAdmin).mock.calls[0]![1];
      expect(formData.get("phone")).toBe("12345");
      expect(formData.get("address")).toBe("456 Side St");
      expect(screen.getByLabelText("Phone")).toHaveValue("12345");
      expect(screen.getByLabelText("Address")).toHaveValue("456 Side St");
      expect(submitted("gender")).toBe("female");
   });
});

describe("CreateUserDialog", () => {
   it("invites instead of asking the admin for a password", () => {
      render(<CreateUserDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Add user" }));

      expect(
         screen.getByText(
            /email them an invitation to choose their own password/,
         ),
      ).toBeInTheDocument();
      expect(
         screen.getByRole("button", { name: "Send invitation" }),
      ).toBeInTheDocument();
      expect(document.querySelector('input[type="password"]')).toBeNull();
   });

   it("shows empty, optional contact details", () => {
      render(<CreateUserDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Add user" }));

      expect(screen.getByText("Contact details")).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
      expect(submitted("phone")).toBe("");
      expect(submitted("dob")).toBe("");
      expect(submitted("address")).toBe("");
      expect(submitted("gender")).toBe("");
   });
});
