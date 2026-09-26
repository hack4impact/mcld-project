import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
   CreateUserDialog,
   EditUserDialog,
} from "@/app/(authenticated)/users/_components/user-admin-dialog";
import {
   createUserAdmin,
   updateUserAdmin,
} from "@/app/(authenticated)/users/actions";
import type { UserRow } from "@/app/(authenticated)/users/profile-role-label";

jest.mock("@/app/(authenticated)/users/actions", () => ({
   createUserAdmin: jest.fn(),
   updateUserAdmin: jest.fn(),
}));

const mockCreate = createUserAdmin as jest.Mock;
const mockUpdate = updateUserAdmin as jest.Mock;

const INVALID_EMAIL = { errors: { email: ["Invalid email"] } };

const user: UserRow = {
   id: "8f14e45f-ceea-4e7a-9b1f-1234567890ab",
   firstName: "Jane",
   lastName: "Doe",
   email: "jane@example.com",
   role: "user",
   isActive: true,
   lastLoginAt: new Date("2026-01-01T00:00:00Z"),
   stripeCustomerId: null,
};

function change(label: string, value: string) {
   fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function confirm(name: string) {
   const button = await screen.findByRole("button", { name });
   await act(async () => {
      fireEvent.click(button);
   });
}

beforeEach(() => {
   mockCreate.mockReset();
   mockUpdate.mockReset();
});

describe("CreateUserDialog", () => {
   const VALID = {
      "First name": "Jane",
      "Last name": "Doe",
      Email: "ts@google.com",
      Password: "password123",
      "Confirm password": "password123",
   };

   function fillForm(overrides: Partial<typeof VALID> = {}) {
      for (const [label, value] of Object.entries({ ...VALID, ...overrides })) {
         change(label, value);
      }
   }

   async function submit() {
      fireEvent.click(screen.getByRole("button", { name: "Create user" }));
      await confirm("Yes, create user");
   }

   it.each([
      {
         field: "email",
         bad: { Email: "ts" },
         error: { email: ["Invalid email"] },
         shown: "Invalid email",
      },
      {
         field: "first name",
         bad: { "First name": "" },
         error: { first_name: ["Required"] },
         shown: "Required",
      },
      {
         field: "password",
         bad: { Password: "short", "Confirm password": "short" },
         error: { password: ["Password must be at least 8 characters"] },
         shown: "Password must be at least 8 characters",
      },
      {
         field: "confirm password",
         bad: { "Confirm password": "different1" },
         error: { confirm_password: ["Passwords do not match"] },
         shown: "Passwords do not match",
      },
      {
         field: "form-level (server)",
         bad: {},
         error: { _form: ["A user with this email address has already been registered"] },
         shown: "A user with this email address has already been registered",
      },
   ])(
      "can resubmit after a $field error",
      async ({ bad, error, shown }) => {
         mockCreate
            .mockResolvedValueOnce({ errors: error })
            .mockResolvedValueOnce({ message: "User created." });

         render(<CreateUserDialog />);
         fireEvent.click(screen.getByRole("button", { name: "Add user" }));

         fillForm(bad);
         await submit();

         expect(await screen.findByText(shown)).toBeInTheDocument();
         expect(mockCreate).toHaveBeenCalledTimes(1);
         await waitFor(() =>
            expect(
               screen.queryByRole("alertdialog", { name: "Create user?" }),
            ).not.toBeInTheDocument(),
         );

         fillForm();
         await submit();

         await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
         const formData = mockCreate.mock.calls[1][1] as FormData;
         expect(formData.get("first_name")).toBe("Jane");
         expect(formData.get("email")).toBe("ts@google.com");
         expect(formData.get("password")).toBe("password123");
         expect(formData.get("confirm_password")).toBe("password123");
         await waitFor(() =>
            expect(
               screen.queryByRole("heading", { name: "Add user" }),
            ).not.toBeInTheDocument(),
         );
      },
   );

   it("hides the confirm again when a retry also fails", async () => {
      // Server actions return a fresh object on every call.
      mockCreate
         .mockResolvedValueOnce({ errors: { email: ["Invalid email"] } })
         .mockResolvedValueOnce({ errors: { email: ["Invalid email"] } });

      render(<CreateUserDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Add user" }));

      fillForm({ Email: "ts" });
      await submit();
      await screen.findByText("Invalid email");

      await submit();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
      await waitFor(() =>
         expect(
            screen.queryByRole("alertdialog", { name: "Create user?" }),
         ).not.toBeInTheDocument(),
      );
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Add user" })).toBeInTheDocument();
   });
});

describe("EditUserDialog", () => {
   it("can resubmit after the server rejects the email", async () => {
      mockUpdate
         .mockResolvedValueOnce(INVALID_EMAIL)
         .mockResolvedValueOnce({ message: "User updated." });
      const onOpenChange = jest.fn();

      render(<EditUserDialog user={user} open onOpenChange={onOpenChange} />);

      change("Email", "ts");
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await confirm("Yes, save changes");

      expect(await screen.findByText("Invalid email")).toBeInTheDocument();

      change("Email", "ts@google.com");
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await confirm("Yes, save changes");

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
      const formData = mockUpdate.mock.calls[1][1] as FormData;
      expect(formData.get("email")).toBe("ts@google.com");
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
   });
});
