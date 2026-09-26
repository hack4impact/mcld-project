"use client";

import * as React from "react";
import { useActionState } from "react";
import { format } from "date-fns";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cadStringToCents, centsToMoneyString } from "@/lib/money";

import {
   fetchCashSessionClients,
   recordCashSession,
   type ServiceActionState,
} from "@/app/(authenticated)/services/actions";
import type {
   CashSessionClient,
   ServiceView,
} from "@/app/(authenticated)/services/queries";

const MAX_CLIENT_RESULTS = 8;

function FieldError({ messages }: { messages?: string[] }) {
   if (!messages?.length) return null;
   return (
      <ul className="flex flex-col gap-0.5 text-xs text-destructive">
         {messages.map((m, i) => (
            <li key={i}>{m}</li>
         ))}
      </ul>
   );
}

function nowLocalInput(): string {
   return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function toIso(localValue: string): string {
   const d = new Date(localValue);
   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function RecordCashSessionDialog({
   service,
   open,
   onOpenChange,
}: {
   service: ServiceView | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const [clients, setClients] = React.useState<CashSessionClient[] | null>(
      null,
   );
   const [loadError, setLoadError] = React.useState<string | null>(null);
   const [loading, startLoading] = React.useTransition();

   const [submissionId, setSubmissionId] = React.useState("");
   const [query, setQuery] = React.useState("");
   const [clientId, setClientId] = React.useState("");
   const [childId, setChildId] = React.useState("");
   const [sessionAt, setSessionAt] = React.useState("");
   const [duration, setDuration] = React.useState("");
   const [amount, setAmount] = React.useState("");
   const [reason, setReason] = React.useState("");

   const [state, formAction, pending] = useActionState<
      ServiceActionState,
      FormData
   >(recordCashSession, null);

   React.useEffect(() => {
      if (!open || !service) return;
      setSubmissionId(crypto.randomUUID());
      setQuery("");
      setClientId("");
      setChildId("");
      setSessionAt(nowLocalInput());
      setDuration(String(service.durationMinutes));
      setAmount(centsToMoneyString(service.priceCents));
      setReason("");

      let ignore = false;
      setClients(null);
      setLoadError(null);
      startLoading(async () => {
         try {
            const rows = await fetchCashSessionClients(service.id);
            if (!ignore) setClients(rows);
         } catch {
            if (!ignore) setLoadError("Could not load clients.");
         }
      });
      return () => {
         ignore = true;
      };
   }, [open, service]);

   const selected = clients?.find((c) => c.id === clientId) ?? null;

   const prevState = React.useRef<ServiceActionState>(null);
   React.useEffect(() => {
      if (state === prevState.current) return;
      prevState.current = state;
      if (state?.message && !state.errors) {
         const who = selected
            ? ` for ${selected.firstName} ${selected.lastName}`
            : "";
         toast.success(`Cash session recorded${who}`, {
            description: `$${amount} paid in cash, recorded in Stripe.`,
         });
         onOpenChange(false);
      } else if (state?.errors?._form?.length) {
         toast.error(state.errors._form[0]);
      }
   }, [state, onOpenChange, selected, amount]);

   const matches = React.useMemo(() => {
      if (!clients) return [];
      const q = query.trim().toLowerCase();
      const filtered = q
         ? clients.filter((c) =>
              `${c.firstName} ${c.lastName} ${c.email}`
                 .toLowerCase()
                 .includes(q),
           )
         : clients;
      return filtered.slice(0, MAX_CLIENT_RESULTS);
   }, [clients, query]);

   const amountCents = cadStringToCents(amount);
   const isAdjusted =
      service?.priceCents != null &&
      amountCents !== null &&
      amountCents !== service.priceCents;

   const errors = state?.errors;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Record cash session</DialogTitle>
               <DialogDescription>
                  A session that already happened and was paid in cash.
               </DialogDescription>
            </DialogHeader>

            {loading && (
               <div className="flex justify-center py-8">
                  <Spinner className="size-6 text-muted-foreground" />
               </div>
            )}

            {loadError && (
               <p className="text-sm text-destructive">{loadError}</p>
            )}

            {!loading && !loadError && clients && service && (
               <form action={formAction} className="flex flex-col gap-4">
                  <input
                     type="hidden"
                     name="submission_id"
                     value={submissionId}
                  />
                  <input type="hidden" name="service_id" value={service.id} />
                  <input type="hidden" name="user_id" value={clientId} />
                  <input type="hidden" name="child_id" value={childId} />
                  <input
                     type="hidden"
                     name="session_at"
                     value={toIso(sessionAt)}
                  />

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="client_search">Client</Label>
                     {selected ? (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                           <span>
                              <span className="font-medium">
                                 {selected.firstName} {selected.lastName}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                 {selected.email}
                              </span>
                           </span>
                           <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                 setClientId("");
                                 setChildId("");
                              }}
                           >
                              Change
                           </Button>
                        </div>
                     ) : (
                        <>
                           <Input
                              id="client_search"
                              placeholder="Search by name or email..."
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                           />
                           <ul className="flex max-h-48 flex-col overflow-y-auto rounded-md border border-border">
                              {matches.length === 0 ? (
                                 <li className="px-3 py-2 text-sm text-muted-foreground">
                                    No clients found.
                                 </li>
                              ) : (
                                 matches.map((c) => (
                                    <li key={c.id}>
                                       <button
                                          type="button"
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                          onClick={() => {
                                             setClientId(c.id);
                                             setChildId("");
                                          }}
                                       >
                                          <span className="font-medium">
                                             {c.firstName} {c.lastName}
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                             {c.email}
                                          </span>
                                       </button>
                                    </li>
                                 ))
                              )}
                           </ul>
                        </>
                     )}
                     <FieldError messages={errors?.user_id} />
                  </div>

                  {selected && service.isForChildren && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="child">Child</Label>
                        {selected.children.length === 0 ? (
                           <p className="text-sm text-muted-foreground">
                              This client has no registered children.
                           </p>
                        ) : (
                           <Select value={childId} onValueChange={setChildId}>
                              <SelectTrigger id="child" className="w-full">
                                 <SelectValue placeholder="Select a child" />
                              </SelectTrigger>
                              <SelectContent>
                                 {selected.children.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                       {c.firstName} {c.lastName}
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        )}
                        <FieldError messages={errors?.child_id} />
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="session_at_local">Date & time</Label>
                        <Input
                           id="session_at_local"
                           type="datetime-local"
                           required
                           max={nowLocalInput()}
                           value={sessionAt}
                           onChange={(e) => setSessionAt(e.target.value)}
                        />
                        <FieldError messages={errors?.session_at} />
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="duration_minutes">Duration (min)</Label>
                        <Input
                           id="duration_minutes"
                           name="duration_minutes"
                           type="number"
                           min={1}
                           max={1440}
                           required
                           value={duration}
                           onChange={(e) => setDuration(e.target.value)}
                        />
                        <FieldError messages={errors?.duration_minutes} />
                     </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="amount">Cash received (CAD)</Label>
                     <ButtonGroup className="w-full">
                        <ButtonGroupText aria-hidden="true">
                           <DollarSign />
                        </ButtonGroupText>
                        <Input
                           id="amount"
                           name="amount"
                           type="number"
                           min={0.01}
                           step={0.01}
                           required
                           value={amount}
                           onChange={(e) => setAmount(e.target.value)}
                        />
                     </ButtonGroup>
                     <FieldError messages={errors?.amount} />
                  </div>

                  {isAdjusted && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="adjustment_reason">
                           Reason for price change
                        </Label>
                        <Textarea
                           id="adjustment_reason"
                           name="adjustment_reason"
                           required
                           maxLength={500}
                           value={reason}
                           onChange={(e) => setReason(e.target.value)}
                        />
                        <FieldError messages={errors?.adjustment_reason} />
                     </div>
                  )}

                  <FieldError messages={errors?._form} />

                  <DialogFooter>
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                     >
                        Cancel
                     </Button>
                     <Button type="submit" disabled={pending || !clientId}>
                        {pending ? "Recording..." : "Record session"}
                     </Button>
                  </DialogFooter>
               </form>
            )}
         </DialogContent>
      </Dialog>
   );
}
