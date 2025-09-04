# Action1 API – Endpoints: Agent Installation (Offline Reference)

_Last updated: 2025-09-04 21:14:00 (local)_

This offline reference compiles the most relevant publicly available information needed to authenticate against the Action1 API and understand agent installation on managed endpoints. It is intended as a handy, portable backup when the interactive API docs are unavailable.

> Note: The interactive API documentation at `https://app.action1.com/apidocs/#/Endpoints/endpoints_agent_installation` is a JavaScript application. If you need a one-to-one export of that page (with all sections expanded), you’ll need the underlying OpenAPI/Swagger specification from the service. If you can supply it, this document can be regenerated to mirror the exact “expanded” content.

---

## 1) Authentication (API access)

Action1 uses OAuth2-style credentials to obtain a bearer token. After generating API credentials in the console, exchange them for a JWT and pass it on every request.

**HTTP header**  
```
Authorization: Bearer <JWT-TOKEN>
```

**Quick test**
```bash
curl -sS -H "Authorization: Bearer $JWT" https://app.action1.com/api/3.0/organizations
```

_Reference: Action1 API docs → “Authentication”._

---

## 2) Making example calls

Once authenticated, you can call resource collections such as organizations, endpoints, software, policies and others. Responses are JSON. Use your bearer token and standard HTTP verbs.

**Example: list endpoints (illustrative)**
```bash
curl -sS -H "Authorization: Bearer $JWT"   "https://app.action1.com/api/3.0/endpoints?limit=50"
```

_Reference: “Making Example Calls.”_

---

## 3) Filtering, pagination and fields

The REST API supports common patterns to limit and refine results, including page size limits and cursor-style pagination. Some endpoints support richer filtering to return only targeted records (for example, disconnected endpoints or updates with a given severity).

**Typical knobs**  
- `limit` to control page size  
- `next_page` / `prev_page` tokens in responses for pagination  
- Endpoint-specific filters for narrowing results

_Reference: “Filtering Data.”_

---

## 4) Extended data on GETs

For certain collections, you can request additional computed or related fields beyond defaults. These enriched queries can take longer to process. Use extended fields only when you need them (for example, to include patch state alongside endpoint basics).

_Reference: “Querying Extended Data.”_

---

## 5) Agent installation overview (Windows & macOS)

The Action1 agent is the lightweight component that connects endpoints to the cloud. It runs as a Windows service (MSI) or macOS daemon (PKG). You can deploy it interactively, by script, or using your RMM/PSA tooling.

### Windows
- Download the MSI that is preconfigured for your organization from the console’s **Install Agents** flow.  
- Silent install is supported; the download URL includes your organization-specific ID.  
- After installation, the device appears under **Endpoints** in the console.

### macOS
- Download the PKG via **Install Agents** in the console.  
- Supports local install or unattended deployment scenarios.  
- After installation, the device registers in **Endpoints**.

_References: “Agent Installation → Windows” and “Agent Installation → macOS.”_

---

## 6) Practical tips

- Keep your JWT secure and rotate credentials regularly.  
- When bulk-deploying agents, prefer org-specific installers rather than generic packages.  
- For API scripts, consider the official PowerShell module and sample scripts from Action1’s public repository.  
- When querying large datasets, keep `limit` moderate and follow `next_page` cursors.

---

## Source links

- Authentication: https://www.action1.com/api-documentation/authentication/  
- Making Example Calls: https://www.action1.com/api-documentation/making-example-calls/  
- Filtering Data: https://www.action1.com/api-documentation/filtering-data/  
- Querying Extended Data: https://www.action1.com/api-documentation/querying-extended-data/  
- Agent installation (Windows): https://www.action1.com/documentation/agent-installation/adding-endpoints-manually/win/  
- Agent installation (macOS): https://www.action1.com/documentation/agent-installation/adding-endpoints-manually/macos/  
- Overview: https://www.action1.com/api-documentation/

---

## Appendix: turning the interactive API page into a file

If you need a verbatim copy of the interactive page at `app.action1.com/apidocs`, export or capture the OpenAPI/Swagger schema used by that UI, then regenerate docs from it. Many tools can transform an OpenAPI file into Markdown or a static site. Once you have the JSON or YAML, this offline doc can be rebuilt to match the expanded sections exactly.
