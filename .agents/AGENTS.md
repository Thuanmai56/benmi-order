# Project Rules & Guidelines

This file defines project-specific rules, guidelines, and context for AI agents working on the **Benmi Order** codebase.

## Tech Stack
- **Frontend**: Vanilla HTML/JS, styled with Vanilla CSS (designed for LINE LIFF).
- **Backend**: Cloudflare Workers (`benmi-worker-official`).
- **Database/Storage**: Cloudflare KV (`ORDER_STATE` binding).

## Coding Guidelines
- **Styling**: Use Vanilla CSS for UI elements. Avoid introducing Tailwind CSS or other framework dependencies unless explicitly requested.
- **Secrets Management**: Never hardcode credentials, webhook secret tokens, or API keys in source files. Utilize Wrangler secrets or environment variables.
- **Documentation**: Keep existing code comments and docstrings intact unless directly refactoring that logic.
