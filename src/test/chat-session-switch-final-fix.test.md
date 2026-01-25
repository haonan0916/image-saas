# 聊天会话切换AI回复丢失最终修复测试

## 问题描述
用户在一个对话中发送消息后，在AI回复之前切换到其他对话，再返回原对话时，AI的回复直接没有了。

## 问题根源分析

### 1. React Query缓存同步问题
**原因**：
- 流式响应在后台完成，但React Query的缓存没有及时更新
- 用户切换会话时，当前会话的查询可能处于"stale"状态
- 返回会话时，显示的是旧的缓存数据，没有包含AI的回复

### 2. 缓存失效机制缺失
**原因**：
- 流式响应完成后，只更新了本地缓存，但没有触发查询失效
- 当用户返回会话时，React Query认为缓存仍然有效，不会重新获取数据

## 修复方案

### 1. 添加查询失效机制
```tsx
// 在流式响应结束时
setSessionLoading(targetSessionId, false);

// 使查询失效，确保数据是最新的
queryClient.chat.getSession.invalidate({ sessionId: targetSessionId });
```

### 2. 添加会话切换时的数据重新获取
```tsx
// 当切换到一个会话时，如果该会话正在加载，重新获取数据
useEffect(() => {
  if (currentSessionId && loadingStates.get(currentSessionId)) {
    const timer = setTimeout(() => {
      refetchCurrentSession();
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [currentSessionId, loadingStates, refetchCurrentSession]);
```

### 3. 获取refetch函数
```tsx
// 获取当前会话详情和refetch函数
const { data: sessionData, refetch: refetchCurrentSession } = trpcClientReact.chat.getSession.useQuery(
  { sessionId: currentSessionId! },
  { enabled: !!currentSessionId }
);
```

## 修复机制说明

### 1. 查询失效（Primary Fix）
- 当流式响应完成时，调用 `queryClient.chat.getSession.invalidate()`
- 这会标记该会话的缓存为"stale"
- 当用户返回会话时，React Query会自动重新获取最新数据

### 2. 主动重新获取（Backup Fix）
- 当用户切换到正在加载的会话时，延迟1秒后主动调用 `refetchCurrentSession()`
- 这是一个备用机制，确保即使查询失效没有生效，也能获取到最新数据

## 测试步骤

### 测试1：基本会话切换
1. 在会话A发送消息："请写一个长故事"
2. 立即切换到会话B
3. 等待3-5秒后返回会话A
4. **预期结果**：应该看到AI的完整回复

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

### 测试4：长时间等待
1. 在会话A发送消息
2. 切换到会话B
3. 等待很长时间（30秒以上）后返回会话A
4. **预期结果**：AI回复应该完整显示

## 预期结果
- ✅ 会话切换不会丢失AI回复
- ✅ 多会话并发处理正常
- ✅ 快速切换不影响回复完整性
- ✅ 长时间等待后回复仍然存在
- ✅ 缓存机制正确工作

## 技术细节
- 使用 `queryClient.invalidate()` 确保缓存失效
- 添加 `refetch` 函数作为备用机制
- 延迟重新获取避免过于频繁的请求
- 双重保障确保数据一致性