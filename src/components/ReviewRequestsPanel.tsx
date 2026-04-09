import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Clock, CheckCircle, XCircle, FileCheck, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

interface Props {
  paperId: string;
  journalId: string;
}

export function ReviewRequestsPanel({ paperId, journalId }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAr = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["review-requests", paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("*, profiles:reviewer_id(full_name, email)")
        .eq("paper_id", paperId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", reviewerEmail)
        .single();
      if (pErr) throw new Error(isAr ? "لم يتم العثور على المحكم" : "Reviewer not found");

      const { error } = await supabase.from("review_requests").insert({
        paper_id: paperId,
        reviewer_id: profile.id,
        requested_by: user!.id,
        due_date: dueDate || null,
        notes: notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-requests", paperId] });
      toast.success(isAr ? "تم إرسال طلب التحكيم" : "Review request sent");
      setOpen(false);
      setReviewerEmail("");
      setDueDate("");
      setNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("review_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-requests", paperId] });
      toast.success(isAr ? "تم إلغاء الطلب" : "Request cancelled");
    },
  });

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = isAr
      ? { pending: "معلق", accepted: "مقبول", declined: "مرفوض", completed: "مكتمل", cancelled: "ملغى", expired: "منتهي" }
      : { pending: "Pending", accepted: "Accepted", declined: "Declined", completed: "Completed", cancelled: "Cancelled", expired: "Expired" };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="gap-2 flex items-center">
          <FileCheck className="h-5 w-5" />
          {isAr ? "طلبات التحكيم" : "Review Requests"}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              {isAr ? "إرسال طلب تحكيم" : "Send Review Request"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? "إرسال طلب تحكيم جديد" : "Send New Review Request"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendRequest.mutate(); }}>
              <div className="space-y-2">
                <Label>{isAr ? "البريد الإلكتروني للمحكم" : "Reviewer Email"}</Label>
                <Input type="email" dir="ltr" value={reviewerEmail} onChange={(e) => setReviewerEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "ملاحظات للمحكم" : "Notes for Reviewer"}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={!reviewerEmail || sendRequest.isPending}>
                {sendRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isAr ? "إرسال الطلب" : "Send Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{isAr ? "لا توجد طلبات تحكيم" : "No review requests"}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{req.profiles?.full_name || req.profiles?.email}</p>
                  <div className="flex gap-2 items-center text-sm text-muted-foreground">
                    <Badge className={statusColors[req.status]}>{statusLabel(req.status)}</Badge>
                    {req.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.due_date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                      </span>
                    )}
                  </div>
                  {req.response_notes && (
                    <p className="text-sm text-muted-foreground mt-1">{req.response_notes}</p>
                  )}
                </div>
                {req.status === "pending" && (
                  <Button variant="ghost" size="sm" onClick={() => cancelRequest.mutate(req.id)}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
