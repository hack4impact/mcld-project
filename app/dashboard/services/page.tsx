import { Suspense } from "react";
import { ServicesPlayground } from "./service-forms";
import { listServices } from "./queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function ServicesList() {
  const services = await listServices();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mb-8">
      {services.length === 0 && (
         <div className="col-span-full p-4 border rounded text-muted-foreground text-center">No services found.</div>
      )}
      {services.map(svc => (
        <Card key={svc.id} className="shadow-sm">
          <CardHeader>
            <CardTitle>{svc.title || "Untitled"}</CardTitle>
            <CardDescription className="uppercase text-xs tracking-wider font-semibold flex justify-between items-center">
              <span>{svc.type.replace("_", " ")}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${svc.status === 'active' ? 'bg-green-100 text-green-800' : svc.status === 'disabled' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                {svc.status}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm mb-4 text-muted-foreground line-clamp-2">{svc.description || "No description."}</p>
             <div className="text-sm font-medium flex items-center">
               {svc.priceCents ? `$${(svc.priceCents / 100).toFixed(2)} CAD` : "Free"} 
               <span className="text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded ml-2">duration:  {svc.durationMinutes} min</span>
             </div>
             {Array.isArray(svc.scheduledAt) && svc.scheduledAt.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                   <strong>Dates:</strong> {svc.scheduledAt.length} preset dates
                </div>
             )}
             <div className="text-[10px] text-muted-foreground mt-4 break-all bg-muted/50 p-1.5 rounded">
               ID: <span className="font-mono">{svc.id}</span>
             </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-muted/20">
      <div className="w-full max-w-5xl mb-6">
         <h1 className="text-3xl font-bold mb-2">Services Dashboard</h1>
         <p className="text-muted-foreground">Manage your coaching and booking services.</p>
      </div>
      
      <Suspense fallback={<div className="w-full max-w-5xl mb-8 p-8 text-center text-muted-foreground border border-dashed rounded-lg">Loading services from cache...</div>}>
        <ServicesList />
      </Suspense>
      
      <div className="w-full max-w-5xl mt-4 mb-8">
        <h2 className="text-xl font-bold mb-4">Playground Actions</h2>
        <ServicesPlayground />
      </div>
    </main>
  );
}
