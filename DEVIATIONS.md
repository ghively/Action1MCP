# Deviations Log

| timestamp | context | original_plan | deviation | reason | files_changed | impact |
|---|---|---|---|---|---|---|
| 2025-09-04T00:00:00Z | Endpoint polling | Implement job polling if documented | Left `jobStatus` as TODO utility | No general job status endpoint confirmed in provided docs | src/lib/poll.ts, src/endpoints.ts | Polling waits are not enabled by default |
| 2025-09-04T00:00:00Z | Audit verification | Verify resources/actions are "used by" tools | Implemented generic tools and a light audit | Tools are generic; static usage check would be artificial | scripts/audit-endpoints.mjs | Audit prints header and counts |

