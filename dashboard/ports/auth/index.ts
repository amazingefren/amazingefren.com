export interface DashboardCaller {
  id: string;
  ownerId: string;
  kind: "owner" | "guest" | "service";
}

export interface DashboardAuthorizationRequest {
  operation: "dashboard.read-summary";
  permission: "dashboard.read";
  caller: DashboardCaller;
  ownerId: string;
}

export type DashboardAuthorizationResult =
  | { allowed: true; ownerId: string }
  | { allowed: false; error: { code: "forbidden" | "unauthenticated"; message: string } };

export interface DashboardAuthPort {
  authorize(request: DashboardAuthorizationRequest): Promise<DashboardAuthorizationResult>;
}
