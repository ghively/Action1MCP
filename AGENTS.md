# Repository Guidelines

## Project Structure & Module Organization
- Docs live at the repository root. Key files:
  - `README.md`: project overview and entry point.
  - `Action1_API_Documentation.md`: primary API reference.
  - `Action1_API_Agent_Installation_Offline_Reference.md`: offline agent install guide.
  - `APIinfo.md`: supplemental API notes.
- New documents: add Markdown files at the root alongside existing docs. If adding a larger set of pages, propose a `docs/` folder in your PR and describe the layout.

## Build, Test, and Development Commands
- Build: none required (Markdown-only repository).
- Preview: use your editor’s Markdown preview (e.g., VS Code).
- Optional lint (if installed locally): `markdownlint **/*.md`
- Optional format (if installed): `prettier --write "**/*.md"`
- Optional link check: `markdown-link-check Action1_API_Documentation.md`

## Coding Style & Naming Conventions
- Headings: use clear, descriptive titles; document titles in Title Case, section headings in sentence case.
- Lists: `-` for bullets; 2-space indentation for nested items.
- Code blocks: use fenced blocks with a language tag (e.g., ```bash, ```json).
- File names: `Title_Case_With_Underscores.md` (e.g., `Action1_API_Documentation.md`).
- Prose: concise, instructional tone; prefer active voice; wrap lines around ~100 characters.
- Links: prefer relative repo paths for cross-references.

## Testing Guidelines
- Render Markdown locally to verify headings, lists, tables, and code blocks.
- Run optional linters/formatters and resolve warnings.
- Validate links (internal and external). Keep examples runnable; include expected output when relevant.
- Use placeholders for secrets and environment-specific values.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits when possible (e.g., `docs: clarify auth scopes`).
- Keep changes focused; write meaningful messages describing what and why.
- Pull requests: include a clear summary, motivation, and scope; link related issues.
- Provide screenshots or sample output for notable documentation changes.
- Note breaking changes or required follow-up actions in the PR description.

## Security & Configuration Tips
- Never commit secrets or real tokens. Use placeholders like `<API_TOKEN>`.
- Redact customer or sensitive data; use synthetic examples.
- If adding configuration, include a minimal `CONFIG.example` or notes in `README.md`.

