import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { getServiceRegistrations } from "@/app/(authenticated)/services/[id]/queries";
import { KidTable } from "@/app/(authenticated)/services/[id]/_components/kid-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { children } from "@/lib/db/schema";

const results: unknown[][] = [];
const joins: { kind: "left" | "inner"; table: unknown }[] = [];

jest.mock("@/lib/db", () => ({
   db: {
      select: () => {
         const result = results.shift() ?? [];
         const chain = {
            from: () => chain,
            leftJoin: (table: unknown) => {
               joins.push({ kind: "left", table });
               return chain;
            },
            innerJoin: (table: unknown) => {
               joins.push({ kind: "inner", table });
               return chain;
            },
            where: () => chain,
            limit: () => chain,
            then: (resolve: (rows: unknown[]) => unknown) =>
               Promise.resolve(result).then(resolve),
         };
         return chain;
      },
   },
}));

jest.mock("next/cache", () => ({ cacheTag: jest.fn() }));

const bookingWithoutChild = {
   bookingId: "booking-1",
   status: "confirmed",
   registeredAt: new Date("2026-09-20T15:00:00Z"),
   childId: null,
   childFirstName: null,
   childLastName: null,
   childDob: null,
   childGender: null,
   childAllergies: null,
   childMedicalConditions: null,
   childMedications: null,
   parentFirstName: "Ada",
   parentLastName: "Lovelace",
   parentEmail: "ada@example.com",
};

describe("children's service registrations", () => {
   it("still lists a booking that has no child", async () => {
      results.push(
         [{ isForChildren: true, formId: null }],
         [bookingWithoutChild],
      );

      const data = await getServiceRegistrations("service-1");

      expect(joins).toContainEqual({ kind: "left", table: children });
      expect(joins).not.toContainEqual({ kind: "inner", table: children });

      expect(data).toEqual({
         kind: "kid",
         registrations: [
            {
               bookingId: "booking-1",
               status: "confirmed",
               registeredAt: bookingWithoutChild.registeredAt,
               child: null,
               parent: {
                  firstName: "Ada",
                  lastName: "Lovelace",
                  email: "ada@example.com",
               },
               formAnswers: [],
            },
         ],
      });
   });

   it("shows the parent and 'Not selected' for that booking", () => {
      render(
         <TooltipProvider>
            <KidTable
               registrations={[
                  {
                     bookingId: "booking-1",
                     status: "confirmed",
                     registeredAt: new Date("2026-09-20T15:00:00Z"),
                     child: null,
                     parent: {
                        firstName: "Ada",
                        lastName: "Lovelace",
                        email: "ada@example.com",
                     },
                     formAnswers: [],
                  },
               ]}
            />
         </TooltipProvider>,
      );

      expect(screen.getByText("Not selected")).toBeInTheDocument();
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(
         screen.queryByRole("button", { name: "View child profile" }),
      ).not.toBeInTheDocument();
   });
});
