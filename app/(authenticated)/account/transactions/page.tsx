import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateFromInstant } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { listMyTransactions } from "./queries";

export default function TransactionsPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <TransactionsContent />
      </Suspense>
   );
}

async function TransactionsContent() {
   const user = await getCurrentUser();
   if (!user) redirect("/login");

   const { data: transactions } = await listMyTransactions(user.id);

   return (
      <main className="flex flex-col gap-6 p-8">
         <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-sm text-muted-foreground">
               Payments made on your account.
            </p>
         </div>

         {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
               You have no transactions yet.
            </p>
         ) : (
            <div className="overflow-hidden rounded-lg border border-border">
               <Table>
                  <TableHeader className="bg-primary/30">
                     <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {transactions.map((transaction) => {
                        const partiallyRefunded =
                           !transaction.refunded &&
                           transaction.amountRefunded > 0;

                        return (
                           <TableRow key={transaction.id}>
                              <TableCell>
                                 {formatDateFromInstant(
                                    new Date(transaction.created * 1000),
                                 )}
                              </TableCell>
                              <TableCell className="font-medium">
                                 {transaction.description}
                              </TableCell>
                              <TableCell className="text-right">
                                 {formatCents(
                                    transaction.amount,
                                    transaction.currency,
                                 )}
                              </TableCell>
                              <TableCell>
                                 {transaction.refunded ? (
                                    <Badge className="bg-muted text-muted-foreground">
                                       refunded
                                    </Badge>
                                 ) : partiallyRefunded ? (
                                    <Badge className="bg-amber-700/80 text-white">
                                       {formatCents(
                                          transaction.amountRefunded,
                                          transaction.currency,
                                       )}{" "}
                                       refunded
                                    </Badge>
                                 ) : (
                                    <Badge className="bg-green-700/80 text-white">
                                       paid
                                    </Badge>
                                 )}
                              </TableCell>
                           </TableRow>
                        );
                     })}
                  </TableBody>
               </Table>
            </div>
         )}
      </main>
   );
}
