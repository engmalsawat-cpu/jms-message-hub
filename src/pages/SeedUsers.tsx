import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const TEST_USERS = [
  { email: "admin@test.com", password: "123456789", role: "admin", name: "مدير النظام (Admin)" },
  { email: "editor@test.com", password: "123456789", role: "editor_in_chief", name: "رئيس التحرير (Editor in Chief)" },
  { email: "managing@test.com", password: "123456789", role: "managing_editor", name: "مدير التحرير (Managing Editor)" },
  { email: "reviewer@test.com", password: "123456789", role: "reviewer", name: "محكّم (Reviewer)" },
  { email: "researcher@test.com", password: "123456789", role: "researcher", name: "باحث (Researcher)" },
  { email: "committee@test.com", password: "123456789", role: "committee_member", name: "عضو لجنة (Committee Member)" },
];

type Status = "idle" | "loading" | "success" | "error";

export default function SeedUsers() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [running, setRunning] = useState(false);

  const createUser = async (user: typeof TEST_USERS[0]) => {
    setStatuses((s) => ({ ...s, [user.email]: "loading" }));
    try {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: { data: { full_name: user.name } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // Assign role - we need to insert via a direct call
      // Since RLS requires admin role, we'll handle this after first admin is created
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: user.role as any,
      });
      
      if (roleError) {
        console.warn(`Role assignment for ${user.email}:`, roleError.message);
      }

      setStatuses((s) => ({ ...s, [user.email]: "success" }));
    } catch (err: any) {
      console.error(`Error creating ${user.email}:`, err.message);
      setStatuses((s) => ({ ...s, [user.email]: "error" }));
    }
  };

  const createAll = async () => {
    setRunning(true);
    // Create admin first so they can assign roles
    for (const user of TEST_USERS) {
      await createUser(user);
      // Small delay between signups
      await new Promise((r) => setTimeout(r, 1000));
    }
    setRunning(false);
    toast.success("Done creating test users!");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔧 Seed Test Users</h1>
      <p className="text-muted-foreground">
        This will create one test user per role. All passwords: <code className="bg-muted px-2 py-1 rounded">123456789</code>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Test Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TEST_USERS.map((user) => (
            <div key={user.email} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email} — <span className="font-mono text-xs">{user.role}</span></p>
              </div>
              <div>
                {statuses[user.email] === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                {statuses[user.email] === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                {statuses[user.email] === "error" && <XCircle className="h-5 w-5 text-destructive" />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={createAll} disabled={running} size="lg" className="w-full">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            Creating users...
          </>
        ) : (
          "Create All Test Users"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        ⚠️ Note: Role assignment requires admin privileges. You may need to manually assign the first admin role, then re-run for the rest.
      </p>
    </div>
  );
}
