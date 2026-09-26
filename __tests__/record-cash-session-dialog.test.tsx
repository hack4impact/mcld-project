import "@testing-library/jest-dom";
import {
   act,
   fireEvent,
   render,
   screen,
   waitFor,
} from "@testing-library/react";
import { toast } from "sonner";

import { RecordCashSessionDialog } from "../app/(authenticated)/services/record-cash-session-dialog";
import {
   fetchCashSessionClients,
   recordCashSession,
   type ServiceActionState,
} from "@/app/(authenticated)/services/actions";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

jest.mock("@/app/(authenticated)/services/actions", () => ({
   fetchCashSessionClients: jest.fn(),
   recordCashSession: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

const recorderId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const service: ServiceView = {
   id: "33333333-3333-4333-8333-333333333333",
   type: "private_lessons",
   isForChildren: false,
   formId: null,
   scheduledAt: null,
   durationMinutes: 60,
   status: "active",
   stripeProductId: "prod_test",
   coordinatorId: recorderId,
   coordinatorIds: [],
   createdAt: new Date("2026-01-01T00:00:00Z"),
   updatedAt: new Date("2026-01-01T00:00:00Z"),
   title: "Private tutoring",
   description: null,
   priceCents: 6000,
   priceCurrency: "cad",
   requiresSubscription: false,
};
const storageKey = `mcld:cash-session:v1:${recorderId}:${service.id}`;
const clients = [
   {
      id: clientId,
      firstName: "Sam",
      lastName: "Jones",
      email: "sam@example.test",
      children: [],
   },
];
const mockClients = jest.mocked(fetchCashSessionClients);
const mockRecord = jest.mocked(recordCashSession);
const uncertain = {
   errors: { _form: ["Could not confirm the recording."] },
   retryRequired: true,
};

function formData(call = 0) {
   return Object.fromEntries(mockRecord.mock.calls[call][1].entries());
}
function success(data: FormData): ServiceActionState {
   return {
      message: "Recorded",
      cashSession: {
         invoiceId: "in_test",
         submissionId: String(data.get("submission_id")),
         amountCents: 5500,
         currency: "cad",
      },
   };
}
function show(
   onOpenChange = jest.fn(),
   props: Partial<React.ComponentProps<typeof RecordCashSessionDialog>> = {},
) {
   return {
      ...render(
         <RecordCashSessionDialog
            service={service}
            recorderId={recorderId}
            open
            onOpenChange={onOpenChange}
            {...props}
         />,
      ),
      onOpenChange,
   };
}
async function selectClient() {
   fireEvent.click(
      await screen.findByRole("button", { name: "Sam Jones sam@example.test" }),
   );
}
async function submit(name = "Record session") {
   const button = screen.getByRole("button", { name });
   await act(async () => {
      fireEvent.submit(button.closest("form")!);
   });
}

beforeEach(() => {
   jest.restoreAllMocks();
   jest.clearAllMocks();
   sessionStorage.clear();
   let nextId = 0;
   Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(
         () => `44444444-4444-4444-8444-${String(++nextId).padStart(12, "0")}`,
      ),
   });
   mockClients.mockResolvedValue(clients);
   mockRecord.mockResolvedValue(uncertain);
});

test("persists before calling the server and prevents editing or closing while recording", async () => {
   let finish!: (value: ServiceActionState) => void;
   mockRecord.mockImplementation((_previous, data) => {
      expect(JSON.parse(sessionStorage.getItem(storageKey)!).payload).toEqual(
         Object.fromEntries(data.entries()),
      );
      return new Promise((resolve) => {
         finish = resolve;
      });
   });
   const { onOpenChange } = show();
   await selectClient();
   await submit();
   expect(mockRecord).toHaveBeenCalledTimes(1);
   expect(screen.getByLabelText("Cash received (CAD)")).toBeDisabled();
   expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
   expect(
      screen.queryByRole("button", { name: "Close" }),
   ).not.toBeInTheDocument();
   fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
   expect(onOpenChange).not.toHaveBeenCalled();
   await act(async () => finish(uncertain));
   expect(
      screen.getByRole("button", { name: "Retry same recording" }),
   ).toBeEnabled();
});

test("reopens an uncertain attempt with frozen fields and retries its exact dates and identifier", async () => {
   const first = show();
   await selectClient();
   fireEvent.change(screen.getByLabelText("Date & time"), {
      target: { value: "2026-01-02T10:30" },
   });
   fireEvent.change(screen.getByLabelText("Cash collected at"), {
      target: { value: "2026-01-03T12:15" },
   });
   await submit();
   const original = formData();
   expect(original.session_at).toBe(new Date("2026-01-02T10:30").toISOString());
   expect(original.collected_at).toBe(
      new Date("2026-01-03T12:15").toISOString(),
   );
   fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
   expect(first.onOpenChange).toHaveBeenCalledWith(false);
   first.unmount();
   show();
   await screen.findByRole("button", { name: "Retry same recording" });
   expect(screen.getByLabelText("Cash received (CAD)")).toBeDisabled();
   await submit("Retry same recording");
   expect(formData(1)).toEqual(original);
   expect(sessionStorage.getItem(storageKey)).not.toBeNull();
});

test("a failed storage write blocks the server request", async () => {
   show();
   await selectClient();
   jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
   });
   await submit();
   expect(mockRecord).not.toHaveBeenCalled();
   expect(screen.getByRole("alert")).toHaveTextContent(
      "couldn't save the recording",
   );
   expect(screen.getByLabelText("Cash received (CAD)")).toBeEnabled();
});

test("unreadable storage blocks a new recording instead of overwriting a pending one", async () => {
   jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked");
   });
   show();
   expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous recording couldn't be restored",
   );
   expect(
      screen.queryByRole("button", { name: "Record session" }),
   ).not.toBeInTheDocument();
   expect(mockRecord).not.toHaveBeenCalled();
});

test("an initial preflight rejection allows correction and only confirmed success clears the draft", async () => {
   mockRecord.mockResolvedValueOnce({
      errors: { amount: ["Check the amount."] },
      retryRequired: false,
   });
   mockRecord.mockImplementationOnce(async (_previous, data) => success(data));
   const { onOpenChange } = show();
   await selectClient();
   await submit();
   expect(screen.getByLabelText("Cash received (CAD)")).toBeEnabled();
   expect(JSON.parse(sessionStorage.getItem(storageKey)!).locked).toBe(false);
   fireEvent.change(screen.getByLabelText("Cash received (CAD)"), {
      target: { value: "55.00" },
   });
   fireEvent.change(screen.getByLabelText("Reason for price change"), {
      target: { value: "Agreed discount" },
   });
   await submit();
   expect(formData(1).submission_id).toBe(formData().submission_id);
   expect(formData(1).amount).toBe("55.00");
   expect(sessionStorage.getItem(storageKey)).toBeNull();
   expect(onOpenChange).toHaveBeenCalledWith(false);
   expect(toast.success).toHaveBeenCalledWith(
      "Cash session recorded for Sam Jones",
      { description: expect.stringContaining("55.00") },
   );
});

test("an uncertain recording stays frozen even when its retry fails preflight", async () => {
   mockRecord.mockResolvedValueOnce(uncertain);
   mockRecord.mockResolvedValueOnce({
      errors: { _form: ["Service unavailable"] },
      retryRequired: false,
   });
   show();
   await selectClient();
   await submit();
   await submit("Retry same recording");
   expect(formData(1)).toEqual(formData());
   expect(screen.getByLabelText("Cash received (CAD)")).toBeDisabled();
   expect(JSON.parse(sessionStorage.getItem(storageKey)!).locked).toBe(true);
   expect(
      screen.getByText(/This saved recording couldn't pass the current checks/),
   ).toHaveTextContent("ask an administrator to review it in Stripe");
   expect(
      screen.getByRole("button", { name: "Retry same recording" }),
   ).toBeEnabled();
});

test("administrator-review state remains locked and non-retryable after reopening", async () => {
   mockRecord.mockResolvedValue({ ...uncertain, reviewRequired: true });
   const first = show();
   await selectClient();
   await submit();
   expect(
      screen.getByRole("button", { name: "Retry same recording" }),
   ).toBeDisabled();
   first.unmount();
   show();
   expect(
      await screen.findByRole("button", { name: "Retry same recording" }),
   ).toBeDisabled();
   expect(screen.getByRole("status")).toHaveTextContent("administrator review");
   expect(mockRecord).toHaveBeenCalledTimes(1);
});

test("another signed-in recorder never restores the previous recorder's draft", async () => {
   const first = show();
   await selectClient();
   await submit();
   first.unmount();
   show(jest.fn(), { recorderId: "55555555-5555-4555-8555-555555555555" });
   await screen.findByRole("button", { name: "Sam Jones sam@example.test" });
   expect(screen.getByLabelText("Cash received (CAD)")).toBeEnabled();
   expect(
      screen.getByRole("button", { name: "Record session" }),
   ).toBeDisabled();
   expect(sessionStorage.getItem(storageKey)).not.toBeNull();
});

test("a late result for an unmounted service cannot close another service's dialog", async () => {
   let finish!: (value: ServiceActionState) => void;
   mockRecord.mockImplementation(
      () =>
         new Promise((resolve) => {
            finish = resolve;
         }),
   );
   const { rerender, onOpenChange } = show();
   await selectClient();
   await submit();
   const other = {
      ...service,
      id: "66666666-6666-4666-8666-666666666666",
      title: "Other service",
   };
   rerender(
      <RecordCashSessionDialog
         service={other}
         recorderId={recorderId}
         open
         onOpenChange={onOpenChange}
      />,
   );
   expect(screen.getByRole("dialog")).toHaveTextContent("Other service");
   await act(async () => finish(success(mockRecord.mock.calls[0][1])));
   await screen.findByRole("button", { name: "Sam Jones sam@example.test" });
   await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent("Other service"),
   );
   expect(onOpenChange).not.toHaveBeenCalled();
});
