import { config } from "dotenv";
import pg from "pg";
import fs from "fs/promises";
import path from "path";

config({ path: ".env" });

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const sql = await fs.readFile(
      path.join(process.cwd(), "scripts/fix-knowledge-base-id.sql"),
      "utf-8"
    );

    console.log("Executing SQL...");
    const result = await client.query(sql);
    console.log("SQL executed successfully!");
    console.log("Result:", result);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
