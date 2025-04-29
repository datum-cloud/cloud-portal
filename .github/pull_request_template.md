# Pull Request Guidelines

## Title

Write a clear, descriptive title that summarizes your changes. For example:

- "Fix login redirect loop in authentication flow"
- "Add dark mode toggle to settings page"
- "Update React and related dependencies"

## Description

Briefly describe what this PR changes and why. Focus on:

- What problem is being solved or what feature is being added
- The impact of the change
- The related issue number, if applicable (e.g., “Fixes #123” or “Closes #456”)

## Labels

Please add the appropriate label(s) to your PR:

- `bug` - For fixing bugs or issues
- `enhancement` - For new features or improvements
- `chore` - For dependency updates, refactoring, or maintenance tasks
- `changelog:highlight` - For particularly notable changes that should be featured in the changelog
- `invalid` or `changelog:ignore`– For PRs that are incorrect, unnecessary, or should not be included in the changelog (typically when closing the PR)

## AI Changelog Generation

This repository uses AI to automatically generate changelogs. To ensure accurate and meaningful changelog entries:

- Use clear, descriptive titles
- Provide comprehensive descriptions
- Add the `highlight` label for significant changes
- Keep the scope of changes focused and well-defined
