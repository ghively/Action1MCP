# The Hub (Concept Docs)

This folder contains conceptual documentation for a future "Hub" middleware that unifies multiple MCP "Core" servers (like this Action1 Core) behind a single client connection. No middleware code is included here.

- HUB_CONCEPT.md: full concept, best practices, and an integration guide for managing many Cores.
- hubprompt.md: a ready-to-use LLM prompt to plan the Hub at a later date using these docs.

See the main repository README for Core details. The Hub should remain thin: process management, namespacing, routing/policy, and observability — while each Core keeps API-specific logic.

