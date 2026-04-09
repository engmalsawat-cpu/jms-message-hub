import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ACCOUNTS = [
  { email: "admin@test.com", label: "Admin", color: "bg-red-100 text-red-800 hover:bg-red-200" },
  { email: "editor@test.com", label: "Editor", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { email: "managing@test.com", label: "Managing", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { email: "reviewer@test.com", label: "Reviewer", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
  { email: "researcher@test.com", label: "Researcher", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { email: "committee@test.com", label: "Committee", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
];

export function RoleSwitcher() {
  const [switching, setSwitching] = useState<string | null>(null);

  const switchTo = async (email: string) => {
    setSwitching(email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "123456789",
      });
      if (error) throw error;
      toast.success(`Switched to ${email}`);
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
          key={acc.email}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs rounded-full ${acc.color}`}
          disabled={switching !== null}
          onClick={() => switchTo(acc.email)}
        >
          {switching === acc.email ? <Loader2 className="h-3 w-3 animate-spin" /> : acc.label}
        </Button>
      ))}
    </div>
  );
}
