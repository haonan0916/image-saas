/**
 * 平台 Agent Tools 索引
 * 所有自定义工具的统一导出
 */

// 文件管理工具
export { saveFileTool } from "./uploadFile";
export { searchFilesTool } from "./searchFiles";
export { deleteFileTool } from "./deleteFile";
export { listRecentImagesTool } from "./listRecentImages";

// 应用管理工具
export { listApplicationsTool } from "./listApplications";
export { createApplicationTool } from "./createApplication";
export { changeAppStorageTool } from "./changeAppStorage";

// 存储管理工具
export { listStoragesTool } from "./listStorages";

// 知识库工具
export { searchKnowledgeTool } from "./searchKnowledge";

// 任务处理工具
export { createDehazeTaskTool } from "./createDehazeTask";
