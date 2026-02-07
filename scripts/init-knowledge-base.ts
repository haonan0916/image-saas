import { ragService } from "../src/server/services/ragService";
import { config } from "dotenv";

// 加载环境变量
config({ path: ".env" });

async function main() {
  console.log("Starting knowledge base initialization...");

  try {
    // 初始化系统知识
    console.log("Initializing system knowledge...");
    await ragService.initializeSystemKnowledge();
    console.log("System knowledge base initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }
}

main();
