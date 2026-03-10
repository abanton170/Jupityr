# Jupityr - Claude Code Project Context

## Project Overview

Jupityr is a multi-paradigm NLP and gamified learning platform that combines functional programming for data processing, object-oriented design for gamification, and declarative configuration for automation.

## Key Components

- **CLAUDE.md**: Project memory and instructions for Claude.
- **.claude/skills**: Reusable AI workflows for coding tasks.
- **.claude/hooks**: Guardrails and automation checks.
- **docs/**: Architecture decisions and documentation.
- **src/**: Core application modules.

## Architecture

- **Functional Core** (`jupityr/core/`): Pipelines, NLP transforms, ML transformers — pure, composable, testable.
- **OOP Gamification** (`jupityr/gamification/`): Game engine, player models, achievements — state encapsulation.
- **Declarative Config** (`jupityr/config/`): YAML/JSON corpus and automation schemas.
- **AgentForge** (`agentforge/`): AI agent orchestration framework.

## Development Guidelines

- Python 3.8+ for all backend code.
- Use `pytest` to run tests.
- Format with `black`, lint with `flake8`, type-check with `mypy`.
- Keep prompts modular and maintain clean repository structure.
- Use skills for repeated workflows.
- Document architecture decisions in `docs/decisions/`.
- Keep AI context minimal and precise.

## Build & Test

```bash
pip install -r requirements.txt
pip install -e ".[dev]"
pytest
```

## Project Structure

```
jupityr/              # Functional core (pipelines, NLP, ML)
agentforge/           # AI agent orchestration
data/                 # Sample data and corpora
examples/             # Example configurations
docs/                 # Architecture and decision docs
.claude/              # Claude Code settings, hooks, and skills
tools/                # Scripts and prompt templates
src/                  # Additional application modules
```
