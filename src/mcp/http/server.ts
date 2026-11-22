import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  localhostHostValidation,
  localhostOriginValidation,
  NodeStreamableHTTPServerTransport,
} from "@modelcontextprotocol/node";
import { createSecretariaServer } from "../adapters/create-server.ts";

const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

/**
 * Sobe o servidor MCP via Streamable HTTP em http://127.0.0.1:<porta>/mcp.
 * Com `port = 0`, o sistema escolhe uma porta livre.
 *
 * Os dados (agenda e emails) ficam nos mocks em memória deste processo, então
 * duram enquanto ele estiver rodando, não importa quantos clientes conectem.
 */
export async function startHttpServer(port = 0) {
  const httpServer = createServer(async (req, res) => {
    // Só aceita requisições locais: protege contra sites tentando acessar o
    // servidor pelo navegador (DNS rebinding)
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;

    if (req.url !== "/mcp") {
      res.writeHead(404).end();
      return;
    }

    try {
      // Modo stateless: um McpServer e um transporte por requisição. Isso é
      // barato, e o estado continua compartilhado porque vive nos mocks.
      const server = createSecretariaServer();
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      res.on("close", () => {
        void transport.close();
        void server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Erro no servidor MCP:", error);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  // Escuta só no loopback: o servidor não fica visível para a rede
  await new Promise<void>((resolve) =>
    httpServer.listen(port, "127.0.0.1", resolve),
  );

  const { port: actualPort } = httpServer.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${actualPort}/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.closeAllConnections();
        httpServer.close(() => resolve());
      }),
  };
}

// Rodando este arquivo direto (pnpm mcp:http), o servidor sobe sozinho
if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3333);
  const { url } = await startHttpServer(port);
  console.error(`Servidor MCP da secretária rodando em ${url}`);
}
