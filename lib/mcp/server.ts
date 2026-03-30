import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools';

export function setupMcpServer(server: McpServer) {
  registerTools(server);
}
