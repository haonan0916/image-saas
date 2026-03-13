#!/usr/bin/env node

import { validateEnvironment, ENV_CONFIG } from "../config/batchProcessing";

async function startServer() {
  try {
    // 验证环境变量
    validateEnvironment();

    console.log("🚀 Starting Dehaze WebSocket Server...");
    console.log(`📡 Environment: ${ENV_CONFIG.NODE_ENV}`);
    console.log(`🔌 WebSocket Port: ${ENV_CONFIG.WEBSOCKET_PORT}`);
    console.log(`🐍 Python API URL: ${ENV_CONFIG.PYTHON_API_URL}`);

    console.log("✅ Dehaze WebSocket Server started successfully!");
    console.log(
      "📝 Note: This is a placeholder implementation. In production, you would need to install and configure a real WebSocket server.",
    );

    process.on("SIGINT", () => {
      console.log("\n🛑 Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });

    // 保持进程运行
    setInterval(() => {
      console.log(
        `📊 WebSocket server is running... (${new Date().toISOString()})`,
      );
    }, 60000); // 每分钟输出一次
  } catch (error) {
    console.error("❌ Failed to start WebSocket server:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  startServer();
}

export { startServer };
