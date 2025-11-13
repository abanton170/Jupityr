# CLAUDE.md - AI Assistant Guide for Jupityr

This document provides comprehensive guidance for AI assistants (like Claude) working with the Jupityr codebase. It covers architecture, conventions, workflows, and key concepts to help AI assistants make informed decisions when contributing to the project.

## Project Overview

**Jupityr** is a multi-paradigm NLP and gamified learning platform that strategically combines:
- **Functional Programming** for data processing pipelines
- **Object-Oriented Programming** for gamification mechanics
- **Declarative Configuration** for corpus management and automation

**Key Technologies:**
- Python 3.8+ (primary backend language)
- Functional libraries: `toolz`, `funcy`
- Testing: `pytest` with coverage
- Code quality: `black`, `flake8`, `mypy`
- Configuration: YAML/JSON

**Current Version:** 0.1.0 (Alpha)

## Multi-Paradigm Architecture

### Core Philosophy

Jupityr deliberately uses **different paradigms for different purposes**. Understanding when and why each paradigm is used is critical:

#### 1. Functional Programming (Primary - Data Processing)
**Location:** `jupityr/core/`

**Use functional programming for:**
- Data transformation pipelines
- NLP text processing
- ML feature engineering
- Any stateless data operations

**Key Principles:**
- Pure functions with no side effects
- Immutability (return new data, never mutate)
- Function composition over inheritance
- Higher-order functions and currying

**Examples:**
```python
# Good: Pure function
def normalize_text(text: str) -> str:
    return ' '.join(text.lower().split())

# Bad: Mutation
def normalize_text(text: str) -> str:
    text = text.lower()  # Mutating parameter
    return text
```

**Key Files:**
- `jupityr/core/pipelines/pipeline.py` - Pipeline infrastructure
- `jupityr/core/nlp/transforms.py` - NLP transformations
- `jupityr/core/ml/transformers.py` - ML transformations

#### 2. Object-Oriented Programming (Supporting - Stateful Systems)
**Location:** `jupityr/gamification/`

**Use OOP for:**
- Game entities with identity (Player, Achievement, Challenge)
- Stateful game engine orchestration
- UI components
- Event-driven systems

**Key Principles:**
- Encapsulate state behind clear interfaces
- Use classes for entities with lifecycle
- Apply SOLID principles
- Favor composition over deep inheritance
- Use properties for controlled access

**Examples:**
```python
# Good: Encapsulated state
class Player:
    def __init__(self, player_id: str, username: str):
        self.player_id = player_id
        self._experience = 0  # Private state

    @property
    def experience(self) -> int:
        return self._experience

    def add_experience(self, amount: int) -> bool:
        self._experience += amount
        # ... check for level up
```

**Key Files:**
- `jupityr/gamification/models/player.py` - Player entity
- `jupityr/gamification/engine/game_engine.py` - Game orchestration

#### 3. Declarative Configuration (Supporting - Data Definitions)
**Location:** `jupityr/config/`

**Use declarative configs for:**
- Corpus structure definitions
- Automation rules
- Workflow specifications
- Processing pipelines configuration

**Key Principles:**
- Separate "what" from "how"
- Use dataclasses for schema definitions
- Validate with Enums and type hints
- Support both YAML and JSON
- Keep configs human-readable

**Key Files:**
- `jupityr/config/schemas/corpus_schema.py` - Corpus schema
- `jupityr/config/schemas/automation_schema.py` - Automation schema
- `jupityr/config/loader.py` - Configuration loading/validation

### Anti-Patterns to Avoid

**CRITICAL - Do NOT:**
1. ❌ Use OOP for data transformations (use functional instead)
2. ❌ Mutate state in functional code paths
3. ❌ Hardcode configurations in code (use declarative)
4. ❌ Mix paradigms within a single module
5. ❌ Create classes for stateless operations
6. ❌ Use mutable default arguments in functional code

## Directory Structure

```
jupityr/
├── core/                      # Functional core - data processing
│   ├── pipelines/            # Pipeline infrastructure (compose, pipe, curry)
│   ├── nlp/                  # NLP transformations (pure functions)
│   └── ml/                   # ML transformations (pure functions)
│
├── gamification/             # OOP components - game mechanics
│   ├── models/               # Entity models (Player, Achievement, Challenge)
│   ├── engine/               # Game engine orchestration
│   └── ui/                   # UI component classes
│
├── config/                   # Declarative configuration
│   ├── schemas/              # Schema definitions (dataclasses)
│   │   ├── corpus_schema.py
│   │   └── automation_schema.py
│   ├── rules/                # Business rules
│   └── loader.py             # Config loading and validation
│
├── frontend/                 # TypeScript/React UI (future)
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── utils/                    # Shared utilities
├── tests/                    # Test suites (pytest)
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── __init__.py

examples/                     # Example configurations
├── corpus_example.yaml       # Sample corpus config
└── automation_example.yaml   # Sample automation rules

data/                         # Data storage (gitignored)
├── raw/                      # Raw input data
└── processed/                # Processed output data
```

## Code Conventions

### Python Style

**Formatting:**
- **Line length:** 88 characters (Black default)
- **Indentation:** 4 spaces
- **Imports:** Standard library → Third-party → Local (separated by blank lines)
- **String quotes:** Double quotes preferred for consistency

**Type Hints:**
```python
# Always use type hints for function signatures
def process_text(text: str, normalize: bool = True) -> List[str]:
    """Process text and return tokens."""
    # Implementation

# Use TypeVar for generic types
from typing import TypeVar, Callable
T = TypeVar('T')

def map_fn(func: Callable[[T], T], items: List[T]) -> List[T]:
    return [func(item) for item in items]
```

**Docstrings:**
```python
def function_name(param1: str, param2: int) -> bool:
    """
    Brief one-line description.

    More detailed explanation if needed. Explain the purpose,
    not just what the code does.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value

    Raises:
        ValueError: When param1 is empty
    """
```

### Naming Conventions

**Functions:**
- Functional code: `snake_case`, verb-based (`normalize_text`, `tokenize`)
- Pure functions should have descriptive names indicating transformation

**Classes:**
- `PascalCase` for class names (`Player`, `GameEngine`, `CorpusSchema`)
- Private attributes: `_underscore_prefix`
- Properties for controlled access

**Variables:**
- `snake_case` for variables
- Descriptive names over abbreviations
- Constants: `UPPER_SNAKE_CASE`

**Files and Modules:**
- `snake_case.py` for module names
- Match primary class/function name when possible

### Import Patterns

```python
# Standard library
from typing import List, Dict, Optional
from functools import reduce
from datetime import datetime

# Third-party
import numpy as np
import yaml
from toolz import pipe, compose

# Local imports - relative within package
from .models.player import Player, Achievement
from ..core.pipelines import Pipeline
from jupityr.core.nlp.transforms import normalize_text
```

## Development Workflows

### Setting Up Development Environment

```bash
# Clone repository
git clone https://github.com/abanton170/Jupityr.git
cd Jupityr

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"

# Or install all optional dependencies
pip install -e ".[all]"
```

### Running Tests

```bash
# Run all tests with coverage
pytest

# Run specific test file
pytest jupityr/tests/test_pipelines.py

# Run with verbose output
pytest -v

# Run tests matching pattern
pytest -k "test_player"

# Generate HTML coverage report
pytest --cov=jupityr --cov-report=html
```

**Test Configuration:**
- Tests located in `jupityr/tests/`
- Use pytest fixtures for setup
- Aim for >80% code coverage
- Test names: `test_<functionality>.py`
- Test functions: `test_<specific_behavior>`

### Code Quality Tools

```bash
# Format code (run before committing)
black jupityr/

# Check formatting without changes
black --check jupityr/

# Lint code
flake8 jupityr/

# Type check
mypy jupityr/

# Run all quality checks
black jupityr/ && flake8 jupityr/ && mypy jupityr/ && pytest
```

### Git Workflow

**Branch Strategy:**
- `main` - stable releases
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- AI-generated branches: `claude/claude-md-<session-id>`

**Commit Messages:**
```bash
# Format: <type>: <subject>
#
# Types: feat, fix, docs, style, refactor, test, chore

# Examples:
git commit -m "feat: add n-gram generation to NLP transforms"
git commit -m "fix: correct experience calculation in Player.add_experience"
git commit -m "docs: update ARCHITECTURE.md with new paradigm examples"
git commit -m "refactor: extract achievement checking to separate method"
git commit -m "test: add unit tests for Pipeline composition"
```

## Testing Strategy

### Testing by Paradigm

**Functional Code:**
- Focus on input/output correctness
- Use property-based testing when applicable
- Test composition behavior
- Verify immutability

```python
def test_normalize_text():
    # Test pure function behavior
    input_text = "  Hello   WORLD  "
    expected = "hello world"
    assert normalize_text(input_text) == expected

def test_pipeline_composition():
    # Test that pipelines compose correctly
    pipeline = Pipeline(normalize_text, tokenize)
    result = pipeline("Hello World")
    assert result == ['hello', 'world']
```

**OOP Code:**
- Test state transitions
- Use mocks for dependencies
- Test encapsulation boundaries
- Verify event triggers

```python
def test_player_level_up():
    player = Player("p1", "alice")
    initial_level = player.level

    # Award enough XP to level up
    leveled_up = player.add_experience(100)

    assert leveled_up is True
    assert player.level == initial_level + 1
```

**Declarative Configs:**
- Test schema validation
- Test loading/saving
- Test error handling for invalid configs

```python
def test_load_corpus_schema():
    schema = ConfigLoader.load_corpus_schema("examples/corpus_example.yaml")
    assert schema.name == "Sample NLP Corpus"
    assert len(schema.sources) > 0
```

## Common Development Tasks

### Adding a New NLP Transform

**Location:** `jupityr/core/nlp/transforms.py`

```python
# 1. Create pure function
def remove_stopwords(tokens: List[str], language: str = "en") -> List[str]:
    """Remove common stopwords from token list."""
    # Implementation should be pure - no side effects
    stopwords = get_stopwords(language)  # Also pure
    return [t for t in tokens if t not in stopwords]

# 2. Add tests in jupityr/tests/
def test_remove_stopwords():
    tokens = ["the", "cat", "is", "happy"]
    result = remove_stopwords(tokens)
    assert "the" not in result
    assert "cat" in result
```

### Adding a New Game Mechanic

**Location:** `jupityr/gamification/models/`

```python
# 1. Create OOP model
@dataclass
class PowerUp:
    """Represents a temporary boost."""
    id: str
    name: str
    effect: str
    duration: int  # seconds
    multiplier: float

# 2. Add to Player class
class Player:
    def __init__(self, player_id: str, username: str):
        # ...
        self._active_powerups: List[PowerUp] = []

    def activate_powerup(self, powerup: PowerUp) -> None:
        """Activate a powerup for this player."""
        self._active_powerups.append(powerup)
```

### Adding a Configuration Schema

**Location:** `jupityr/config/schemas/`

```python
# 1. Define schema with dataclass
@dataclass
class LearningPathSchema:
    """Schema for learning path configuration."""
    name: str
    description: str
    difficulty: int
    prerequisites: List[str] = field(default_factory=list)
    steps: List[Dict] = field(default_factory=list)

    def __post_init__(self):
        """Validate after initialization."""
        if self.difficulty < 1 or self.difficulty > 10:
            raise ValueError("Difficulty must be 1-10")

# 2. Add loader to ConfigLoader
@classmethod
def load_learning_path(cls, path: Union[str, Path]) -> LearningPathSchema:
    config = cls.load_file(path)
    return LearningPathSchema(**config)
```

### Creating a Data Pipeline

```python
from jupityr.core.pipelines import Pipeline, pipe
from jupityr.core.nlp.transforms import normalize_text, tokenize, remove_stopwords

# Method 1: Pipeline class
text_pipeline = Pipeline(
    normalize_text,
    tokenize,
    remove_stopwords
)
result = text_pipeline("Your text here")

# Method 2: pipe function
result = pipe(
    "Your text here",
    normalize_text,
    tokenize,
    remove_stopwords
)

# Method 3: compose (right to left)
from jupityr.core.pipelines import compose
processor = compose(remove_stopwords, tokenize, normalize_text)
result = processor("Your text here")
```

## Key Concepts for AI Assistants

### When Making Changes

1. **Identify the Paradigm First**
   - Is this data processing? → Functional (`jupityr/core/`)
   - Is this a stateful entity? → OOP (`jupityr/gamification/`)
   - Is this configuration? → Declarative (`jupityr/config/`)

2. **Maintain Paradigm Purity**
   - Don't add state to functional modules
   - Don't create stateless classes in OOP modules
   - Don't hardcode config values

3. **Write Tests First or Alongside**
   - Add tests for new functionality
   - Verify existing tests still pass
   - Aim for meaningful test coverage

4. **Follow Type Hints**
   - Always add type hints to new functions/methods
   - Use `mypy` to verify types
   - Generic types for reusable code

5. **Document Thoroughly**
   - Add docstrings to all public functions/classes
   - Update README.md if adding major features
   - Update ARCHITECTURE.md if changing design

### Code Review Checklist

Before suggesting code changes, verify:

- [ ] Correct paradigm used for the task
- [ ] Type hints present and accurate
- [ ] Docstrings added for public APIs
- [ ] Tests added/updated
- [ ] No mutations in functional code
- [ ] No hardcoded configurations
- [ ] Follows naming conventions
- [ ] Imports properly organized
- [ ] Code formatted with Black
- [ ] No new linting errors

### Understanding Data Flow

**Functional Pipeline Flow:**
```
Raw Text → normalize_text → tokenize → remove_stopwords → feature_extraction → Model
         (pure)           (pure)     (pure)              (pure)
```

**OOP Game Flow:**
```
User Action → GameEngine.method() → Player.update() → State Change → Event Trigger
                                   (encapsulated)
```

**Declarative Execution Flow:**
```
YAML Config → ConfigLoader.load() → Schema Validation → Object Creation → Execution
```

## Important Files Reference

### Must-Read Files

1. **`ARCHITECTURE.md`** - Deep dive into multi-paradigm philosophy
2. **`README.md`** - User-facing documentation and examples
3. **`pyproject.toml`** - Build configuration, tool settings
4. **`setup.py`** - Package installation, dependencies

### Core Implementation Files

**Functional Core:**
- `jupityr/core/pipelines/pipeline.py` - Pipeline composition primitives
- `jupityr/core/nlp/transforms.py` - NLP text transformations

**OOP Components:**
- `jupityr/gamification/models/player.py` - Player entity and state
- `jupityr/gamification/engine/game_engine.py` - Game orchestration

**Configuration:**
- `jupityr/config/loader.py` - YAML/JSON loading
- `jupityr/config/schemas/corpus_schema.py` - Corpus definitions

### Example Files

- `examples/corpus_example.yaml` - Sample corpus configuration
- `examples/automation_example.yaml` - Sample automation rules

## Dependencies

### Core Dependencies
- `numpy>=1.21.0` - Numerical computations
- `pyyaml>=6.0` - YAML configuration loading
- `toolz>=0.12.0` - Functional programming utilities
- `funcy>=2.0` - Additional functional utilities

### Development Dependencies
- `pytest>=7.0` - Testing framework
- `pytest-cov>=4.0` - Coverage reporting
- `black>=23.0` - Code formatting
- `flake8>=6.0` - Linting
- `mypy>=1.0` - Type checking

### Optional Dependencies
- `[ml]` - scikit-learn, torch, transformers
- `[nlp]` - spacy, nltk
- `[all]` - All optional dependencies

## Working with Configuration Files

### YAML Corpus Configuration

```yaml
name: "My Corpus"
description: "Description here"
corpus_type: text  # text, dialogue, annotated, multilingual
version: "1.0.0"

sources:
  - name: "source1"
    type: file  # file, url, database, api
    location: "./data/raw/texts.json"
    format: json  # json, csv, txt, xml
    encoding: utf-8

transforms:
  - name: "normalize"
    function: "normalize_text"
    enabled: true

  - name: "tokenize"
    function: "standard_tokenize"
    params:
      pattern: "\\w+"
    enabled: true

language: en
tags:
  - research
  - nlp

validation:
  min_text_length: 10
  max_text_length: 10000
  required_fields:
    - text
    - id
```

### Automation Rules

```yaml
id: "my_automation"
name: "My Automation Rule"
description: "Description here"

trigger:
  type: schedule  # schedule, event, file_watch
  schedule: "0 0 * * *"  # Cron expression
  config:
    timezone: "UTC"

actions:
  - type: process_corpus
    name: "process_data"
    params:
      corpus_id: "my_corpus"
      output_dir: "./data/processed"
    retry_count: 3
    timeout: 3600

enabled: true
priority: 10
tags:
  - automation
```

## Performance Considerations

### Functional Code
- Use generators for large datasets (lazy evaluation)
- Prefer `itertools` over list comprehensions for memory efficiency
- Use `toolz` streaming operations for big data

```python
from toolz import pipe
from itertools import islice

# Good: Lazy evaluation
def process_large_corpus(texts):
    return pipe(
        texts,
        map(normalize_text),
        map(tokenize),
        # Still lazy - only evaluated when consumed
    )

# Bad: Eager evaluation
def process_large_corpus(texts):
    normalized = [normalize_text(t) for t in texts]  # Full list in memory
    tokenized = [tokenize(t) for t in normalized]     # Another full list
    return tokenized
```

### OOP Code
- Minimize object creation in hot paths
- Use `__slots__` for performance-critical classes
- Cache expensive property calculations

### Configuration
- Cache loaded configurations
- Validate schemas once at load time
- Use lazy loading for large configs

## Common Pitfalls and Solutions

### Pitfall 1: Mutating in Functional Code
```python
# BAD
def process_tokens(tokens: List[str]) -> List[str]:
    tokens.append("END")  # Mutating input
    return tokens

# GOOD
def process_tokens(tokens: List[str]) -> List[str]:
    return tokens + ["END"]  # Return new list
```

### Pitfall 2: Stateless Classes
```python
# BAD - Don't use classes for stateless operations
class TextProcessor:
    @staticmethod
    def normalize(text: str) -> str:
        return text.lower()

# GOOD - Use pure functions
def normalize_text(text: str) -> str:
    return text.lower()
```

### Pitfall 3: Hardcoded Configuration
```python
# BAD
def load_corpus():
    return load_from_file("./data/corpus.json")  # Hardcoded

# GOOD
def load_corpus(config: CorpusSchema):
    return load_from_file(config.sources[0].location)
```

## Future Roadmap Context

Understanding planned features helps make extensible decisions:

- **Frontend UI** (TypeScript/React) - Keep backend APIs clean
- **Advanced NLP** (spaCy, transformers) - Keep transforms composable
- **ML Training Pipelines** - Maintain functional purity
- **Real-time Collaboration** - Design for async/concurrency
- **API Server** (FastAPI) - Think about serialization

## Getting Help

- **Architecture questions:** See `ARCHITECTURE.md`
- **Usage examples:** See `README.md` and `examples/`
- **API documentation:** Check docstrings in source files
- **Type information:** Run `mypy` for type checking
- **Test examples:** Look at `jupityr/tests/`

## Summary for AI Assistants

**Core Principles:**
1. **Match paradigm to purpose** - Functional for data, OOP for state, Declarative for config
2. **Maintain immutability** in functional code
3. **Encapsulate state** in OOP code
4. **Validate declaratively** with schemas
5. **Type everything** with hints
6. **Test thoroughly** across paradigms
7. **Document clearly** with docstrings

**Before Writing Code:**
- Determine which paradigm applies
- Check existing patterns in similar files
- Ensure type hints are present
- Plan tests alongside implementation
- Consider performance implications

**Quality Gates:**
- Code formatted with Black
- No flake8 violations
- mypy type check passes
- pytest tests pass with good coverage
- Docstrings added for public APIs

---

**Last Updated:** 2025-11-13
**Version:** 0.1.0
**Maintainer:** Jupityr Team
