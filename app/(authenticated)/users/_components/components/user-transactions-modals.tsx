"use client";

import * as React from "react";
import {
   ArrowLeft,
   ArrowRight,
} from "lucide-react";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserTransactions, createTransactionRefund } from "@/app/(authenticated)/users/actions";
import type { UserTransaction } from "@/app/(authenticated)/users/actions";

export interface UserTransactionsModalProps {
   userName: string;
   userEmail: string;
   stripeCustomerId: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function UserTransactionsModal({
   userName,
   userEmail,
   stripeCustomerId,
   open,
   onOpenChange,
}: UserTransactionsModalProps) {

   const [transactions, setTransactions] = React.useState<UserTransaction[]>([]);
   const [loading, setLoading] = React.useState(false);
   const [submitting, setSubmitting] = React.useState<string | null>(null);
   const [error, setError] = React.useState<string | null>(null);

   const [hasMore, setHasMore] = React.useState(false);
   const [cursors, setCursors] = React.useState<{ firstId: string | null; lastId: string | null }>({
      firstId: null,
      lastId: null,
   });
   const [history, setHistory] = React.useState<Array<{ firstId: string | null; lastId: string | null }>>([]);

   const [selectedTransaction, setSelectedTransaction] = React.useState<UserTransaction | null>(null);
   const [refundAmounts, setRefundAmounts] = React.useState<Record<string, string>>({});
   const [confirmRefund, setConfirmRefund] = React.useState<{
      chargeId: string;
      isFullRefund: boolean;
      amountCents: number;
      displayAmount: string;
      idempotencyKey: string;
   } | null>(null);

   const fetchTransactions = React.useCallback(
      async (params?: { startingAfter?: string }) => {
         if (!stripeCustomerId) return;
         setLoading(true);
         setError(null);
         try {
            const result = await getUserTransactions({
               customerId: stripeCustomerId,
               startingAfter: params?.startingAfter,
            });
            setTransactions(result.data);
            setHasMore(result.hasMore);
            setCursors({
               firstId: result.firstId,
               lastId: result.lastId,
            });
         } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch transactions");
         } finally {
            setLoading(false);
         }
      },
      [stripeCustomerId]
   );

   React.useEffect(() => {
      if (open && stripeCustomerId) {
         setHistory([]);
         setSelectedTransaction(null);
         fetchTransactions();
      } else if (!open) {
         setTransactions([]);
         setSelectedTransaction(null);
         setError(null);
      }
   }, [open, stripeCustomerId, fetchTransactions]);


   const handleNextPage = async () => {
      if (!cursors.lastId || !hasMore) return;
      setHistory((prev) => [...prev, cursors]);
      await fetchTransactions({ startingAfter: cursors.lastId });
   };

   const handlePrevPage = async () => {
      if (history.length === 0) return;

      const newHistory = history.slice(0, -1);
      setHistory(newHistory);

      if (newHistory.length === 0) {
         await fetchTransactions();
      } else {
         const prevPageCursors = newHistory[newHistory.length - 1];
         await fetchTransactions({ startingAfter: prevPageCursors.lastId ?? undefined });
      }
   };

   // Step 1: Validates and prompts the admin via confirmation dialog
   const initiateRefund = (chargeId: string, isFullRefund: boolean, maxRefundableCents: number, currency: string) => {
      let refundAmountCents = maxRefundableCents;
      let displayAmount = formatAmount(maxRefundableCents, currency);

      if (!isFullRefund) {
         const rawAmount = refundAmounts[chargeId] || "";
         const parsedAmount = parseFloat(rawAmount);
         if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error("Please enter a valid refund amount");
            return;
         }

         refundAmountCents = Math.round(parsedAmount * 100);
         if (refundAmountCents > maxRefundableCents) {
            toast.error(`Refund amount cannot exceed remaining refundable balance (${formatAmount(maxRefundableCents, currency)})`);
            return;
         }
         displayAmount = formatAmount(refundAmountCents, currency);
      }

      const idempotencyKey = typeof crypto.randomUUID === "function" 
         ? crypto.randomUUID() 
         : Math.random().toString(36).substring(2) + Date.now().toString(36);

      setConfirmRefund({
         chargeId,
         isFullRefund,
         amountCents: refundAmountCents,
         displayAmount,
         idempotencyKey,
      });
   };

   // Step 2: Executes the refund Server Action after confirmation
   const executeRefund = async () => {
      if (!confirmRefund) return;
      const { chargeId, isFullRefund, amountCents, idempotencyKey } = confirmRefund;
      setConfirmRefund(null); // Close confirmation immediately

      setSubmitting(chargeId);
      try {
         const fd = new FormData();
         fd.append("chargeId", chargeId);
         fd.append("idempotencyKey", idempotencyKey);
         if (!isFullRefund) {
            fd.append("amountCents", String(amountCents));
         }
         fd.append("customerId", stripeCustomerId)

         const result = await createTransactionRefund(null, fd);

         if (result?.errors) {
            toast.error("Refund failed", {
               description: Object.values(result.errors).flat().join(" "),
            });
         } else if (result?.status === "succeeded") {
            const formattedAmount = formatAmount(amountCents, result.updatedTransaction?.currency || "cad");
            toast.success(`Refunded ${formattedAmount}`);

            setRefundAmounts((prev) => ({ ...prev, [chargeId]: "" }));

            if (result.updatedTransaction) {
               setTransactions((prev) =>
                  prev.map((t) => (t.id === chargeId ? result.updatedTransaction! : t))
               );
               setSelectedTransaction(result.updatedTransaction);
            }
         } else if (result?.status === "pending") {
            toast.info("Refund pending. The transaction will reconcile shortly.");
         }
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Failed to process refund");
      } finally {
         setSubmitting(null);
      }
   };

   function formatAmount(cents: number, currency: string) {
      const dollars = cents / 100;
      return new Intl.NumberFormat("en-CA", {
         style: "currency",
         currency: currency.toUpperCase(),
      }).format(dollars);
   }

   function formatDate(timestamp: number) {
      return new Intl.DateTimeFormat("en-CA", {
         year: "numeric",
         month: "short",
         day: "numeric",
      }).format(new Date(timestamp * 1000));
   }

   function formatRefundStatus(t: UserTransaction): string {
      const total = formatAmount(t.amount, t.currency);
      const remainingCents = t.amount - t.amountRefunded
      const refundable = formatAmount(remainingCents, t.currency);

      if (t.refunded || (t.amountRefunded > 0 && remainingCents <= 0)) {
         return "Fully refunded - nothing left to refund";
      }
      if (t.amountRefunded > 0){
         const refunded = formatAmount(t.amountRefunded, t.currency);
         return `${refunded} refunded of ${total} · ${refundable} refundable — partially refunded`;
      }
      return `Paid ${total} — no refunds`;
   }

   function formatRefundStatusShort(t: UserTransaction): string {
      const remainingCents = t.amount - t.amountRefunded;

      if (t.refunded || (t.amountRefunded > 0 && remainingCents <= 0)) {
         return "Fully refunded";
      }
      if (t.amountRefunded > 0) {
         return "Partially refunded";
      }
      return "Paid";
   }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle>User transactions</DialogTitle>
                <DialogDescription>
                    {userName && userName.trim() !== userEmail ? `${userName} (${userEmail})` : userEmail}
                </DialogDescription>
                </DialogHeader>
                <div className="h-[222px] min-h-[222px] max-h-[222px] overflow-y-auto my-2 flex flex-col justify-start">
                {loading && transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-10">
                        <Spinner className="size-6" />
                        <p className="text-xs">Loading transaction history...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-destructive text-xs font-semibold py-10">
                        {error}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-10">
                        No transactions found for this customer on Stripe.
                    </div>
                ) : (
                    <div className="w-full rounded-lg border border-border overflow-hidden">
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                              <TableHead className="text-xs font-medium text-muted-foreground">Description</TableHead>
                              <TableHead className="text-xs font-medium text-muted-foreground">Amount</TableHead>
                              <TableHead className="text-xs font-medium text-muted-foreground">Refund Status</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {transactions.map((t) => (
                                 <TableRow
                                    key={t.id}
                                    className="hover:bg-muted/10 border-b border-border cursor-pointer"
                                    onClick={() => setSelectedTransaction(t)}
                                    title="Click to view details or issue a refund"
                                 >
                                    <TableCell className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                                       {formatDate(t.created)}
                                    </TableCell>
                                    <TableCell className="text-xs font-normal text-muted-foreground max-w-[200px] truncate" title={t.description}>
                                       {t.description}
                                    </TableCell>
                                    <TableCell className="text-xs font-normal text-muted-foreground">
                                       {formatAmount(t.amount, t.currency)}
                                    </TableCell>
                                    <TableCell className="text-xs font-normal text-muted-foreground">
                                       {formatRefundStatusShort(t)}
                                    </TableCell>
                                 </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>

                )}
                </div>
            <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
               <div className="flex items-center gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     disabled={history.length === 0 || loading}
                     onClick={handlePrevPage}
                  >
                     <ArrowLeft className="size-4 mr-1" />
                     Previous
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     disabled={!hasMore || loading}
                     onClick={handleNextPage}
                  >
                     Next
                     <ArrowRight className="size-4 ml-1" />
                  </Button>
               </div>
               <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
               >
                  Close
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Transaction Details & Refund Dialog */}
      <Dialog open={selectedTransaction !== null} onOpenChange={(isOpen) => !isOpen && setSelectedTransaction(null)}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Refund Transaction</DialogTitle>
               <DialogDescription>
                  Manage refunds for this transaction.
               </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
               <div className="flex flex-col gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4 border-b border-border pb-4 text-xs">
                     <div>
                        <span className="font-medium text-muted-foreground block mb-0.5">Date</span>
                        <span className="text-foreground">{formatDate(selectedTransaction.created)}</span>
                     </div>
                     <div>
                        <span className="font-medium text-muted-foreground block mb-0.5">Amount</span>
                        <span className="text-foreground">{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}</span>
                     </div>
                     <div className="col-span-2">
                        <span className="font-medium text-muted-foreground block mb-0.5">Description</span>
                        <span className="text-foreground truncate block" title={selectedTransaction.description}>
                           {selectedTransaction.description}
                        </span>
                     </div>
                     <div className="col-span-2">
                        <span className="font-medium text-muted-foreground block mb-0.5">Refund Status</span>
                        <span className="text-foreground">
                           {formatRefundStatus(selectedTransaction)}
                        </span>
                     </div>
                  </div>

                  {selectedTransaction.refunds.length > 0 && (
                     <div className="flex flex-col gap-1.5 border-b border-border pb-4">
                        <span className="text-xs font-medium text-muted-foreground">
                           Refund history
                        </span>
                        <ul
                           className={cn(
                              "flex flex-col gap-1.5",
                              selectedTransaction.refunds.length > 3 &&
                                 "max-h-[4.5rem] overflow-y-auto pr-1"
                           )}
                        >
                           {selectedTransaction.refunds.map((r) => (
                              <li
                                 key={r.id}
                                 className="text-xs text-muted-foreground flex items-center gap-x-3"
                              >
                                 <span>{formatAmount(r.amount, selectedTransaction.currency)}</span>
                                 <span>{formatDate(r.created)}</span>
                                 <span className="capitalize">{r.status ?? "unknown"}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}

                  {/* Refund Inputs */}
                  {(selectedTransaction.amount - selectedTransaction.amountRefunded) > 0 ? (
                     <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                           <Label htmlFor={`refund-amount-${selectedTransaction.id}`} className="text-xs text-muted-foreground">
                              Partial Refund Amount ($)
                           </Label>
                           <Input
                              id={`refund-amount-${selectedTransaction.id}`}
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={((selectedTransaction.amount - selectedTransaction.amountRefunded) / 100).toFixed(2)}
                              placeholder="0.00"
                              value={refundAmounts[selectedTransaction.id] || ""}
                              disabled={submitting === selectedTransaction.id}
                              onChange={(e) => setRefundAmounts({ ...refundAmounts, [selectedTransaction.id]: e.target.value })}
                              className="h-9 text-xs"
                           />
                        </div>
                     </div>
                  ) : (
                     <p className="text-xs text-muted-foreground italic text-center py-2">
                        No further refunds can be issued for this charge.
                     </p>
                  )}
               </div>
            )}

            <DialogFooter>
               <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTransaction(null)}
                  disabled={selectedTransaction ? submitting === selectedTransaction.id : false}
               >
                  Cancel
               </Button>
               {selectedTransaction && (selectedTransaction.amount - selectedTransaction.amountRefunded) > 0 && (
                  <>
                     <Button
                        type="button"
                        disabled={submitting === selectedTransaction.id}
                        onClick={() => initiateRefund(
                           selectedTransaction.id,
                           false,
                           selectedTransaction.amount - selectedTransaction.amountRefunded,
                           selectedTransaction.currency
                        )}
                     >
                        {submitting === selectedTransaction.id ? (
                            <Spinner className="size-3 mr-1.5" />
                        ) : null}
                        Refund Partial
                     </Button>
                     <Button
                        type="button"
                        variant="destructive"
                        disabled={submitting === selectedTransaction.id}
                        onClick={() => initiateRefund(
                           selectedTransaction.id,
                           true,
                           selectedTransaction.amount - selectedTransaction.amountRefunded,
                           selectedTransaction.currency
                        )}
                     >
                        Refund Full
                     </Button>
                  </>
               )}
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Refund Confirmation Alert Dialog */}
      <AlertDialog open={confirmRefund !== null} onOpenChange={(isOpen) => !isOpen && setConfirmRefund(null)}>
         <AlertDialogContent size="default">
            <AlertDialogHeader>
               <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
               <AlertDialogDescription>
                  Are you sure you want to issue a {confirmRefund?.isFullRefund ? "full" : "partial"} refund of{" "}
                  <span className="font-bold text-foreground">{confirmRefund?.displayAmount}</span>? This action will transfer money back to the customer on Stripe and cannot be undone.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setConfirmRefund(null)}>Cancel</AlertDialogCancel>
               <AlertDialogAction variant="destructive" onClick={executeRefund}>
                  Confirm Refund
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   </>
);
}