# 聊天会话切换时流式响应丢失修复测试

## 问题描述
当用户在一个对话中发送消息后，在AI回复期间切换到其他对话，再返回原对话时，AI的回复会丢失。

## 问题根源
1. **会话ID验证过于严格**：流式响应处理时使用 `currentSessionId` 进行验证，当用户切换会话时，`currentSessionId` 改变，导致流式响应被忽略
2. **状态清理过度**：切换会话时清理了其他会话的加载状态，导致后台处理的流式响应无法正确显示
3. **缓存更新依赖当前会话**：所有缓存更新都依赖当前显示的会话ID

## 修复方案

### 1. 保存目标会话ID
```tsx
// 修复前：使用动态的 currentSessionId
const handleSendMessage = async () => {
  // ... 使用 currentSessionId
}

// 修复后：保存发送时的会话ID
const handleSendMessage = async () => {
  const targetSessionId = currentSessionId; // 保存发送时的会话ID
  // ... 使用 targetSessionId
}
```

### 2. 基于目标会话更新缓存
```tsx
// 修复前：依赖当前会话ID
if (data.sessionId === currentSessionId) {
  queryClient.chat.getSession.setData({ sessionId: currentSessionId }, ...)
}

// 修复后：使用目标会话ID
if (data.sessionId === targetSessionId) {
  queryClient.chat.getSession.setData({ sessionId: targetSessionId }, ...)
}
```

### 3. 基于消息会话显示加载状态
```tsx
// 修复前：基于当前会话的加载状态
msg.role === "assistant" && isLoading

// 修复后：基于消息所属会话的加载状态
msg.role === "assistant" && loadingStates.get(msg.sessionId)
```

### 4. 保留后台处理状态
```tsx
// 修复前：切换会话时清理其他会话状态
setLoadingStates(prev => {
  const newMap = new Map();
  if (prev.has(currentSessionId)) {
    newMap.set(currentSessionId, prev.get(currentSessionId));
  }
  return newMap;
});

// 修复后：不清理其他会话状态，让后台处理继续
// 移除了状态清理逻辑
```

## 测试步骤

### 测试1：基本会话切换
1. 在会话A发送消息："请写一个长篇故事"
2. 立即切换到会话B
3. 等待几秒后返回会话A
4. **预期结果**：会话A应该显示AI的回复内容

### 测试2：多会话并发
1. 在会话A发送消息："解释量子物理"
2. 切换到会话B，发送消息："写一首诗"
3. 切换到会话C，发送消息："推荐几本书"
4. 依次返回查看各个会话
5. **预期结果**：所有会话都应该有完整的AI回复

### 测试3：快速切换
1. 在会话A发送消息
2. 快速在多个会话间切换（A->B->C->A->B）
3. 最终返回会话A
4. **预期结果**：会话A的AI回复应该完整显示

### 测试4：加载状态显示
1. 在会话A发送消息
2. 切换到会话B
3. 返回会话A，观察加载状态
4. **预期结果**：如果AI还在思考，应该显示"AI正在思考..."

## 预期结果
- ✅ 会话切换不会丢失AI回复
- ✅ 多个会话可以并发处理
- ✅ 加载状态正确显示在对应会话中
- ✅ 流式响应能正确更新到目标会话缓存
- ✅ 后台处理的响应不会被意外清理

## 技术细节
- 使用 `targetSessionId` 替代动态的 `currentSessionId`
- 流式响应验证基于目标会话而非当前会话
- 加载状态基于消息所属会话而非当前会话
- 移除了过度的状态清理逻辑