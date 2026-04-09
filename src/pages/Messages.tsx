import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function Messages() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.messages")}</h1>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4" />
          <p>{isAr ? "لا توجد رسائل حالياً" : "No messages yet"}</p>
          <p className="text-sm">{isAr ? "ستظهر هنا الرسائل المرتبطة بأبحاثك" : "Messages related to your papers will appear here"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
