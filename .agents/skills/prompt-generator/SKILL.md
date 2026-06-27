---
name: prompt-generator
description: Help the user design and generate structured, AI-optimized feature specifications (specs/prompts) for new features.
---
# Prompt & Spec Generator Skill

Use this skill when the user wants to design a new feature and needs a structured specification file (spec prompt) for the AI to read and code.

## Workflow

1. **Information Gathering**:
   - Ask clarifying questions about the feature goals, user actions, backend endpoints, database/KV requirements, and edge cases if any of these are missing.
   - If the user wants a deep interactive alignment, suggest they use the `/grill-me` command.

2. **Drafting the Spec**:
   - Format the specification using the standard Markdown AI Specification Template:
     - **Title**: Feature: [Feature Name]
     - **Context & Goal**: Summary of the problem and desired outcome.
     - **Requirements & Behavior**: Markdown checkboxes (`- [ ]`) listing clear user stories.
     - **Technical Design**: Scope of files, API request/response JSON schemas, and KV bindings.
     - **Edge Cases & Validation**: Crucial validation rules (e.g. rate limits, field validation).
     - **Verification Plan**: Exact curl commands or manual steps to test success.

3. **Output / File Writing**:
   - Write the generated specification directly into a new markdown file under `docs/specs/<feature_name>.md`.
   - Provide a clickable markdown link to the newly created specification file.
