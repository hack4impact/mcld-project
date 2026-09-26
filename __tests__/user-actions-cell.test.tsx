import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { UserActionsCell } from "@/app/(authenticated)/users/_components/user-actions-cell";
import {
   deleteUserAdmin,
   resendInviteAdmin,
} from "@/app/(authenticated)/users/actions";
import type { UserRow } from "@/app/(authenticated)/users/profile-role-label";
import { TooltipProvider } from "@/components/ui/tooltip";

jest.mock("@/app/(authenticated)/users/actions", () => ({
   deleteUserAdmin: jest.fn(),
   resendInviteAdmin: jest.fn(),
   getUserTransactions: jest.fn(),
   createTransactionRefund: jest.fn(),
}));
jest.mock("@/app/(authenticated)/discounts/actions", () => ({
   getUserDiscountModalData: jest.fn(),
   applyDiscountToCustomerProduct: jest.fn(),
   removeCouponById: jest.fn(),
}));
jest.mock("@/app/(authenticated)/users/children-actions", () => ({
   listChildrenForUserAdmin: jest.fn().mockResolvedValue([]),
   createChildAdmin: jest.fn(),
   updateChildAdmin: jest.fn(),
}));
jest.mock("sonner", () => ({
   toast: { success: jest.fn(), error: jest.fn() },
}));

const user: UserRow = {
   id: "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70",
   firstName: "Ada",
   lastName: "Lovelace",
   email: "ada@example.com",
   role: "user",
   isActive: false,
   lastLoginAt: new Date("2026-09-01T00:00:00Z"),
   stripeCustomerId: null,
   address: null,
   gender: null,
   dob: null,
   phone: null,
   invitePending: true,
};

function renderCell() {
   render(
      <TooltipProvider>
         <UserActionsCell user={user} onEdit={jest.fn()} />
      </TooltipProvider>,
   );
}

beforeEach(() => {
   jest.clearAllMocks();
});

describe("UserActionsCell", () => {
   it("shows an error when resending the invitation throws", async () => {
      jest.mocked(resendInviteAdmin).mockRejectedValue(new Error("network"));
      renderCell();

      fireEvent.click(
         screen.getByRole("button", { name: "Resend invitation" }),
      );

      await waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(
            "Failed to resend invitation",
            expect.anything(),
         ),
      );
      expect(
         screen.getByRole("button", { name: "Resend invitation" }),
      ).toBeEnabled();
   });

   it("shows an error when deleting throws", async () => {
      jest.mocked(deleteUserAdmin).mockRejectedValue(new Error("network"));
      renderCell();

      fireEvent.click(screen.getByRole("button", { name: "Delete user" }));
      fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

      await waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(
            "Failed to delete user",
            expect.anything(),
         ),
      );
   });
});
