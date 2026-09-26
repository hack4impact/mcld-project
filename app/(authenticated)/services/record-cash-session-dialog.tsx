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
const PAYLOAD_FIELDS = [
   "submission_id",
   "submitted_at",
   "service_id",
   "user_id",
   "child_id",
   "session_at",
   "collected_at",
   "duration_minutes",
   "amount",
   "adjustment_reason",
] as const;
type CashPayload = Record<(typeof PAYLOAD_FIELDS)[number], string>;
type CashDraft = {
   version: 1;
   recorderId: string;
   serviceId: string;
   locked: boolean;
   reviewRequired: boolean;
   payload: CashPayload;
};

function readDraft(key: string, recorderId: string, serviceId: string) {
   const raw = sessionStorage.getItem(key);
   if (raw === null) return null;
   const draft: CashDraft = JSON.parse(raw);
   if (
      draft?.version !== 1 ||
      draft.recorderId !== recorderId ||
      draft.serviceId !== serviceId ||
      typeof draft.locked !== "boolean" ||
      typeof draft.reviewRequired !== "boolean" ||
      !draft.payload ||
      PAYLOAD_FIELDS.some((name) => typeof draft.payload[name] !== "string") ||
      draft.payload.service_id !== serviceId ||
      !draft.payload.submission_id ||
      !Number.isFinite(Date.parse(draft.payload.submitted_at))
   ) {
      throw new Error("Invalid saved cash recording");
   }
   return draft;
}

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

function localInput(iso?: string): string {
   const date = iso ? new Date(iso) : new Date();
   return Number.isNaN(date.getTime())
      ? ""
      : format(date, "yyyy-MM-dd'T'HH:mm");
}

function toIso(localValue: string): string {
   const d = new Date(localValue);
   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

type DialogProps = {
   service: ServiceView | null;
   recorderId: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
};

export function RecordCashSessionDialog({
   service,
   open,
   ...props
}: DialogProps) {
   if (!open || !service) return null;
   return (
      <CashSessionForm
         key={`${props.recorderId}:${service.id}`}
         service={service}
         {...props}
      />
   );
}

function CashSessionForm({
   service,
   recorderId,
   onOpenChange,
}: Omit<DialogProps, "open" | "service"> & { service: ServiceView }) {
   const storageKey = `mcld:cash-session:v1:${recorderId}:${service.id}`;
   const [clients, setClients] = React.useState<CashSessionClient[] | null>(
      null,
   );
   const [loadError, setLoadError] = React.useState<string | null>(null);
   const [storageError, setStorageError] = React.useState<string | null>(null);
   const [loading, startLoading] = React.useTransition();
   const [ready, setReady] = React.useState(false);
   const [draft, setDraft] = React.useState<CashDraft | null>(null);
   const draftRef = React.useRef<CashDraft | null>(null);
   const activeRef = React.useRef(false);
   const savingRef = React.useRef(false);

   const [submissionId, setSubmissionId] = React.useState("");
   const [submittedAt, setSubmittedAt] = React.useState("");
   const [query, setQuery] = React.useState("");
   const [clientId, setClientId] = React.useState("");
   const [childId, setChildId] = React.useState("");
   const [sessionAt, setSessionAt] = React.useState("");
   const [collectedAt, setCollectedAt] = React.useState("");
   const [duration, setDuration] = React.useState("");
   const [amount, setAmount] = React.useState("");
   const [reason, setReason] = React.useState("");

   function persist(next: CashDraft) {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      draftRef.current = next;
      if (activeRef.current) setDraft(next);
   }

   const [state, formAction, pending] = useActionState<
      ServiceActionState,
      FormData
   >(async (previous, formData) => {
      const previousDraft = draftRef.current;
      if (previousDraft?.reviewRequired) {
         return {
            errors: {
               _form: [
                  "Ask an administrator to review this recording before trying again.",
               ],
            },
            retryRequired: true,
            reviewRequired: true,
         };
      }
      const wasUncertain = previousDraft?.locked === true;
      const payload = wasUncertain
         ? previousDraft.payload
         : (Object.fromEntries(
              PAYLOAD_FIELDS.map((name) => [
                 name,
                 String(formData.get(name) ?? ""),
              ]),
           ) as CashPayload);
      if (!wasUncertain) payload.submitted_at = new Date().toISOString();
      const snapshot: CashDraft = {
         version: 1,
         recorderId,
         serviceId: service.id,
         locked: true,
         reviewRequired: false,
         payload,
      };
      savingRef.current = true;
      try {
         try {
            // Persist before any financial request; reloads must retry this exact payload.
            persist(snapshot);
            setSubmittedAt(payload.submitted_at);
            setStorageError(null);
         } catch {
            setStorageError(
               "This browser couldn't save the recording for a safe retry. Allow session storage before recording cash.",
            );
            return null;
         }

         const request = new FormData();
         for (const name of PAYLOAD_FIELDS) request.set(name, payload[name]);
         let result: ServiceActionState;
         try {
            result = await recordCashSession(previous, request);
         } catch {
            return {
               errors: {
                  _form: [
                     "We couldn't confirm whether this recording finished. Retry the same recording to check it safely.",
                  ],
               },
               retryRequired: true,
            };
         }
         if (result?.cashSession && !result.errors) {
            if (result.cashSession.submissionId !== payload.submission_id) {
               persist({ ...snapshot, reviewRequired: true });
               return {
                  errors: {
                     _form: [
                        "The recording response did not match. Ask an administrator to review it.",
                     ],
                  },
                  retryRequired: true,
                  reviewRequired: true,
               };
            }
            try {
               sessionStorage.removeItem(storageKey);
            } catch {
               return {
                  errors: {
                     _form: [
                        "The session was recorded, but this browser couldn't clear its saved retry. Retry to confirm it before starting another recording.",
                     ],
                  },
                  retryRequired: true,
               };
            }
            return result;
         }
         // Only a first-attempt preflight rejection proves that edits are still safe.
         const locked = wasUncertain || result?.retryRequired !== false;
         try {
            persist({
               ...snapshot,
               locked,
               reviewRequired: result?.reviewRequired === true,
            });
         } catch {
            return {
               errors: {
                  _form: [
                     "This browser couldn't update the saved recording. Its original details are kept for a safe retry.",
                  ],
               },
               retryRequired: true,
            };
         }
         if (wasUncertain && result?.retryRequired === false && result.errors) {
            return {
               ...result,
               retryRequired: true,
               errors: {
                  ...result.errors,
                  _form: [
                     ...(result.errors._form ?? []),
                     "This saved recording couldn't pass the current checks. Keep its details unchanged. Retry, or ask an administrator to review it in Stripe if the problem continues.",
                  ],
               },
            };
         }
         return (
            result ?? {
               errors: {
                  _form: [
                     "We couldn't confirm the recording. Retry the same recording.",
                  ],
               },
               retryRequired: true,
            }
         );
      } finally {
         savingRef.current = false;
      }
   }, null);

   React.useEffect(() => {
      activeRef.current = true;
      let ignore = false;
      try {
         const saved = readDraft(storageKey, recorderId, service.id);
         draftRef.current = saved;
         setDraft(saved);
         setSubmissionId(saved?.payload.submission_id ?? crypto.randomUUID());
         setSubmittedAt(
            saved?.payload.submitted_at ?? new Date().toISOString(),
         );
         setClientId(saved?.payload.user_id ?? "");
         setChildId(saved?.payload.child_id ?? "");
         setSessionAt(
            saved ? localInput(saved.payload.session_at) : localInput(),
         );
         setCollectedAt(
            saved ? localInput(saved.payload.collected_at) : localInput(),
         );
         setDuration(
            saved?.payload.duration_minutes ?? String(service.durationMinutes),
         );
         setAmount(
            saved?.payload.amount ?? centsToMoneyString(service.priceCents),
         );
         setReason(saved?.payload.adjustment_reason ?? "");
         setReady(true);
      } catch {
         setStorageError(
            "The previous recording couldn't be restored. Contact an administrator before starting another cash recording in this browser.",
         );
      }
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
         activeRef.current = false;
      };
   }, [
      storageKey,
      recorderId,
      service.id,
      service.durationMinutes,
      service.priceCents,
   ]);

   const selected = clients?.find((c) => c.id === clientId) ?? null;
   const prevState = React.useRef<ServiceActionState>(null);
   React.useEffect(() => {
      if (!activeRef.current || state === prevState.current) return;
      prevState.current = state;
      if (state?.cashSession && !state.errors) {
         const payment = state.cashSession;
         const who = selected
            ? ` for ${selected.firstName} ${selected.lastName}`
            : "";
         toast.success(`Cash session recorded${who}`, {
            description: `${new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amountCents / 100)} paid in cash, recorded in Stripe.`,
         });
         onOpenChange(false);
      }
   }, [state, onOpenChange, selected]);
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
   const locked = draft?.locked === true;
   const reviewRequired = draft?.reviewRequired === true;
   const frozen = pending || locked;
   function changeOpen(next: boolean) {
      if (!pending && !savingRef.current) onOpenChange(next);
   }

   return (
      <Dialog open onOpenChange={changeOpen}>
         <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
            <DialogHeader>
               <DialogTitle>Record cash session</DialogTitle>
               <DialogDescription>
                  Record a completed session for{" "}
                  {service.title ?? "this service"} that was paid in cash.
               </DialogDescription>
            </DialogHeader>

            {storageError && (
               <p role="alert" className="text-sm text-destructive">
                  {storageError}
               </p>
            )}
            {loading && (
               <div className="flex justify-center py-8">
                  <Spinner className="size-6 text-muted-foreground" />
               </div>
            )}

            {loadError && (
               <p className="text-sm text-destructive">{loadError}</p>
            )}

            {ready && !loading && !loadError && clients && (
               <form action={formAction} className="flex flex-col gap-4">
                  <input
                     type="hidden"
                     name="submission_id"
                     value={submissionId}
                  />
                  <input
                     type="hidden"
                     name="submitted_at"
                     value={submittedAt}
                  />
                  <input type="hidden" name="service_id" value={service.id} />
                  <input type="hidden" name="user_id" value={clientId} />
                  <input type="hidden" name="child_id" value={childId} />
                  <input
                     type="hidden"
                     name="session_at"
                     value={toIso(sessionAt)}
                  />

                  <input
                     type="hidden"
                     name="collected_at"
                     value={toIso(collectedAt)}
                  />
                  {locked && (
                     <p role="status" className="text-sm text-muted-foreground">
                        {reviewRequired
                           ? "This recording needs administrator review before another attempt. Its details have been saved."
                           : "A previous attempt may already have been recorded. Retry the same recording to confirm it. Its details are saved if you close this window."}
                     </p>
                  )}
                  <fieldset disabled={frozen} className="contents">
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
                        ) : locked && clientId ? (
                           <p className="rounded-md border px-3 py-2 text-sm">
                              Previously selected client
                           </p>
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
                              <Select
                                 disabled={frozen}
                                 value={childId}
                                 onValueChange={setChildId}
                              >
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
                              max={localInput()}
                              value={sessionAt}
                              onChange={(e) => {
                                 const next = e.target.value;
                                 if (collectedAt === sessionAt)
                                    setCollectedAt(next);
                                 setSessionAt(next);
                              }}
                           />
                           <FieldError messages={errors?.session_at} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <Label htmlFor="duration_minutes">
                              Duration (min)
                           </Label>
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
                        <Label htmlFor="collected_at_local">
                           Cash collected at
                        </Label>
                        <Input
                           id="collected_at_local"
                           type="datetime-local"
                           required
                           max={localInput()}
                           value={collectedAt}
                           onChange={(event) =>
                              setCollectedAt(event.target.value)
                           }
                        />
                        <FieldError messages={errors?.collected_at} />
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
                  </fieldset>
                  <FieldError messages={errors?.submitted_at} />
                  <FieldError messages={errors?._form} />

                  <DialogFooter>
                     <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => changeOpen(false)}
                     >
                        Cancel
                     </Button>
                     <Button
                        type="submit"
                        disabled={pending || !clientId || reviewRequired}
                     >
                        {pending
                           ? "Recording..."
                           : locked
                             ? "Retry same recording"
                             : "Record session"}
                     </Button>
                  </DialogFooter>
               </form>
            )}
         </DialogContent>
      </Dialog>
   );
}
