import { CustomerForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="New record"
        title="Add customer"
        description="Company and contact first. Meters and contracts go on the record afterwards."
      />
      <CustomerForm />
    </div>
  );
}
