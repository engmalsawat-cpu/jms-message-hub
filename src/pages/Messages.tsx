import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function Messages() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: threads, isLoading } = useQuery({
    queryKey: ["my-threads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*, messages(id, body, sender_id, created_at, profiles:sender_id(full_name))")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sendReply = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user!.id,
        body: replyBody,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-threads"] });
      toast.success(isAr ? "تم إرسال الرد" : "Reply sent");
      setReplyBody("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">{t("nav.messages")}</h1>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !threads?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>{isAr ? "لا توجد رسائل حالياً" : "No messages yet"}</p>
            <p className="text-sm">{isAr ? "ستظهر هنا الرسائل المرتبطة بأبحاثك" : "Messages related to your papers will appear here"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((thread: any) => {
            const isExpanded = expandedThread === thread.id;
            const messageCount = thread.messages?.length || 0;
            const lastMessage = thread.messages?.[thread.messages.length - 1];
            return (
              <Card key={thread.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedThread(isExpanded ? null : thread.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{thread.subject || (isAr ? "بدون عنوان" : "No Subject")}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {messageCount} {isAr ? "رسالة" : "messages"} · {new Date(thread.updated_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{thread.thread_type}</Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-3 pt-0">
                    {thread.messages?.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 ${msg.sender_id === user?.id ? "bg-primary/10 ms-8" : "bg-muted me-8"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{msg.profiles?.full_name || (isAr ? "مجهول" : "Unknown")}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                          </span>
                        </div>
                        <p className="text-sm">{msg.body}</p>
                      </div>
                    ))}

                    {/* Reply input */}
                    <div className="flex gap-2 pt-2">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={isAr ? "اكتب ردك..." : "Write your reply..."}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => sendReply.mutate(thread.id)}
                        disabled={!replyBody || sendReply.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
