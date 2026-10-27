---
description: AI SDLC project configuration. Read by every prompt to determine workflow mode, ticketing provider, integration branch, production branch, and service credentials.
alwaysApply: true
---

# AI SDLC — Project Configuration

## Workflow

workflow: sdlc

## Core Settings

ticketing: github-issues
branch_base: main # integration — feature PRs merge here
production_branch: main # production — releases, hotfixes, tags

## GitHub

owner: datum-cloud
repo: cloud-portal
github_access: gh # mcp (GitHub MCP server) or gh (gh CLI)

## GitHub Issues

github_username: mattdjenkinson
