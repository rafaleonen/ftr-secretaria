import { McpServer } from "@modelcontextprotocol/server";
import { registerCalendarTools } from "../tools/calendar.ts";
import { registerEmailTools } from "../tools/email.ts";

// Cria um servidor MCP com todas as tools da secretária. Usado tanto pelo
// transporte stdio (stdio/server.ts) quanto pelo HTTP (http/server.ts).
export function createSecretariaServer() {
  const server = new McpServer({ name: "secretaria", version: "1.0.0" });

  registerCalendarTools(server);
  registerEmailTools(server);

  return server;
}
