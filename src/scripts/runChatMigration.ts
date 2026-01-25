import { db } from "../server/db/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runChatMigration() {
  try {
    console.log("开始执行聊天功能数据库迁移...");

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, "migrate-chat-tables.sql"),
      "utf8"
    );

    // 分割 SQL 语句并执行
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      console.log(`执行: ${statement.substring(0, 50)}...`);
      await db.execute(sql.raw(statement));
    }

    console.log("聊天功能数据库迁移完成！");
  } catch (error) {
    console.error("迁移失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runChatMigration().then(() => {
    console.log("迁移脚本执行完成");
    process.exit(0);
  });
}

export { runChatMigration };