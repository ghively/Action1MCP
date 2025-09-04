# Action1 API Documentation & Integration Guide

OAS  
3.1
-------------------------------------
This specification defines Action1 RESTful API for integrations. With this API, you can query managed endpoints, list vulnerabilities and missing updates, generate reports, create and launch automations and more. Use this API to integrate your applications with Action1. For simplified API scripting experience, we recommend using [PSAction1](https://www.action1.com/psaction1/)

[Terms of service](https://www.action1.com/terms-of-use/)[Action1 Support  
- Website](https://app.action1.com/support)Servers<select aria-haspopup="menu" value="https://app.action1.com/api/3.0" node="2848"><menu><option selected="" node="3118">https://app.action1.com/api/3.0</option><option node="3120">API - Global: North America</option><option node="3123">https://app.eu.action1.com/api/3.0 - Europe</option><option node="3126">https://app.au.action1.com/api/3.0 - Australia</option></menu></select>Authorize

### [OAuth 2.0](https://app.action1.com/apidocs/#/OAuth%202.0)

Authorize API calls with API credentials (Client ID and Client Secret) generated in Action1 console. After executing the authentication request, extract the 'access\_token' from its response and pass it as a header ('Authorization: Bearer access\_token') in every subsequent API call. If you use this API documentation system to interact with the API, click the Authorize button at the top, and provide the Client ID and Client Secret to generate tokens automatically.

...truncated for demonstration

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


