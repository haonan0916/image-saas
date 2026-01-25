# 聊天加载状态显示修复测试

## 问题描述
在AI思考期间出现两个聊天框：
1. 第一个聊天框：空的AI消息框（不应该显示）
2. 第二个聊天框：单独的"AI正在思考"状态

这导致了重复显示和用户体验问题。

## 修复内容

### 问题根源
代码中有两个地方在显示AI思考状态：
1. 在消息列表中，空的AI消息显示光标
2. 在消息列表后面，单独的"AI正在思考"组件

### 解决方案
1. **移除重复的加载状态显示**：删除了单独的 `{isLoading && ...}` 组件
2. **优化消息内容显示逻辑**：
   - 如果消息有内容，显示内容
   - 如果是AI消息且无内容且正在加载，显示"AI正在思考"动画
   - 否则显示消息内容（可能为空）

### 代码变更
```tsx
// 修复前：两个地方显示加载状态
{msg.content}
{msg.role === "assistant" && !msg.content && isLoading && (
  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
)}

{isLoading && (
  <div className="flex gap-3 justify-start">
    {/* 单独的AI思考组件 */}
  </div>
)}

// 修复后：只在消息内容中显示
{msg.content ? (
  msg.content
) : msg.role === "assistant" && isLoading ? (
  <div className="flex items-center gap-2">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
    </div>
    <span className="text-sm text-muted-foreground">AI 正在思考...</span>
  </div>
) : (
  msg.content
)}
```

## 测试步骤

### 测试1：正常发送消息
1. 打开聊天对话框
2. 发送一条消息
3. 观察AI思考期间的显示状态
4. **预期结果**：只显示一个聊天框，包含"AI正在思考..."动画

### 测试2：快速连续发送
1. 发送第一条消息
2. 在AI回复前发送第二条消息
3. 观察两条消息的加载状态
4. **预期结果**：每条消息都只显示一个加载状态，不重复

### 测试3：切换会话
1. 在会话A发送消息
2. 立即切换到会话B
3. 在会话B发送消息
4. **预期结果**：每个会话的加载状态独立，不重复显示

## 预期结果
- ✅ 只显示一个"AI正在思考"状态
- ✅ 加载动画在消息框内显示，不是单独的框
- ✅ 没有空的聊天框
- ✅ 用户体验更加流畅和一致