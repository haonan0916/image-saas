# 聊天会话切换问题完整修复测试

## 问题描述
1. **加载状态丢失**：切换会话后返回时，"AI正在思考"状态没有显示
2. **数据库错误**：后端插入消息时出现UUID格式错误

## 问题根源分析

### 1. 数据库错误
```
Failed query: insert into "chat_messages" ("id", "session_id", "role", "content", "created_at") 
values ($1, $2, $3, $4, default) returning...
```

**原因**：
- 数据库schema中 `id` 字段是 `uuid` 类型
- 但代码生成的ID格式是 `${sessionId}-${Date.now()}-${randomString}`，不是标准UUID
- 导致数据库插入失败

### 2. 加载状态丢失
**原因**：
- 切换会话时，临时的AI消息被清理
- 返回会话时，虽然加载状态还在，但没有对应的空消息来显示"AI正在思考"

## 修复方案

### 1. 修复数据库ID格式
```tsx
// 修复前：自定义格式ID
const assistantMessageId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const tempUserMessage = { id: `temp-user-${Date.now()}-${targetSessionId}`, ... };
const tempAIMessageId = `temp-ai-${Date.now()}-${targetSessionId}`;

// 修复后：标准UUID
const assistantMessageId = crypto.randomUUID();
const tempUserMessage = { id: crypto.randomUUID(), ... };
const tempAIMessageId = crypto.randomUUID();
```

### 2. 动态添加加载消息
```tsx
// 在获取会话数据时，动态检查加载状态
const currentSession = sessionData ? {
  ...sessionData.session,
  messages: (() => {
    let messages = sessionData.messages || [];
    
    // 如果当前会话正在加载，且最后一条消息不是空的AI消息，则添加临时加载消息
    if (currentSessionId && loadingStates.get(currentSessionId)) {
      const lastMessage = messages[messages.length - 1];
      const hasEmptyAIMessage = lastMessage && lastMessage.role === 'assistant' && !lastMessage.content;
      
      if (!hasEmptyAIMessage) {
        const tempLoadingMessage = {
          id: `loading-${currentSessionId}`,
          sessionId: currentSessionId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };
        messages = [...messages, tempLoadingMessage];
      }
    }
    
    return messages;
  })()
} : null;
```

### 3. 更新流式响应处理
```tsx
// 处理临时加载消息的更新和替换
if (msg.id === tempAIMessageId || msg.id === `loading-${targetSessionId}`) {
  return { ...msg, id: tempAIMessageId, content: data.fullContent };
}
```

### 4. 完善错误处理
```tsx
// 清理时包括临时加载消息
messages: oldData.messages?.filter(msg =>
  msg.id !== tempUserMessage.id && 
  msg.id !== tempAIMessageId && 
  msg.id !== `loading-${targetSessionId}`
) || [],
```

## 测试步骤

### 测试1：数据库错误修复
1. 发送一条消息
2. 等待AI完整回复
3. 检查浏览器控制台和网络请求
4. **预期结果**：没有数据库插入错误

### 测试2：加载状态显示
1. 在会话A发送消息："请写一个长故事"
2. 立即切换到会话B
3. 等待2-3秒后返回会话A
4. **预期结果**：应该看到"AI正在思考..."状态

### 测试3：完整流程
1. 在会话A发送消息
2. 切换到会话B，再返回会话A（此时应该显示加载状态）
3. 等待AI完成回复
4. **预期结果**：
   - 切换回来时显示"AI正在思考..."
   - AI回复完成后显示完整内容
   - 没有错误信息

### 测试4：多会话并发
1. 在会话A发送消息
2. 切换到会话B发送消息
3. 切换到会话C发送消息
4. 依次返回查看各会话
5. **预期结果**：所有会话都正常显示加载状态和最终回复

## 预期结果
- ✅ 数据库插入不再出现UUID格式错误
- ✅ 切换会话后返回时正确显示"AI正在思考..."
- ✅ AI回复完成后正确显示内容
- ✅ 没有错误信息出现在回复中
- ✅ 多会话并发处理正常

## 技术细节
- 使用 `crypto.randomUUID()` 生成标准UUID
- 动态检查加载状态并添加临时加载消息
- 流式响应处理支持多种临时消息ID格式
- 完善的错误处理和状态清理机制