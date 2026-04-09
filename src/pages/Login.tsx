import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";

const QUICK_LOGINS = [
  { email: "admin@test.com", label: "Admin", color: "bg-red-100 text-red-800 hover:bg-red-200" },
  { email: "editor@test.com", label: "Editor", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { email: "managing@test.com", label: "Managing", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { email: "reviewer@test.com", label: "Reviewer", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
  { email: "researcher@test.com", label: "Researcher", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { email: "committee@test.com", label: "Committee", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
];

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(t("auth.loginError"), { description: error.message });
    } else {
      toast.success(t("auth.loginSuccess"));
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const quickLogin = async (acc: typeof QUICK_LOGINS[0]) => {
    setQuickLoading(acc.email);
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: "123456789" });
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
    setQuickLoading(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 ltr:right-4 rtl:left-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("common.appName")}</CardTitle>
          <CardDescription>{t("auth.login")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("auth.login")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="text-primary hover:underline">{t("auth.signup")}</Link>
            </p>
          </CardFooter>
        </form>

        {/* Quick Login for Testing */}
        <div className="border-t px-6 py-4">
          <p className="text-xs text-muted-foreground mb-2 text-center">🔧 Quick Login (Testing)</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_LOGINS.map((acc) => (
              <Button
                key={acc.email}
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs rounded-full ${acc.color}`}
                disabled={quickLoading !== null}
                onClick={() => quickLogin(acc)}
              >
                {quickLoading === acc.email ? "..." : acc.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
