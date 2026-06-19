import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ACCOUNTS = [
  { id: "hq", email: "admin@test.com", label: "HQ", color: "bg-teal-100 text-teal-800 hover:bg-teal-200" },
  { id: "admin", email: "admin@test.com", label: "Admin", color: "bg-red-100 text-red-800 hover:bg-red-200" },
  { id: "editor", email: "editor@test.com", label: "Editor", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "managing", email: "managing@test.com", label: "Managing", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { id: "reviewer", email: "reviewer@test.com", label: "Reviewer", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
  { id: "researcher", email: "researcher@test.com", label: "Researcher", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { id: "committee", email: "committee@test.com", label: "Committee", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
];

export function RoleSwitcher() {
  const [switching, setSwitching] = useState<string | null>(null);

  const switchTo = async (account: typeof ACCOUNTS[0]) => {
    setSwitching(account.id);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        email: account.email,
        password: "123456789",
      });
      if (error) throw error;
      toast.success(`Switched to ${account.label}`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 overflow-x-auto">
      <span className="text-xs text-muted-foreground whitespace-nowrap me-1">🔧 Test:</span>
      {ACCOUNTS.map((acc) => (
        <Button
          key={acc.id}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs rounded-full ${acc.color}`}
          disabled={switching !== null}
          onClick={() => switchTo(acc)}
        >
          {switching === acc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : acc.label}
        </Button>
      ))}
    </div>
  );
}
