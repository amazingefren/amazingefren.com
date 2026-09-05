export interface DeliveryBinding {
  id: string;
  scope: "required";
  status: "declared" | "implemented";
  directory: string;
  testsDirectory: string;
  implementation: string | null;
  tests: readonly string[];
  surface:
    | { kind: "http"; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string }
    | { kind: "mcp-tool"; name: string; description: string; readOnly: boolean }
    | { kind: "mcp-resource"; uriTemplate: string; mimeType: string }
    | { kind: "feed"; format: "rss" | "atom"; path: string; fullText: boolean; itemId: string; updatedAt: string }
    | { kind: "export"; format: "markdown" | "json" | "offline-bundle"; path: string }
    | { kind: "cli"; command: string; output: "json" | "text" }
    | { kind: "mirror"; network: "onion" | "ipfs"; publicOnly: true; localAssets: true };
}
