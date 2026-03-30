import { createMcpHandler } from 'mcp-handler/next';
import { setupMcpServer } from '@/lib/mcp/server';

const handler = createMcpHandler(
  (server) => {
    setupMcpServer(server);
  },
  {},
  {
    basePath: '/api/mcp',
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
