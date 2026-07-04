---
name: boilerplate-skill
description: A template skill to demonstrate how custom AI skills are defined for this project.
---
# Boilerplate Skill Template

Use this skill structure to teach the AI specialized instructions, scripts, or examples for specific tasks (e.g., deployment workflows, api integrations, database schemas).

## How to Customize
1. Rename the folder `boilerplate-skill` to your skill's name (e.g., `cloudflare-deploy`).
2. Update the YAML frontmatter at the top of this file (`name` and `description`). The system uses `description` to auto-discover this skill.
3. Write your detailed markdown instructions, commands, or rules below the frontmatter.
4. You can optionally add subfolders in the skill directory:
   - `scripts/`: Helper scripts or tools.
   - `examples/`: Reference code or payloads.
   - `resources/`: Templates or static assets.
