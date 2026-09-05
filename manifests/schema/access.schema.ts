export type AccessRule =
  | { kind: "public" }
  | { kind: "authenticated"; permissions: readonly string[]; ownership?: "caller" };
