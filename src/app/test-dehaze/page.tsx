"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DehazeDetailDialog } from "@/components/feature/DehazeDetailDialog";
import { ImageCompare } from "@/components/ui/image-compare";
import { ImageCompareDebug } from "@/components/ui/image-compare-debug";

export default function TestDehazePage() {
    const [showDialog, setShowDialog] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    // 使用不同的图片来测试对比效果
    const beforeImage = "/placeholder-image.svg";
    const afterImage = "/unknownfile.png"; // 使用不同的图片

    const handleImageError = (error: string) => {
        console.error('Image error:', error);
        setImageError(error);
    };

    return (
        <div className="container mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold">去雾功能测试页面</h1>

            {/* 图像对比组件测试 */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">图像对比组件 (调试版本)</h2>

                {imageError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        错误: {imageError}
                    </div>
                )}

                <div className="w-full max-w-4xl mx-auto">
                    <ImageCompareDebug
                        beforeImage={beforeImage}
                        afterImage={afterImage}
                        beforeLabel="去雾前"
                        afterLabel="去雾后"
                        className="h-96"
                        aspectRatio="auto"
                        onError={handleImageError}
                    />
                </div>
            </div>

            {/* 图像对比组件测试 (正常版本) */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">图像对比组件 (正常版本)</h2>

                <div className="w-full max-w-4xl mx-auto">
                    <ImageCompare
                        beforeImage={beforeImage}
                        afterImage={afterImage}
                        beforeLabel="去雾前"
                        afterLabel="去雾后"
                        className="h-96"
                        aspectRatio="auto"
                        onError={handleImageError}
                    />
                </div>

                <div className="text-sm text-muted-foreground bg-muted p-4 rounded">
                    <p><strong>调试信息:</strong></p>
                    <p>去雾前图片: {beforeImage}</p>
                    <p>去雾后图片: {afterImage}</p>
                    <p>请打开浏览器开发者工具查看控制台日志</p>
                </div>
            </div>

            {/* 简单的图片测试 */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">图片加载测试</h2>
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <div>
                        <p className="text-sm font-medium mb-2">去雾前图片:</p>
                        <img
                            src={beforeImage}
                            alt="Before"
                            className="w-full h-48 object-cover border rounded"
                            onLoad={() => console.log('Before image loaded')}
                            onError={() => console.error('Before image failed to load')}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-2">去雾后图片:</p>
                        <img
                            src={afterImage}
                            alt="After"
                            className="w-full h-48 object-cover border rounded"
                            onLoad={() => console.log('After image loaded')}
                            onError={() => console.error('After image failed to load')}
                        />
                    </div>
                </div>
            </div>

            {/* 对话框测试 */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">去雾详情对话框</h2>
                <Button onClick={() => setShowDialog(true)}>
                    打开去雾详情对话框
                </Button>

                <DehazeDetailDialog
                    taskId="test-task-id"
                    open={showDialog}
                    onOpenChange={setShowDialog}
                />
            </div>

            {/* 使用说明 */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">功能说明</h2>
                <div className="bg-muted p-6 rounded-lg space-y-4">
                    <h3 className="text-lg font-medium">图像对比组件特性：</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>响应式设计，支持桌面和移动设备</li>
                        <li>可拖拽的分割线，支持鼠标和触摸操作</li>
                        <li>实时对比去雾前后的图像效果</li>
                        <li>自动处理图片加载状态和错误</li>
                        <li>清晰的标签显示和使用提示</li>
                    </ul>

                    <h3 className="text-lg font-medium">去雾详情对话框特性：</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>多标签页设计：图像对比、任务详情、图片画廊</li>
                        <li>支持多张图片的对比查看</li>
                        <li>全屏图片查看功能</li>
                        <li>图片下载功能</li>
                        <li>任务状态和详细信息展示</li>
                        <li>响应式布局，适配不同屏幕尺寸</li>
                    </ul>

                    <h3 className="text-lg font-medium">故障排除：</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>{`如果一直显示"加载中..."，请检查图片路径是否正确`}</li>
                        <li>打开浏览器开发者工具查看控制台错误信息</li>
                        <li>确保图片文件存在于 public 目录中</li>
                        <li>检查网络连接和图片服务器状态</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}