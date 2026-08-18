import { DatabaseSetup } from "@/components/database-setup";
import { isDeskDatabaseConfigured } from "@/lib/desk-database";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  if (!isDeskDatabaseConfigured()) {
    return <DatabaseSetup />;
  }
  return children;
}
