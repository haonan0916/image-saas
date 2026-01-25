import { batchTaskProcessor, BatchProgress } from '../services/batchTaskProcessor';

// 简化的 WebSocket 接口定义（避免依赖 ws 包）
interface SimpleWebSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  terminate(): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

interface SimpleWebSocketServer {
  on(event: string, listener: (...args: unknown[]) => void): void;
  close(): void;
}

interface ClientConnection {
  ws: SimpleWebSocket;
  userId: string;
  appId: string;
  subscribedTasks: Set<string>;
  subscribedBatches: Set<string>;
  lastPing: number;
}

export class DehazeWebSocketServer {
  private wss: SimpleWebSocketServer | null = null;
  private clients: Map<SimpleWebSocket, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    // 在实际项目中，这里应该初始化真正的 WebSocket 服务器
    // 现在我们只是创建一个占位符实现
    console.log(`Dehaze WebSocket server would start on port ${port}`);
    
    this.setupEventHandlers();
    this.startHeartbeat();

    console.log(`Dehaze WebSocket server started on port ${port}`);
  }

  private setupEventHandlers(): void {
    // 监听批量任务处理器事件
    batchTaskProcessor.on('progress', this.handleBatchProgress.bind(this));
    batchTaskProcessor.on('batchCompleted', this.handleBatchCompleted.bind(this));
    batchTaskProcessor.on('batchCancelled', this.handleBatchCancelled.bind(this));
  }

  private handleConnection(ws: SimpleWebSocket): void {
    console.log('New WebSocket connection');

    ws.on('message', (data: unknown) => {
      try {
        const buffer = data as Buffer;
        const message = JSON.parse(buffer.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error: unknown) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // 发送连接确认
    this.sendMessage(ws, {
      type: 'connected',
      data: { message: 'WebSocket connected successfully' },
    });
  }

  private handleMessage(ws: SimpleWebSocket, message: Record<string, unknown>): void {
    const client = this.clients.get(ws);

    switch (message.type) {
      case 'auth':
        this.handleAuth(ws, message.data as { userId: string; appId: string });
        break;

      case 'ping':
        this.handlePing(ws);
        break;

      case 'subscribe_task':
        if (client && message.data && typeof message.data === 'object') {
          const data = message.data as { taskId: string };
          this.handleSubscribeTask(client, data.taskId);
        }
        break;

      case 'unsubscribe_task':
        if (client && message.data && typeof message.data === 'object') {
          const data = message.data as { taskId: string };
          this.handleUnsubscribeTask(client, data.taskId);
        }
        break;

      case 'subscribe_batch':
        if (client && message.data && typeof message.data === 'object') {
          const data = message.data as { batchId: string };
          this.handleSubscribeBatch(client, data.batchId);
        }
        break;

      case 'unsubscribe_batch':
        if (client && message.data && typeof message.data === 'object') {
          const data = message.data as { batchId: string };
          this.handleUnsubscribeBatch(client, data.batchId);
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleAuth(ws: SimpleWebSocket, data: { userId: string; appId: string }): void {
    const { userId, appId } = data;

    if (!userId || !appId) {
      this.sendError(ws, 'Missing userId or appId');
      return;
    }

    // 创建客户端连接记录
    const client: ClientConnection = {
      ws,
      userId,
      appId,
      subscribedTasks: new Set(),
      subscribedBatches: new Set(),
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);

    this.sendMessage(ws, {
      type: 'authenticated',
      data: { userId, appId },
    });

    console.log(`Client authenticated: ${userId} for app ${appId}`);
  }

  private handlePing(ws: SimpleWebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      client.lastPing = Date.now();
      this.sendMessage(ws, {
        type: 'pong',
        data: { timestamp: Date.now() },
      });
    }
  }

  private handleSubscribeTask(client: ClientConnection, taskId: string): void {
    client.subscribedTasks.add(taskId);
    console.log(`Client ${client.userId} subscribed to task ${taskId}`);
  }

  private handleUnsubscribeTask(client: ClientConnection, taskId: string): void {
    client.subscribedTasks.delete(taskId);
    console.log(`Client ${client.userId} unsubscribed from task ${taskId}`);
  }

  private handleSubscribeBatch(client: ClientConnection, batchId: string): void {
    client.subscribedBatches.add(batchId);
    
    // 发送当前批次进度（如果存在）
    const progress = batchTaskProcessor.getBatchProgress(batchId);
    if (progress) {
      this.sendMessage(client.ws, {
        type: 'batch_progress',
        data: progress,
      });
    }

    console.log(`Client ${client.userId} subscribed to batch ${batchId}`);
  }

  private handleUnsubscribeBatch(client: ClientConnection, batchId: string): void {
    client.subscribedBatches.delete(batchId);
    console.log(`Client ${client.userId} unsubscribed from batch ${batchId}`);
  }

  private handleDisconnection(ws: SimpleWebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      console.log(`Client ${client.userId} disconnected`);
      this.clients.delete(ws);
    }
  }

  private handleBatchProgress(progress: BatchProgress): void {
    // 向订阅了该批次的客户端发送进度更新
    this.clients.forEach((client) => {
      if (client.subscribedBatches.has(progress.batchId)) {
        this.sendMessage(client.ws, {
          type: 'batch_progress',
          data: progress,
        });
      }
    });
  }

  private handleBatchCompleted(data: Record<string, unknown>): void {
    const batchId = data.batchId as string;
    const taskId = data.taskId as string;
    const success = data.success as boolean;

    // 向订阅了该批次的客户端发送完成通知
    this.clients.forEach((client) => {
      if (client.subscribedBatches.has(batchId)) {
        this.sendMessage(client.ws, {
          type: success ? 'batch_completed' : 'batch_failed',
          data: { batchId, taskId, ...data },
        });
      }
    });
  }

  private handleBatchCancelled(data: Record<string, unknown>): void {
    const batchId = data.batchId as string;
    const taskId = data.taskId as string;

    // 向订阅了该批次的客户端发送取消通知
    this.clients.forEach((client) => {
      if (client.subscribedBatches.has(batchId)) {
        this.sendMessage(client.ws, {
          type: 'batch_cancelled',
          data: { batchId, taskId },
        });
      }
    });
  }

  private sendMessage(ws: SimpleWebSocket, message: Record<string, unknown>): void {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    }
  }

  private sendError(ws: SimpleWebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { error },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      this.clients.forEach((client, ws) => {
        if (now - client.lastPing > timeout) {
          console.log(`Client ${client.userId} timed out`);
          ws.terminate();
          this.clients.delete(ws);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getClientsByApp(appId: string): ClientConnection[] {
    return Array.from(this.clients.values()).filter(client => client.appId === appId);
  }
}

// 单例实例
export const dehazeWebSocketServer = new DehazeWebSocketServer();