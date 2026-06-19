import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const { hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const isAdmin = hasAnyRole(["admin", "hq_admin"]);
  const queryClient = useQueryClient();

  const [roleDialogUser, setRoleDialogUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addRole = useMutation({
    mutationFn: async () => {
      if (!roleDialogUser) return;
      const { error } = await supabase.from("user_roles").insert({
        user_id: roleDialogUser.id,
        role: selectedRole as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success(isAr ? "تمت إضافة الدور" : "Role added");
      setRoleDialogUser(null);
      setSelectedRole("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success(isAr ? "تمت إزالة الدور" : "Role removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId) || [];

  const filtered = profiles?.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">{t("nav.users")}</h1>
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("auth.fullName")}</TableHead>
                    <TableHead className="text-start">{t("auth.email")}</TableHead>
                    <TableHead className="text-start">{isAr ? "الأدوار" : "Roles"}</TableHead>
                    <TableHead className="text-start">{isAr ? "تاريخ التسجيل" : "Joined"}</TableHead>
                    {isAdmin && <TableHead className="text-start w-16">{t("common.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "-"}</TableCell>
                      <TableCell dir="ltr">{p.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {getRoles(p.id).map((r) => (
                            <Badge key={r.id} variant="secondary" className="gap-1">
                              {t(`roles.${r.role}`)}
                              {isAdmin && (
                                <button onClick={() => removeRole.mutate(r.id)} className="ms-1 hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {getRoles(p.id).length === 0 && <span className="text-muted-foreground text-sm">{t("roles.researcher")}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Dialog open={roleDialogUser?.id === p.id} onOpenChange={(open) => setRoleDialogUser(open ? { id: p.id, name: p.full_name || "" } : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm"><UserPlus className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{isAr ? `إضافة دور لـ ${p.full_name}` : `Add role to ${p.full_name}`}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>{isAr ? "الدور" : "Role"}</Label>
                                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Constants.public.Enums.app_role.map((role) => (
                                        <SelectItem key={role} value={role}>{t(`roles.${role}`)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={() => addRole.mutate()} disabled={!selectedRole || addRole.isPending} className="w-full">
                                  {addRole.isPending ? t("common.loading") : t("common.confirm")}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
