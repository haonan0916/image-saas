import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TestI18nPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          {locale === 'zh' ? "国际化功能测试" : "Internationalization Test"}
        </h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {locale === 'zh' ? "当前语言: 中文" : "Current Language: English"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 通用词汇 */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? "通用词汇" : "Common Terms"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "加载中" : "Loading"}:</span>
              <span>dict.common.loading</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? dict.common.error : dict.common.error}:</span>
              <span>dict.common.error</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? dict.common.success : dict.common.success}:</span>
              <span>dict.common.success</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? dict.common.save : dict.common.save}:</span>
              <span>dict.common.save</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? dict.common.delete : dict.common.delete}:</span>
              <span>dict.common.delete</span>
            </div>
          </CardContent>
        </Card>

        {/* 导航 */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? "导航" : "Navigation"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "仪表板" : "Dashboard"}:</span>
              <span>dict.navigation.dashboard</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "管理" : "Admin"}:</span>
              <span>dict.navigation.admin</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "设置" : "Settings"}:</span>
              <span>dict.navigation.settings</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "退出登录" : "Logout"}:</span>
              <span>dict.navigation.logout</span>
            </div>
          </CardContent>
        </Card>

        {/* 聊天 */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? "聊天功能" : "Chat Features"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "标题" : "Title"}:</span>
              <span>dict.chat.title</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "占位符" : "Placeholder"}:</span>
              <span>dict.chat.placeholder</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? dict.chat.send : "Send"}:</span>
              <span>dict.chat.send</span>
            </div>
          </CardContent>
        </Card>

        {/* 知识库 */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? "知识库" : "Knowledge Base"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "标题" : "Title"}:</span>
              <span>dict.rag.title</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "管理后台" : "Admin Panel"}:</span>
              <span>dict.rag.admin</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{locale === 'zh' ? "上传文档" : "Upload Document"}:</span>
              <span>dict.rag.upload</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-muted-foreground">
        <p>
          {locale === 'zh' 
            ? "使用右上角的语言切换器来测试不同语言之间的切换。" 
            : "Use the language switcher in the top-right corner to test switching between languages."
          }
        </p>
      </div>
    </div>
  );
}