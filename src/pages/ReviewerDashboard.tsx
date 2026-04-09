import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, FileText, ClipboardCheck,
  Send, Loader2, Eye
} from "lucide-react";

export default function ReviewerDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAr = i18n.language === "ar";

  // Fetch reviewer's requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-review-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("*, papers(title_ar, title_en, abstract_ar, abstract_en, journal_id, journals(title_ar, title_en))")
        .eq("reviewer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("review_requests")
        .update({
          status,
          response_notes: notes || null,
          responded_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-review-requests"] });
      toast.success(isAr ? "تم تحديث الرد" : "Response updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingRequests = requests.filter((r: any) => r.status === "pending");
  const activeRequests = requests.filter((r: any) => r.status === "accepted");
  const completedRequests = requests.filter((r: any) => ["completed", "declined", "cancelled"].includes(r.status));

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <h1 className="text-2xl font-bold">{isAr ? "لوحة المحكم" : "Reviewer Dashboard"}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{pendingRequests.length}</p>
            <p className="text-sm text-muted-foreground">{isAr ? "طلبات معلقة" : "Pending"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <ClipboardCheck className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{activeRequests.length}</p>
            <p className="text-sm text-muted-foreground">{isAr ? "تحكيم جارٍ" : "In Progress"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{completedRequests.length}</p>
            <p className="text-sm text-muted-foreground">{isAr ? "مكتمل" : "Completed"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              {isAr ? "طلبات تحكيم جديدة" : "New Review Requests"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((req: any) => (
              <PendingRequestCard key={req.id} request={req} isAr={isAr} onRespond={respondMutation.mutate} isPending={respondMutation.isPending} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Reviews */}
      {activeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {isAr ? "تحكيم جارٍ" : "Active Reviews"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRequests.map((req: any) => (
              <ActiveReviewCard key={req.id} request={req} isAr={isAr} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!isLoading && requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isAr ? "لا توجد طلبات تحكيم" : "No review requests yet"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PendingRequestCard({ request, isAr, onRespond, isPending }: any) {
  const [responseNotes, setResponseNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{isAr ? request.papers?.title_ar : request.papers?.title_en}</h3>
          <p className="text-sm text-muted-foreground">
            {isAr ? request.papers?.journals?.title_ar : request.papers?.journals?.title_en}
          </p>
          {request.due_date && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {isAr ? "الاستحقاق:" : "Due:"} {new Date(request.due_date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
            </p>
          )}
        </div>
        <Badge className="bg-yellow-100 text-yellow-800">{isAr ? "معلق" : "Pending"}</Badge>
      </div>
      {request.notes && (
        <p className="text-sm bg-muted p-2 rounded">{request.notes}</p>
      )}
      {showNotes && (
        <div className="space-y-2">
          <Label>{isAr ? "ملاحظات الرد" : "Response Notes"}</Label>
          <Textarea value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} rows={2} />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2"
          onClick={() => onRespond({ id: request.id, status: "accepted", notes: responseNotes })}
          disabled={isPending}
        >
          <CheckCircle className="h-4 w-4" />
          {isAr ? "قبول" : "Accept"}
        </Button>
        <Button
          variant="destructive"
          className="flex-1 gap-2"
          onClick={() => {
            if (!showNotes) { setShowNotes(true); return; }
            onRespond({ id: request.id, status: "declined", notes: responseNotes });
          }}
          disabled={isPending}
        >
          <XCircle className="h-4 w-4" />
          {isAr ? "رفض" : "Decline"}
        </Button>
      </div>
    </div>
  );
}

function ActiveReviewCard({ request, isAr }: any) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{isAr ? request.papers?.title_ar : request.papers?.title_en}</h3>
          <p className="text-sm text-muted-foreground">
            {isAr ? request.papers?.journals?.title_ar : request.papers?.journals?.title_en}
          </p>
          {request.due_date && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {isAr ? "الاستحقاق:" : "Due:"} {new Date(request.due_date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {request.papers?.file_url && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              const { data } = await supabase.storage.from("papers").createSignedUrl(request.papers.file_url, 3600);
              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
            }}
          >
            <Eye className="h-4 w-4" />
            {isAr ? "عرض الملف" : "View File"}
          </Button>
        )}
        <Link to={`/review/${request.id}`}>
          <Button size="sm" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {isAr ? "تعبئة التقرير" : "Fill Report"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
