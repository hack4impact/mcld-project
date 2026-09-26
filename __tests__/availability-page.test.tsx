import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AvailabilityContent } from "@/app/(authenticated)/availability/availability-content";
import { EMPTY_WEEKLY_HOURS } from "@/lib/availability";

const ADMIN_ID = "33333333-3333-3333-3333-333333333333";
const ALAN = {
   id: "22222222-2222-2222-2222-222222222222",
   firstName: "Alan",
   lastName: "Turing",
};
const GRACE = {
   id: "11111111-1111-1111-1111-111111111111",
   firstName: "Grace",
   lastName: "Hopper",
};

const getUser = jest.fn();
const getUserRole = jest.fn();
const listCoordinators = jest.fn();
const fetchEditorState = jest.fn();

jest.mock("next/navigation", () => ({
   redirect: (url: string) => {
      throw new Error(`redirect ${url}`);
   },
   useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser } }),
}));

jest.mock("@/lib/auth/require-admin", () => ({
   getUserRole: () => getUserRole(),
}));

jest.mock("@/app/(authenticated)/services/queries", () => ({
   listCoordinators: () => listCoordinators(),
}));

jest.mock("@/app/(authenticated)/availability/queries", () => ({
   listPrivateLessonDurations: async () => [60],
}));

jest.mock("@/app/private-lessons/actions", () => ({
   fetchCoordinatorAvailabilityEditorState: (input: unknown) =>
      fetchEditorState(input),
   listCoordinatorAvailability: async () => ({
      occurrences: [],
      timezone: "America/Toronto",
   }),
   listCoordinatorAvailabilityOverrides: async () => ({ overrides: [] }),
}));

jest.mock("@/components/availability/coordinator-availability-editor", () => {
   const { useState } = jest.requireActual("react");
   return {
      CoordinatorAvailabilityEditor: ({
         coordinatorId,
      }: {
         coordinatorId: string;
      }) => {
         const [loadedId] = useState(coordinatorId);
         return <p>Editor for {loadedId}</p>;
      },
   };
});

function signInAs(role: string, id = ADMIN_ID) {
   getUser.mockResolvedValue({ data: { user: { id } } });
   getUserRole.mockResolvedValue(role);
}

function page(query: Record<string, string> = {}) {
   return AvailabilityContent({ searchParams: Promise.resolve(query) });
}

function picker() {
   return screen.queryByRole("combobox", { name: "Coordinator" });
}

beforeEach(() => {
   jest.clearAllMocks();
   listCoordinators.mockResolvedValue([ALAN, GRACE]);
   fetchEditorState.mockResolvedValue({
      hours: EMPTY_WEEKLY_HOURS,
      timezone: "America/Toronto",
      override: null,
   });
});

describe("Availability page", () => {
   it("sends regular users home", async () => {
      signInAs("user");
      await expect(page()).rejects.toThrow("redirect /");
      expect(fetchEditorState).not.toHaveBeenCalled();
   });

   describe("as a coordinator", () => {
      it("shows their own availability without a picker", async () => {
         signInAs("coordinator", GRACE.id);
         render(await page());

         expect(
            screen.getByRole("heading", { name: "Availability" }),
         ).toBeInTheDocument();
         expect(screen.getByText(`Editor for ${GRACE.id}`)).toBeInTheDocument();
         expect(picker()).not.toBeInTheDocument();
         expect(listCoordinators).not.toHaveBeenCalled();
      });

      it("ignores another coordinator's id in the URL", async () => {
         signInAs("coordinator", GRACE.id);
         render(await page({ coordinator: ALAN.id }));

         expect(screen.getByText(`Editor for ${GRACE.id}`)).toBeInTheDocument();
         expect(fetchEditorState).toHaveBeenCalledTimes(1);
         expect(fetchEditorState).toHaveBeenCalledWith({
            coordinatorId: GRACE.id,
         });
      });
   });

   describe("as an admin", () => {
      beforeEach(() => signInAs("admin"));

      it("asks for a coordinator first", async () => {
         render(await page());

         expect(picker()).toHaveTextContent("Choose a coordinator");
         expect(
            screen.getByRole("heading", { name: "Availability" }),
         ).toBeInTheDocument();
         expect(fetchEditorState).not.toHaveBeenCalled();
      });

      it("loads the coordinator from the URL and names them in the header", async () => {
         render(await page({ coordinator: GRACE.id }));

         expect(
            screen.getByRole("heading", {
               name: "Grace Hopper's availability",
            }),
         ).toBeInTheDocument();
         expect(picker()).toHaveTextContent("Grace Hopper");
         expect(screen.getByText(`Editor for ${GRACE.id}`)).toBeInTheDocument();
         expect(fetchEditorState).toHaveBeenCalledWith({
            coordinatorId: GRACE.id,
         });
      });

      it("starts a fresh editor when switching coordinators", async () => {
         const { rerender } = render(await page({ coordinator: GRACE.id }));
         rerender(await page({ coordinator: ALAN.id }));

         expect(screen.getByText(`Editor for ${ALAN.id}`)).toBeInTheDocument();
         expect(
            screen.queryByText(`Editor for ${GRACE.id}`),
         ).not.toBeInTheDocument();
      });

      it("doesn't load an id that isn't a coordinator", async () => {
         render(await page({ coordinator: ADMIN_ID }));

         expect(screen.getByText("Coordinator not found")).toBeInTheDocument();
         expect(picker()).toHaveTextContent("Choose a coordinator");
         expect(fetchEditorState).not.toHaveBeenCalled();
      });

      it("explains when there are no coordinators", async () => {
         listCoordinators.mockResolvedValue([]);
         render(await page());

         expect(screen.getByText("No coordinators yet")).toBeInTheDocument();
         expect(picker()).not.toBeInTheDocument();
      });

      it("shows the error instead of the editor when loading fails", async () => {
         fetchEditorState.mockResolvedValue({ error: "Coordinator not found" });
         render(await page({ coordinator: GRACE.id }));

         expect(
            screen.getByText("Couldn't load Grace's availability"),
         ).toBeInTheDocument();
         expect(screen.getByText("Coordinator not found")).toBeInTheDocument();
         expect(screen.queryByText(/^Editor for/)).not.toBeInTheDocument();
      });
   });
});
