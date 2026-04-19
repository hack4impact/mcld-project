"use client";

import { useActionState } from "react";
import { createService, updateService, setServiceStatus } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CreateServiceCard() {
  const [state, action, isPending] = useActionState(createService, null);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Create Service</CardTitle>
        <CardDescription>Test creating a new service in DB and Stripe.</CardDescription>
      </CardHeader>
      <CardContent>
        {state?.message && (
          <div className="bg-green-50 text-green-900 border border-green-200 p-3 rounded-md mb-4 text-sm">
            {state.message}
          </div>
        )}
        {state?.errors?._form && (
          <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-md mb-4 text-sm">
            {state.errors._form[0]}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Service Title</Label>
            <Input id="title" name="title" placeholder="e.g., Parent Coaching" />
            {state?.errors?.title && (
              <p className="text-xs text-destructive">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Required)</Label>
            <Input id="description" name="description" placeholder="A short explanation" />
            {state?.errors?.description && (
              <p className="text-xs text-destructive">{state.errors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_cad">Price (CAD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                <Input id="price_cad" name="price_cad" placeholder="99.00" className="pl-6" />
              </div>
              {state?.errors?.price_cad && (
                <p className="text-xs text-destructive">{state.errors.price_cad[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (Min)</Label>
              <Input id="duration_minutes" name="duration_minutes" defaultValue="60" />
              {state?.errors?.duration_minutes && (
                <p className="text-xs text-destructive">{state.errors.duration_minutes[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Scheduled Dates (JSON Array)</Label>
            <Input id="scheduled_at" name="scheduled_at" placeholder='["2026-05-01T10:00:00Z"]' />
            {state?.errors?.scheduled_at && (
              <p className="text-xs text-destructive">{state.errors.scheduled_at[0]}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Required for Bookings. Ignore for Coaching.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Service Type</Label>
            <select
              id="type"
              name="type"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="private_lessons">Private Lessons</option>
              <option value="programs">Programs</option>
            </select>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Connecting to Stripe..." : "Create Service"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditServiceCard() {
  const [state, action, isPending] = useActionState(updateService, null);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Edit Service</CardTitle>
        <CardDescription>Paste a Service ID (UUID) to update details.</CardDescription>
      </CardHeader>
      <CardContent>
        {state?.message && (
          <div className="bg-green-50 text-green-900 border border-green-200 p-3 rounded-md mb-4 text-sm">
            {state.message}
          </div>
        )}
        {state?.errors?._form && (
          <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-md mb-4 text-sm">
            {state.errors._form[0]}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="service_id">Service ID (UUID) *</Label>
            <Input id="service_id" name="service_id" placeholder="Copy from Supabase" />
            {state?.errors?.service_id && (
              <p className="text-xs text-destructive">{state.errors.service_id[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-title">New Title</Label>
            <Input id="edit-title" name="title" placeholder="Optional" />
            {state?.errors?.title && (
              <p className="text-xs text-destructive">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">New Description</Label>
            <Input id="edit-description" name="description" placeholder="Optional" />
            {state?.errors?.description && (
              <p className="text-xs text-destructive">{state.errors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price_cad">New Price (CAD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                <Input id="edit-price_cad" name="price_cad" placeholder="Optional" className="pl-6" />
              </div>
              {state?.errors?.price_cad && (
                <p className="text-xs text-destructive">{state.errors.price_cad[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration_minutes">Duration (Min)</Label>
              <Input id="edit-duration_minutes" name="duration_minutes" placeholder="Optional" />
              {state?.errors?.duration_minutes && (
                <p className="text-xs text-destructive">{state.errors.duration_minutes[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-scheduled_at">New Scheduled Dates (JSON Array)</Label>
            <Input id="edit-scheduled_at" name="scheduled_at" placeholder='Optional' />
            {state?.errors?.scheduled_at && (
              <p className="text-xs text-destructive">{state.errors.scheduled_at[0]}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Note: Service Type is immutable.</p>

          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full" disabled={isPending}>
              {isPending ? "Connecting to Stripe..." : "Update Service"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UpdateStatusCard() {
  const [state, action, isPending] = useActionState(setServiceStatus, null);

  return (
    <Card className="w-full shadow-sm border-amber-200">
      <CardHeader>
        <CardTitle className="text-xl">Set Status</CardTitle>
        <CardDescription>Archive or disable an existing service.</CardDescription>
      </CardHeader>
      <CardContent>
        {state?.message && (
          <div className="bg-green-50 text-green-900 border border-green-200 p-3 rounded-md mb-4 text-sm">
            {state.message}
          </div>
        )}
        {state?.errors?._form && (
          <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-md mb-4 text-sm">
            {state.errors._form[0]}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="status_service_id">Service ID (UUID) *</Label>
            <Input id="status_service_id" name="service_id" placeholder="Copy from Supabase" />
            {state?.errors?.service_id && (
              <p className="text-xs text-destructive">{state.errors.service_id[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="archived">Archived</option>
            </select>
            {state?.errors?.status && (
              <p className="text-xs text-destructive">{state.errors.status[0]}</p>
            )}
          </div>

          <div className="pt-2">
            <Button type="submit" variant="destructive" className="w-full" disabled={isPending}>
              {isPending ? "Connecting to Stripe..." : "Change Status"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ServicesPlayground() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl items-start">
      <CreateServiceCard />
      <EditServiceCard />
      <UpdateStatusCard />
    </div>
  );
}
