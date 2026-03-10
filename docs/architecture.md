# Jupityr Architecture

## Overview

A modular repository structure designed for building Claude Code projects with structured AI context, reusable skills, and automated development workflows.

## Multi-Paradigm Design

Jupityr uses three programming paradigms, each applied where it excels:

| Paradigm | Domain | Location |
|----------|--------|----------|
| Functional | Data pipelines, NLP, ML transforms | `jupityr/core/` |
| Object-Oriented | Gamification, player models, UI | `jupityr/gamification/` |
| Declarative | Corpus config, automation rules | `jupityr/config/` |

## Module Map

- **jupityr/core/pipelines/** — Functional pipeline infrastructure (compose, pipe, Pipeline)
- **jupityr/core/nlp/** — Pure NLP transformations (tokenize, normalize, stem)
- **jupityr/core/ml/** — Functional ML feature engineering
- **jupityr/gamification/** — OOP game engine with events, achievements, progression
- **jupityr/config/** — YAML/JSON schema loaders and validators
- **agentforge/** — AI agent orchestration framework

## Design Principles

1. Prefer pure functions over stateful operations
2. Use composition over inheritance
3. Embrace immutability — return new data, don't mutate
4. Separate concerns with declarative configuration
5. Keep AI context minimal and precise
