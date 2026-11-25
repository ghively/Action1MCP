# Action1 API Documentation & Integration Guide

The official reference is Action1's interactive API documentation at
https://app.action1.com/apidocs/ (OpenAPI 3.1). This file doesn't copy it.
It keeps short integration notes in our own words, with links to Action1's
pages for the details.

**API base URLs by region:**

- North America: `https://app.action1.com/api/3.0`
- Europe: `https://app.eu.action1.com/api/3.0`
- Australia: `https://app.au.action1.com/api/3.0`

**Auth in one line:** exchange the Client ID and Client Secret generated in the
Action1 console for an access token, then send `Authorization: Bearer <token>`
on every call. See [API Authentication](https://www.action1.com/api-documentation/authentication/).

---

# Action1 API Integration: Best Practices & Tips

## Authentication
- Action1 uses OAuth 2.0 for all API calls.
- Generate your API credentials (client ID/secret) from Action1 console under Users & API Credentials.
- Use the token returned in all calls as an Authorization header: `Authorization: Bearer <JWT-TOKEN>`
  - Example (curl): 
    ```bash
    curl -XGET -H "Authorization: Bearer <JWT-TOKEN>" https://app.action1.com/api/3.0/organizations
    ```

## Regions & Endpoints
- Available endpoints for global, EU, and AU regions. Choose the closest for performance and data residency needs.

## Supported Operations
- **GET**: retrieve resources
- **POST**: create resources
- **PATCH**: modify resources
- **DELETE**: remove resources

## Capabilities
- Endpoint management, user management, reports, automation, software repository, patch management, vulnerabilities, and more.
- Scriptable via [PSAction1 PowerShell Module](https://www.action1.com/psaction1/)

## Best Practices
- Assign the minimum required roles to API credentials for security.
- Rotate API credentials regularly.
- Log and monitor API usage.
- Whitelist Action1 cloud IPs in your firewall for connectivity.

## Troubleshooting
- Reports may take time to run for large orgs – fetch errors through logs API.
- Network/firewall issues may block calls; open ports 22543 and 443 (and 22551 for inbound remote control).
- Antivirus can block agent/scripts—allowlist Action1 files and folders as recommended.

## Common Integration Scenarios
- Pull reports/data for use in analytics dashboards.
- Automate patch/deployment tasks.
- Sync endpoint inventory with another ITSM platform.
- Monitor vulnerabilities and automate risk mitigation via automations/alerts.

## References
- [API Docs Overview](https://www.action1.com/api-documentation/)
- [API Authentication](https://www.action1.com/api-documentation/authentication/)
- [Action1 REST API](https://www.action1.com/action1-rest-api/)
- [PSAction1 PowerShell Module](https://www.action1.com/psaction1/)
- [Troubleshooting Tips](https://www.action1.com/documentation/troubleshooting/)


