/**
 * @jest-environment node
 */
import {
    getUserTransactions,
    createTransactionRefund,
 } from "./actions";
 
 const chargesList = jest.fn();
 const chargesRetrieve = jest.fn();
 const refundsCreate = jest.fn();
 const requireAdmin = jest.fn();
 
 jest.mock("@/lib/stripe", () => ({
    stripe: {
       charges: {
          list: (...args: unknown[]) => chargesList(...args),
          retrieve: (...args: unknown[]) => chargesRetrieve(...args),
       },
       refunds: {
          create: (...args: unknown[]) => refundsCreate(...args),
       },
    },
 }));
 
 jest.mock("@/lib/auth/require-admin", () => ({
    requireAdmin: (...args: unknown[]) => requireAdmin(...args),
 }));
 
 const CUSTOMER_ID = "cus_123";

 function refundFormData(fields: Record<string, string>) {
    const fd = new FormData();
    for (const [key, value] of Object.entries({
       customerId: CUSTOMER_ID,
       ...fields,
    })) {
       fd.append(key, value);
    }
    return fd;
 }

 const sampleCharge = {
    id: "ch_test",
    amount: 5000,
    amount_refunded: 0,
    refunded: false,
    created: 1700000000,
    currency: "cad",
    description: "Yearly plan",
    payment_intent: "pi_test",
    refunds: { data: [] },
    metadata: {},
 };
 
 beforeEach(() => {
    jest.clearAllMocks();
    requireAdmin.mockResolvedValue(undefined);
 });
 
 describe("getUserTransactions", () => {
    it("requires admin", async () => {
       requireAdmin.mockRejectedValue(new Error("Forbidden"));
 
       await expect(
          getUserTransactions({ customerId: "cus_123" }),
       ).rejects.toThrow("Forbidden");
 
       expect(chargesList).not.toHaveBeenCalled();
    });
 
    it("maps charges from Stripe", async () => {
       chargesList.mockResolvedValue({
          data: [sampleCharge],
          has_more: false,
       });
 
       const result = await getUserTransactions({ customerId: "cus_123" });
 
       expect(chargesList).toHaveBeenCalledWith(
          expect.objectContaining({ customer: "cus_123", limit: 10 }),
       );
       expect(result.data[0]).toMatchObject({
          id: "ch_test",
          amount: 5000,
          description: "Yearly plan",
          currency: "cad",
       });
       expect(result.hasMore).toBe(false);
    });
 });
 
 describe("createTransactionRefund", () => {
    it("returns unauthorized when not admin", async () => {
       requireAdmin.mockRejectedValue(new Error("Forbidden"));
 
       const result = await createTransactionRefund(
          null,
          refundFormData({ chargeId: "ch_test", idempotencyKey: "key-1" }),
       );
 
       expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
       expect(chargesRetrieve).not.toHaveBeenCalled();
    });
 
    it("rejects when charge belongs to a different customer", async () => {
       chargesRetrieve.mockResolvedValue({
          customer: "cus_other",
          amount: 5000,
          amount_refunded: 0,
       });

       const result = await createTransactionRefund(
          null,
          refundFormData({ chargeId: "ch_test", idempotencyKey: "key-1" }),
       );

       expect(result?.errors?._form).toContain(
          "Charge does not belong to this customer.",
       );
       expect(refundsCreate).not.toHaveBeenCalled();
    });

    it("rejects when charge is already fully refunded", async () => {
       chargesRetrieve.mockResolvedValue({
          customer: CUSTOMER_ID,
          amount: 5000,
          amount_refunded: 5000,
       });
 
       const result = await createTransactionRefund(
          null,
          refundFormData({ chargeId: "ch_test", idempotencyKey: "key-1" }),
       );
 
       expect(result?.errors?._form).toContain(
          "This charge is already fully refunded.",
       );
       expect(refundsCreate).not.toHaveBeenCalled();
    });
 
    it("rejects partial refund above remaining balance", async () => {
       chargesRetrieve.mockResolvedValue({
          customer: CUSTOMER_ID,
          amount: 5000,
          amount_refunded: 1000,
       });
 
       const result = await createTransactionRefund(
          null,
          refundFormData({
             chargeId: "ch_test",
             idempotencyKey: "key-1",
             amountCents: "5000",
          }),
       );
 
       expect(result?.errors?._form).toContain(
          "Refund amount exceeds the remaining refundable balance.",
       );
       expect(refundsCreate).not.toHaveBeenCalled();
    });
 
    it("issues a full refund and returns updated transaction", async () => {
       chargesRetrieve
          .mockResolvedValueOnce({
             customer: CUSTOMER_ID,
             amount: 5000,
             amount_refunded: 0,
          })
          .mockResolvedValueOnce({
             ...sampleCharge,
             customer: CUSTOMER_ID,
             amount_refunded: 5000,
             refunded: true,
             refunds: {
                data: [
                   {
                      id: "re_test",
                      amount: 5000,
                      status: "succeeded",
                      created: 1700000001,
                   },
                ],
             },
          });
 
       refundsCreate.mockResolvedValue({
          id: "re_test",
          amount: 5000,
          status: "succeeded",
          created: 1700000001,
       });
 
       const result = await createTransactionRefund(
          null,
          refundFormData({ chargeId: "ch_test", idempotencyKey: "key-1" }),
       );
 
       expect(refundsCreate).toHaveBeenCalledWith(
          { charge: "ch_test" },
          { idempotencyKey: "key-1" },
       );
       expect(result?.status).toBe("succeeded");
       expect(result?.updatedTransaction?.amountRefunded).toBe(5000);
    });
 });