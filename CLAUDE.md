# CLAUDE.md - Developer Guide for Jupityr

## Project Overview

**Jupityr** is a multi-paradigm NLP and gamified learning platform that demonstrates how different programming paradigms can work together harmoniously. The project combines:

- **Functional Programming** for data processing, NLP transformations, and ML pipelines
- **Object-Oriented Programming** for gamification mechanics and stateful interactions
- **Declarative Configuration** for corpus definitions and automation rules

### Key Philosophy

Each paradigm is used where it provides the most value:
- Functional: Immutable data transformations, pure functions, composability
- OOP: Entities with identity and lifecycle (players, achievements, challenges)
- Declarative: Separation of "what" from "how" for configurations

## Architecture Overview

```
jupityr/
├── core/                    # Functional Programming Core
│   ├── pipelines/          # Data pipeline infrastructure
│   │   └── pipeline.py     # compose(), pipe(), Pipeline class
│   ├── nlp/                # NLP transformations
│   │   └── transforms.py   # Pure NLP functions
│   └── ml/                 # ML transformations
│       └── transformers.py # Functional feature engineering
│
├── gamification/           # Object-Oriented Game System
│   ├── models/             # Game entity models
│   │   └── player.py       # Player, Achievement, Challenge, Skill
│   ├── engine/             # Game orchestration
│   │   └── game_engine.py  # GameEngine, AchievementRule
│   └── ui/                 # UI components (future)
│
├── config/                 # Declarative Configuration
│   ├── schemas/            # Schema definitions
│   │   ├── corpus_schema.py      # CorpusSchema, SourceConfig
│   │   └── automation_schema.py  # AutomationRule, WorkflowSchema
│   ├── loader.py           # ConfigLoader for YAML/JSON
│   └── rules/              # Rule definitions
│
├── frontend/               # TypeScript/React UI (planned)
├── utils/                  # Shared utilities
└── tests/                  # Test suites
```

## Key Components Guide

### 1. Functional Pipelines (`jupityr/core/pipelines/`)

**Location:** `jupityr/core/pipelines/pipeline.py`

**Core Functions:**
- `compose(*functions)` - Compose functions right-to-left: `compose(f, g, h)(x) == f(g(h(x)))`
- `pipe(data, *functions)` - Apply functions left-to-right: `pipe(x, f, g, h) == h(g(f(x)))`
- `curry(func)` - Curry a function for partial application
- `Pipeline` class - Immutable pipeline container with `.then()` method

**Usage Example:**
```python
from jupityr.core.pipelines import Pipeline, pipe, compose

# Using Pipeline class
pipeline = Pipeline(normalize_text, tokenize)
result = pipeline("Hello World")

# Using pipe function
result = pipe("Hello World", normalize_text, tokenize)

# Using compose
processor = compose(tokenize, normalize_text)
result = processor("Hello World")
```

**When to use:**
- Building data transformation chains
- Processing text or numerical data
- Creating reusable, testable transformations

### 2. NLP Transformations (`jupityr/core/nlp/`)

**Location:** `jupityr/core/nlp/transforms.py`

**Pure Functions:**
- `normalize_text(text)` - Lowercase + whitespace normalization
- `remove_punctuation(text, keep="")` - Remove punctuation with optional keep chars
- `tokenize(text, pattern)` - Regex-based tokenization
- `ngrams(tokens, n)` - Generate n-grams
- `word_frequencies(tokens)` - Calculate word counts
- `basic_clean` - Pre-composed pipeline
- `standard_tokenize(text)` - Standard tokenization pipeline

**Usage Example:**
```python
from jupityr.core.nlp.transforms import normalize_text, standard_tokenize

# Single transformation
clean = normalize_text("Hello, World!")  # "hello world"

# Standard pipeline
tokens = standard_tokenize("Hello, World!")  # ['hello', 'world']
```

**Design Principle:** All functions are pure (no side effects, same input = same output)

### 3. ML Transformations (`jupityr/core/ml/`)

**Location:** `jupityr/core/ml/transformers.py`

**Core Transformations:**
- `normalize(data, params)` - Z-score normalization
- `min_max_scale(data, params)` - Scale to [0, 1]
- `vectorize(texts, vocabulary)` - Bag-of-words vectorization
- `learn_transform(data, transform_fn, name)` - Learn parameters and return immutable Transform
- `compose_transforms(*transforms)` - Compose learned transforms

**Key Pattern - Immutable Transforms:**
```python
from jupityr.core.ml.transformers import learn_transform, normalize
import numpy as np

# Learn normalization from training data
train_data = np.array([[1, 2], [3, 4], [5, 6]])
normalizer = learn_transform(train_data, normalize, name="normalizer")

# Apply to new data (parameters frozen)
test_data = np.array([[2, 3]])
normalized = normalizer(test_data)
```

**Design Principle:** Separate learning phase from application phase using immutable Transform objects

### 4. Gamification System (`jupityr/gamification/`)

**Location:** `jupityr/gamification/models/player.py`

**Core Classes:**
- `Skill` (Enum) - NLP, ML, DATA_ANALYSIS, PROGRAMMING
- `Achievement` (dataclass) - Earned achievements with points
- `Challenge` (dataclass) - Learning challenges with difficulty/skills
- `Player` (class) - Player entity with level, experience, achievements

**Player Methods:**
- `add_experience(amount)` - Add XP, returns True if leveled up
- `earn_achievement(achievement)` - Award achievement + points
- `start_challenge(challenge)` - Add challenge to player
- `complete_challenge(challenge_id)` - Mark complete + award points/XP
- `get_progress_summary()` - Return progress dict

**Usage Example:**
```python
from jupityr.gamification.models.player import Player, Achievement, Skill

player = Player("user123", "alice")
player.add_experience(150)  # May level up

achievement = Achievement(
    id="first_nlp",
    name="First NLP Task",
    description="Complete first NLP challenge",
    category="beginner",
    points=50
)
player.earn_achievement(achievement)

print(player.get_progress_summary())
```

**Design Principle:** Encapsulate state in objects, use methods for behavior

### 5. Game Engine (`jupityr/gamification/engine/`)

**Location:** `jupityr/gamification/engine/game_engine.py`

**Core Classes:**
- `AchievementRule` - Strategy pattern for achievement conditions
- `GameEngine` - Central coordinator for all game logic

**GameEngine Methods:**
- `register_player(player_id, username)` - Create new player
- `get_player(player_id)` - Retrieve player
- `award_experience(player_id, amount)` - Award XP + check achievements
- `add_achievement_rule(rule)` - Register achievement condition
- `assign_challenge(player_id, challenge_id)` - Assign challenge
- `complete_player_challenge(player_id, challenge_id)` - Complete + trigger events
- `on(event, listener)` - Register event listener
- `get_leaderboard(top_n)` - Get top players by points

**Usage Example:**
```python
from jupityr.gamification.engine.game_engine import GameEngine, AchievementRule

engine = GameEngine()

# Register player
player = engine.register_player("user1", "bob")

# Add achievement rule
rule = AchievementRule(
    achievement=first_steps_achievement,
    condition=lambda p: p.level >= 2,
    description="Reach level 2"
)
engine.add_achievement_rule(rule)

# Listen for events
def on_level_up(player):
    print(f"{player.username} leveled up!")

engine.on('level_up', on_level_up)

# Award experience (triggers level up + checks achievements)
engine.award_experience("user1", 200)
```

**Design Principle:** Central coordinator pattern with event-driven architecture

### 6. Declarative Configuration (`jupityr/config/`)

**Location:** `jupityr/config/loader.py`, `jupityr/config/schemas/`

**ConfigLoader Static Methods:**
- `load_file(path)` - Load YAML/JSON to dict
- `save_file(config, path)` - Save dict to YAML/JSON
- `load_corpus_schema(path)` - Load and validate corpus config
- `load_automation_rule(path)` - Load and validate automation rule
- `save_corpus_schema(schema, path)` - Save corpus schema
- `save_automation_rule(rule, path)` - Save automation rule

**CorpusSchema Structure:**
```python
from jupityr.config.schemas.corpus_schema import (
    CorpusSchema, CorpusType, ProcessingLevel, SourceConfig, TransformConfig
)

# Define programmatically
schema = CorpusSchema(
    name="My Corpus",
    description="Example corpus",
    corpus_type=CorpusType.TEXT,
    sources=[
        SourceConfig(
            name="texts",
            type="file",
            location="./data/texts.json",
            format="json"
        )
    ],
    transforms=[
        TransformConfig(name="normalize", function="normalize_text"),
        TransformConfig(name="tokenize", function="standard_tokenize")
    ]
)

# Or load from YAML
from jupityr.config.loader import ConfigLoader
schema = ConfigLoader.load_corpus_schema("corpus_config.yaml")
```

**YAML Example:**
```yaml
name: "My NLP Corpus"
description: "A corpus for NLP training"
corpus_type: text
version: "1.0.0"

sources:
  - name: "texts"
    type: file
    location: "./data/texts.json"
    format: json
    encoding: utf-8

transforms:
  - name: "normalize"
    function: "normalize_text"
    enabled: true
  - name: "tokenize"
    function: "standard_tokenize"
    enabled: true

processing_level: raw
language: en
tags: ["training", "nlp"]
output_format: json
```

**Design Principle:** Separate configuration from code, enable non-programmers to define workflows

## Paradigm Integration Pattern

Here's how the three paradigms work together:

```python
from jupityr.config.loader import ConfigLoader
from jupityr.core.pipelines import Pipeline
from jupityr.core.nlp.transforms import normalize_text, standard_tokenize
from jupityr.gamification.engine.game_engine import GameEngine

# 1. DECLARATIVE: Load corpus configuration
corpus_config = ConfigLoader.load_corpus_schema("examples/corpus_example.yaml")

# 2. FUNCTIONAL: Build processing pipeline from config
pipeline = Pipeline(
    normalize_text,
    standard_tokenize
)

# Process texts functionally
texts = ["Hello World", "Jupityr is awesome"]
processed = [pipeline(text) for text in texts]

# 3. OBJECT-ORIENTED: Update game state
engine = GameEngine()
player = engine.register_player("user1", "alice")

# Award experience for completing NLP task
engine.award_experience("user1", 100)

# Check progress
progress = player.get_progress_summary()
print(f"Level: {progress['level']}, Points: {progress['total_points']}")
```

## Development Guidelines

### When to Use Each Paradigm

**Use Functional Programming for:**
- Data transformations (text processing, feature engineering)
- Pipeline building and composition
- Pure business logic without state
- Batch operations on collections
- Anything that benefits from immutability and testability

**Use OOP for:**
- Entities with identity and lifecycle (Player, Achievement)
- Complex stateful systems (GameEngine)
- Event-driven architectures
- UI components (future frontend)
- Anything that models real-world objects

**Use Declarative Configuration for:**
- Corpus definitions
- Automation workflows
- User-configurable behavior
- Version-controlled configurations
- Anything non-programmers need to modify

### Anti-Patterns to Avoid

1. **Don't mix paradigms in a single module**
   - Bad: Adding stateful methods to pure transform functions
   - Good: Keep `core/nlp/transforms.py` purely functional

2. **Don't use mutable state in functional code**
   - Bad: Modifying lists in-place during transformations
   - Good: Return new data structures

3. **Don't hardcode configurations**
   - Bad: Hardcoded file paths, processing steps
   - Good: Define in YAML, load via ConfigLoader

4. **Don't use OOP for data transformations**
   - Bad: Creating classes for text normalization
   - Good: Use pure functions

## Testing Strategy

### Functional Code Testing
```python
# Test pure functions with property-based testing
def test_normalize_text():
    assert normalize_text("HELLO") == "hello"
    assert normalize_text("  spaces  ") == "spaces"
    # Same input always produces same output
    assert normalize_text("Test") == normalize_text("Test")

# Test pipeline composition
def test_pipeline_composition():
    pipeline = Pipeline(normalize_text, lambda x: x.upper())
    assert pipeline("hello") == "HELLO"
```

### OOP Code Testing
```python
# Test with mocks and state verification
def test_player_experience():
    player = Player("test", "tester")
    leveled_up = player.add_experience(100)
    assert leveled_up == True
    assert player.level == 2
    assert player.experience == 0  # Rolled over

def test_game_engine_events():
    engine = GameEngine()
    events_fired = []

    engine.on('level_up', lambda p: events_fired.append(p.username))
    player = engine.register_player("u1", "bob")
    engine.award_experience("u1", 100)

    assert "bob" in events_fired
```

### Declarative Config Testing
```python
# Test schema validation
def test_corpus_schema_validation():
    schema = CorpusSchema(
        name="Test",
        description="Test corpus",
        corpus_type=CorpusType.TEXT,
        sources=[]  # Invalid: needs at least one source
    )
    # Should raise ValueError

def test_config_loading():
    schema = ConfigLoader.load_corpus_schema("test_corpus.yaml")
    assert schema.name == "Expected Name"
    assert len(schema.sources) > 0
```

## Common Development Tasks

### Adding a New NLP Transformation

1. Add pure function to `jupityr/core/nlp/transforms.py`:
```python
def remove_stopwords(tokens: List[str], stopwords: Set[str]) -> List[str]:
    """Remove stopwords from token list."""
    return [t for t in tokens if t not in stopwords]
```

2. Use in pipelines:
```python
from functools import partial

stopwords = {"the", "a", "an"}
pipeline = Pipeline(
    normalize_text,
    standard_tokenize,
    partial(remove_stopwords, stopwords=stopwords)
)
```

### Adding a New Game Mechanic

1. Define model in `jupityr/gamification/models/`:
```python
@dataclass
class PowerUp:
    id: str
    name: str
    effect: str
    duration: int  # seconds
    active: bool = False
```

2. Add methods to Player class:
```python
def activate_powerup(self, powerup: PowerUp) -> None:
    """Activate a power-up for the player."""
    self._active_powerups.append(powerup)
```

3. Update GameEngine if needed for coordination

### Adding a New Configuration Schema

1. Define schema in `jupityr/config/schemas/`:
```python
@dataclass
class LearningPathSchema:
    name: str
    description: str
    steps: List[str]
    difficulty: int
    prerequisites: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'description': self.description,
            'steps': self.steps,
            'difficulty': self.difficulty,
            'prerequisites': self.prerequisites
        }
```

2. Add loader method to ConfigLoader:
```python
@classmethod
def load_learning_path(cls, path: Union[str, Path]) -> LearningPathSchema:
    config = cls.load_file(path)
    return LearningPathSchema(**config)
```

### Extending the Pipeline System

Add custom operators in `jupityr/core/pipelines/pipeline.py`:
```python
@curry
def flatmap_fn(func: Callable[[A], Iterable[B]], iterable: Iterable[A]) -> Iterable[B]:
    """Curried flatmap for better composition."""
    return (item for sublist in map(func, iterable) for item in sublist)
```

## File Reference Quick Guide

| What You Need | Where to Look |
|---------------|---------------|
| Pipeline composition | `jupityr/core/pipelines/pipeline.py` |
| Text processing | `jupityr/core/nlp/transforms.py` |
| ML transformations | `jupityr/core/ml/transformers.py` |
| Player mechanics | `jupityr/gamification/models/player.py` |
| Game engine logic | `jupityr/gamification/engine/game_engine.py` |
| Config loading | `jupityr/config/loader.py` |
| Corpus schema | `jupityr/config/schemas/corpus_schema.py` |
| Automation schema | `jupityr/config/schemas/automation_schema.py` |
| Example configs | `examples/*.yaml` |

## Running the Project

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Or with dev dependencies
pip install -e ".[dev]"

# Or with all extras (ML, NLP)
pip install -e ".[all]"
```

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=jupityr --cov-report=term-missing

# Run specific test file
pytest tests/test_pipelines.py
```

### Code Quality
```bash
# Format code
black jupityr/

# Lint
flake8 jupityr/

# Type check
mypy jupityr/
```

## Key Dependencies

- **numpy** - Numerical computing for ML transformations
- **pyyaml** - YAML configuration parsing
- **toolz** - Functional utilities (inspiration for pipeline design)
- **funcy** - More functional utilities
- **pytest** - Testing framework
- **black** - Code formatting
- **mypy** - Static type checking

## Architecture Decisions

### Why Functional for Data Processing?
- **Immutability** ensures data integrity through pipelines
- **Pure functions** are trivial to test (no mocks needed)
- **Composition** allows building complex pipelines from simple parts
- **Parallelization** is natural with stateless transformations

### Why OOP for Gamification?
- **Entities** like Player, Achievement have clear identity and lifecycle
- **Encapsulation** hides complex state management (XP, levels, achievements)
- **Events** are natural with object lifecycle hooks
- **Polymorphism** enables flexible game mechanics

### Why Declarative for Configuration?
- **Separation of concerns** - what vs how
- **Accessibility** - non-programmers can define corpora
- **Version control** - YAML/JSON diffs are readable
- **Validation** - schemas catch errors before execution

## Extending This Documentation

When adding new features, update:
1. **This file (CLAUDE.md)** - Add to relevant sections
2. **ARCHITECTURE.md** - If paradigm usage changes
3. **README.md** - If user-facing features change
4. **Docstrings** - Keep code self-documenting

## Questions & Support

For questions about:
- **Functional patterns** - See `jupityr/core/` examples
- **OOP patterns** - See `jupityr/gamification/` examples
- **Declarative patterns** - See `examples/*.yaml` and `jupityr/config/`
- **Testing** - See `jupityr/tests/` (when implemented)
- **Contributing** - See CONTRIBUTING.md (when created)

---

**Last Updated:** 2025-11-13
**Jupityr Version:** 0.1.0
**Python Version:** 3.8+
