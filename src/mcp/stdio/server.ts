import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createSecretariaServer } from "../adapters/create-server.ts";

const server = createSecretariaServer();

// Via stdio, o cliente (Claude Code, Claude Desktop...) inicia este processo
// e conversa com ele pelo stdin/stdout. Por isso, logs só no stderr.
await server.connect(new StdioServerTransport());

console.error("Servidor MCP da secretária rodando via stdio");
