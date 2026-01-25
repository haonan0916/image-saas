import { serviceManager } from './services/serviceManager';

let isStarted = false;

/**
 * 启动后台服务
 */
export async function startBackgroundServices(): Promise<void> {
  if (isStarted) {
    console.log('⚠️ Background services already started');
    return;
  }

  try {
    console.log('🚀 Starting background services...');
    
    // 初始化服务管理器
    await serviceManager.initialize();
    
    isStarted = true;
    console.log('✅ Background services started successfully');

    // 设置优雅关闭处理
    setupGracefulShutdown();

  } catch (error) {
    console.error('❌ Failed to start background services:', error);
    throw error;
  }
}

/**
 * 停止后台服务
 */
export async function stopBackgroundServices(): Promise<void> {
  if (!isStarted) {
    console.log('⚠️ Background services not started');
    return;
  }

  try {
    console.log('🛑 Stopping background services...');
    
    await serviceManager.shutdown();
    
    isStarted = false;
    console.log('✅ Background services stopped successfully');

  } catch (error) {
    console.error('❌ Error stopping background services:', error);
    throw error;
  }
}

/**
 * 设置优雅关闭处理
 */
function setupGracefulShutdown(): void {
  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      await stopBackgroundServices();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // 监听关闭信号
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  
  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    handleShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    handleShutdown('unhandledRejection');
  });
}

/**
 * 获取服务状态
 */
export function getServiceStatus() {
  return {
    isStarted,
    ...serviceManager.getStatus(),
  };
}