import { SimpleCard } from "~/components/ui/card";
import { SupportPage } from "~/components/support-page";

export default function SupportRoute() {
  return (
    <div className="bg-background-secondary py-8 flex-1">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <SimpleCard className="rounded-md border bg-card text-card-foreground p-6 md:p-8">
          <SupportPage />
        </SimpleCard>
      </div>
    </div>
  );
}
