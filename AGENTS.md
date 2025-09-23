# Repository Guidance

## Coding Principles
- Prefer strong typing throughout the codebase. When working in TypeScript or other typed languages, enable and respect strict compiler settings, and add explicit types where inference would be ambiguous.
- Favor semantic CSS class names that convey component intent and structure rather than visual appearance alone.
- Write tests where appropriate. Avoid mocking critical business logic unless interacting with components that are impractical to test directly (e.g., external databases or heavyweight libraries such as Whisper).
- When adding new functionality, include tests that exercise the real code paths whenever feasible; keep mocking to the minimum necessary to make the tests reliable.
- When extracting or adding primitive UI components, ensure they encapsulate their default styling and behaviors. Prefer purposeful props over requiring every call site to re-specify base class names or configuration that should live inside the primitive.

## Documentation Expectations
- Treat `SPEC.md` as the authoritative reference for the product. When adding, modifying, or removing functionality, make corresponding updates (even small ones) so the specification stays current.
- Ensure every meaningful configuration option is represented in the project's configuration files and documented in `docs/configuration.md`.

## Workflow Notes
- Follow repository-specific instructions in nested `AGENTS.md` files if present; their scope applies to the directory in which they reside and its descendants.
- Run all required project checks and tests after making changes.
- Before publishing a change for review, run the full automated test suite locally and confirm it passes without failures.
- Keep the working tree clean by committing meaningful changes with clear messages.
- Keep marketing language out of project documentation. Do not add unnecessary emoji or self-promotional content to `README.md` or related docs when describing the tech stack.
- Before finalizing any suggested changes, run `git pull` to ensure the local branch is synchronized with the remote repository.
- Include at least one screenshot in every pull request description. Capture it with the `browser_container` tool when the change affects the UI; otherwise provide a relevant static view. When a pull request adds or modifies demo/screenshot fixtures or otherwise prepares specific UI states, include a browser-based capture of the web UI that demonstrates the scenario, even if the code changes live exclusively in the backend. Example: if you only adjust demo seed data for a conversation list, still start the app and attach a screenshot that shows the seeded conversations rendered in the interface.
- Use `./start-screenshot.sh` when preparing captures. The script delegates to `start-app.sh` with screenshot fixtures and enables a passthrough transcriber so Whisper models are never downloaded in this environment.
- Push back on requests that would substantially bloat complexity or pull the product away from its defined purpose.
