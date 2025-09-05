/**
 * Spec Audit
 * - Sources:
 *   - Action1_API_Documentation.md:
 *     - OAuth 2.0 section (Bearer token usage)
 *     - Servers: https://app.action1.com/api/3.0 (NA), https://app.eu.action1.com/api/3.0 (EU), https://app.au.action1.com/api/3.0 (AU)
 *     - Example: GET /organizations
 *   - APIinfo.md (Section 4.x references):
 *     - Search: GET /search/{orgId}
 *     - Endpoint Management:
 *       - GET /endpoints/managed/{orgId}
 *       - GET /endpoints/managed/{orgId}/{endpointId}
 *       - PATCH /endpoints/managed/{orgId}/{endpointId}
 *       - DELETE /endpoints/managed/{orgId}/{endpointId}
 *       - POST /endpoints/managed/{orgId}/{endpointId}/move
 *       - GET /endpoints/managed/{orgId}/{endpointId}/missing-updates
 *     - Endpoint Groups:
 *       - GET/POST /endpoints/groups/{orgId}
 *       - GET/PATCH/DELETE /endpoints/groups/{orgId}/{groupId}
 *       - GET/POST /endpoints/groups/{orgId}/{groupId}/contents
 *     - Remote Sessions:
 *       - POST /endpoints/managed/{orgId}/{endpointId}/remote-sessions
 *       - GET /endpoints/managed/{orgId}/{endpointId}/remote-sessions/{sessionId}
 *     - Agent Deployment / Deployers:
 *       - GET/PATCH /endpoints/agent-deployment/{orgId}
 *       - GET /endpoints/deployers/{orgId}
 *       - GET /endpoints/deployers/{orgId}/{deployerId}
 *       - DELETE /endpoints/deployers/{orgId}/{deployerId}
 *       - GET /endpoints/deployer-installation/{orgId}/windowsEXE
 *     - Licensing: POST /license/enterprise/trial
 * - Date interpreted: 2025-09-04
 * - Ambiguities:
 *   - Detailed query parameters and exact response shapes are not fully enumerated. Pagination described as limit + next_page (cursor) in Action1_API_Agent_Installation_Offline_Reference.md.
 *   - Job/async semantics not clearly specified except remote session lookup; no general job status template confirmed.
 * - Chosen interpretations:
 *   - Pagination style: "cursor" with perPage=limit and cursorParam=next_page.
 *   - Auth scheme: OAuth2 → Bearer token via Authorization header.
 *   - Included a minimal set of resources directly cited; anything else is marked TODO.
 */

import { z } from "zod";

export type ZSchema = z.ZodTypeAny;

export type EndpointMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface EndpointDescriptor {
  path: string; // may include {orgId}, {endpointId}, etc.
  method: EndpointMethod;
  paramsSchema?: ZSchema;
  bodySchema?: ZSchema;
}

export interface ResourceDescriptor {
  list?: EndpointDescriptor;
  get?: EndpointDescriptor;
  create?: EndpointDescriptor;
  update?: EndpointDescriptor;
  delete?: EndpointDescriptor;
  subresources?: Record<string, ResourceDescriptor>;
}

export interface EndpointsSpec {
  baseUrl: string;
  auth: {
    scheme: "apiKey" | "bearer" | "basic" | "oauth2";
    header?: string;
    queryParam?: string;
    scopes?: string[];
  };
  pagination: {
    style: "page" | "cursor" | "link" | "none";
    pageParam?: string;
    perPageParam?: string;
    cursorParam?: string;
    nextField?: string;
  };
  resources: Record<string, ResourceDescriptor>;
  actions?: Record<
    string,
    {
      path: string;
      method: "POST";
      bodyShape?: ZSchema;
    }
  >;
  jobStatus?: {
    // TODO: No general job status confirmed in docs; remote session status is resource-specific.
    pathTemplate: string;
    labelField?: string;
    statusField: string;
    successValues: string[];
    failureValues: string[];
  };
}

const orgParam = z.object({ orgId: z.union([z.string(), z.number()]) });
const endpointParams = orgParam.extend({
  endpointId: z.union([z.string(), z.number()])
});
const groupParams = orgParam.extend({
  groupId: z.union([z.string(), z.number()])
});
const deployerParams = orgParam.extend({
  deployerId: z.union([z.string(), z.number()])
});

export const endpoints: EndpointsSpec = {
  baseUrl: "https://app.action1.com/api/3.0",
  auth: {
    scheme: "oauth2"
  },
  pagination: {
    style: "cursor",
    perPageParam: "limit",
    cursorParam: "next_page"
  },
  resources: {
    organizations: {
      list: { path: "/organizations", method: "GET" }
      // TODO: add get/create/update/delete when documented explicitly
    },

    // Endpoint connection status
    endpoints_status: {
      list: { path: "/endpoints/status/{orgId}", method: "GET", paramsSchema: orgParam }
    },

    // Endpoint Management
    endpoints: {
      list: { path: "/endpoints/managed/{orgId}", method: "GET", paramsSchema: orgParam },
      get: { path: "/endpoints/managed/{orgId}/{endpointId}", method: "GET", paramsSchema: endpointParams },
      update: {
        path: "/endpoints/managed/{orgId}/{endpointId}",
        method: "PATCH",
        paramsSchema: endpointParams,
        bodySchema: z.record(z.string(), z.unknown())
      },
      delete: { path: "/endpoints/managed/{orgId}/{endpointId}", method: "DELETE", paramsSchema: endpointParams },
      subresources: {
        // Some responses reference a "/general" subresource. Add it explicitly for clarity.
        general: {
          get: { path: "/endpoints/managed/{orgId}/{endpointId}/general", method: "GET", paramsSchema: endpointParams }
        },
        missingUpdates: {
          list: { path: "/endpoints/managed/{orgId}/{endpointId}/missing-updates", method: "GET", paramsSchema: endpointParams }
        },
        remoteSessions: {
          get: {
            path: "/endpoints/managed/{orgId}/{endpointId}/remote-sessions/{sessionId}",
            method: "GET",
            paramsSchema: endpointParams.extend({ sessionId: z.union([z.string(), z.number()]) })
          },
          update: {
            path: "/endpoints/managed/{orgId}/{endpointId}/remote-sessions/{sessionId}",
            method: "PATCH",
            paramsSchema: endpointParams.extend({ sessionId: z.union([z.string(), z.number()]) }),
            bodySchema: z.record(z.string(), z.unknown())
          }
        }
      }
    },

    // Endpoint Groups
    endpoint_groups: {
      list: { path: "/endpoints/groups/{orgId}", method: "GET", paramsSchema: orgParam },
      create: {
        path: "/endpoints/groups/{orgId}",
        method: "POST",
        paramsSchema: orgParam,
        bodySchema: z
          .object({
            name: z.string().min(1)
            // TODO: add other group properties when specified
          })
          .passthrough()
      },
      get: { path: "/endpoints/groups/{orgId}/{groupId}", method: "GET", paramsSchema: groupParams },
      update: {
        path: "/endpoints/groups/{orgId}/{groupId}",
        method: "PATCH",
        paramsSchema: groupParams,
        bodySchema: z.record(z.string(), z.unknown())
      },
      delete: { path: "/endpoints/groups/{orgId}/{groupId}", method: "DELETE", paramsSchema: groupParams },
      subresources: {
        contents: {
          list: { path: "/endpoints/groups/{orgId}/{groupId}/contents", method: "GET", paramsSchema: groupParams },
          create: {
            path: "/endpoints/groups/{orgId}/{groupId}/contents",
            method: "POST",
            paramsSchema: groupParams,
            bodySchema: z
              .object({
                // TODO: confirm exact add/remove structure from docs
                add: z.array(z.union([z.string(), z.number()])).optional(),
                remove: z.array(z.union([z.string(), z.number()])).optional()
              })
              .passthrough()
          }
        }
      }
    },

    // Search (organization-scoped)
    search: {
      list: { path: "/search/{orgId}", method: "GET", paramsSchema: orgParam }
    },

    // Agent Deployment
    agent_deployment: {
      get: { path: "/endpoints/agent-deployment/{orgId}", method: "GET", paramsSchema: orgParam },
      update: {
        path: "/endpoints/agent-deployment/{orgId}",
        method: "PATCH",
        paramsSchema: orgParam,
        bodySchema: z.record(z.string(), z.unknown())
      }
    },
    // Agent installation URL retrieval
    agent_installation: {
      get: {
        path: "/endpoints/agent-installation/{orgId}/{installType}",
        method: "GET",
        paramsSchema: orgParam.extend({ installType: z.string() })
      }
    },
    deployers: {
      list: { path: "/endpoints/deployers/{orgId}", method: "GET", paramsSchema: orgParam },
      get: { path: "/endpoints/deployers/{orgId}/{deployerId}", method: "GET", paramsSchema: deployerParams },
      delete: { path: "/endpoints/deployers/{orgId}/{deployerId}", method: "DELETE", paramsSchema: deployerParams }
    },

    // Deployer installation links
    deployer_installation_windows: {
      list: { path: "/endpoints/deployer-installation/{orgId}/windowsEXE", method: "GET", paramsSchema: orgParam }
    }
  },

  actions: {
    move_endpoint: {
      path: "/endpoints/managed/{orgId}/{endpointId}/move",
      method: "POST",
      bodyShape: z.object({ targetOrgId: z.union([z.string(), z.number()]) })
    },
    initiate_remote_session: {
      path: "/endpoints/managed/{orgId}/{endpointId}/remote-sessions",
      method: "POST",
      bodyShape: z.object({}).passthrough() // TODO: confirm required payload
    },
    license_enterprise_trial: {
      path: "/license/enterprise/trial",
      method: "POST",
      bodyShape: z.object({}).passthrough() // TODO: confirm payload fields
    }
  }
};

export type Endpoints = typeof endpoints;

export function interpolatePath(
  template: string,
  params: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key];
    if (v === undefined) {
      throw new Error(`Missing path param: ${key}`);
    }
    return encodeURIComponent(String(v));
  });
}
