# Jupityr Architecture

## Multi-Paradigm Design Philosophy

Jupityr embraces a **multi-paradigm approach** to leverage the strengths of different programming paradigms where they shine most:

### 1. Functional Programming (Primary)
**Used for:** Data pipelines, NLP processing, ML transformations

**Why Functional?**
- Immutability ensures data integrity throughout transformations
- Pure functions are easier to test and reason about
- Composition enables building complex pipelines from simple parts
- Parallel processing is natural with stateless functions

**Key Components:**
- `jupityr/core/pipelines/` - Functional data pipeline infrastructure
- `jupityr/core/nlp/` - Pure NLP transformation functions
- `jupityr/core/ml/` - Functional ML feature engineering

**Design Principles:**
- Prefer pure functions over stateful operations
- Use composition over inheritance
- Embrace immutability (return new data, don't mutate)
- Leverage higher-order functions and currying

**Example:**
```python
from jupityr.core.pipelines import Pipeline
from jupityr.core.nlp.transforms import normalize_text, tokenize

# Compose a text processing pipeline
text_pipeline = Pipeline(
    normalize_text,
    tokenize,
    lambda tokens: [t for t in tokens if len(t) > 2]
)

result = text_pipeline("Hello World!")
```

### 2. Object-Oriented Programming (Supporting)
**Used for:** Gamified learning environment, UI/UX components

**Why OOP?**
- Natural modeling of game entities (players, achievements, challenges)
- Encapsulation of stateful game logic
- Inheritance for extending game mechanics
- Polymorphism for flexible UI components

**Key Components:**
- `jupityr/gamification/models/` - Player, Achievement, Challenge models
- `jupityr/gamification/engine/` - Game engine orchestration
- `jupityr/gamification/ui/` - UI component classes

**Design Principles:**
- Use classes for entities with identity and lifecycle
- Encapsulate state and provide clear interfaces
- Favor composition over deep inheritance
- Apply SOLID principles

**Example:**
```python
from jupityr.gamification.models.player import Player, Achievement
from jupityr.gamification.engine.game_engine import GameEngine

engine = GameEngine()
player = engine.register_player("user123", "alice")

# Object-oriented interaction
player.add_experience(100)
achievement = Achievement(
    id="first_steps",
    name="First Steps",
    description="Complete your first challenge",
    category="beginner",
    points=50
)
player.earn_achievement(achievement)
```

### 3. Declarative Configuration
**Used for:** Corpus structure, automation rules, learning paths

**Why Declarative?**
- Separates "what" from "how"
- Non-programmers can define configurations
- Version control friendly
- Schema validation ensures correctness

**Key Components:**
- `jupityr/config/schemas/` - Schema definitions
- `jupityr/config/loader.py` - Configuration loading/validation
- `examples/` - Example configurations

**Design Principles:**
- Define structure, not implementation
- Use schemas for validation
- Support YAML and JSON
- Keep configurations human-readable

**Example (YAML):**
```yaml
name: "My Corpus"
corpus_type: text
sources:
  - name: "texts"
    type: file
    location: "./data/texts.json"
transforms:
  - name: "normalize"
    function: "normalize_text"
  - name: "tokenize"
    function: "standard_tokenize"
```

## Directory Structure

```
jupityr/
├── core/                    # Functional core
│   ├── pipelines/          # Data pipeline infrastructure
│   ├── nlp/                # NLP transformations
│   └── ml/                 # ML transformations
├── gamification/           # OOP components
│   ├── models/             # Game entity models
│   ├── engine/             # Game engine
│   └── ui/                 # UI components
├── config/                 # Declarative configuration
│   ├── schemas/            # Configuration schemas
│   └── loader.py           # Config loading
├── frontend/               # Frontend (TypeScript/React)
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # React hooks
│       └── utils/          # Utilities
├── utils/                  # Shared utilities
└── tests/                  # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

## Data Flow

### 1. Functional Pipeline (Data Processing)
```
Raw Data → normalize → tokenize → vectorize → ML Model → Results
         (pure fn)  (pure fn)   (pure fn)
```

### 2. OOP Interaction (Gamification)
```
User Action → GameEngine → Player.method() → State Update → Achievement Check
                          (encapsulated)
```

### 3. Declarative Execution (Automation)
```
YAML Config → Loader → Schema Validation → Rule Execution → Actions
```

## Paradigm Integration

The paradigms work together seamlessly:

```python
# 1. Define corpus declaratively (YAML)
corpus_config = ConfigLoader.load_corpus_schema("corpus.yaml")

# 2. Process with functional pipeline
from jupityr.core.pipelines import Pipeline
from jupityr.core.nlp.transforms import basic_clean, standard_tokenize

pipeline = Pipeline(basic_clean, standard_tokenize)
processed_texts = [pipeline(text) for text in corpus_texts]

# 3. Update game state with OOP
game_engine.award_experience(player_id, points=50)
player = game_engine.get_player(player_id)
if player.level > 5:
    game_engine.assign_challenge(player_id, "advanced_nlp")
```

## Language Choices

### Python (Primary)
- **Why:** Best for ML/NLP, rich ecosystem, functional libraries available
- **Functional support:** `toolz`, `funcy`, `more-itertools`
- **Used for:** Core backend, data processing, ML/NLP

### TypeScript (Frontend)
- **Why:** Type safety, excellent for functional React patterns
- **Functional support:** Functional-style React with hooks
- **Used for:** Gamified UI, interactive learning environment

### Future Considerations
- **Scala/Clojure:** If pure functional + JVM ecosystem needed
- **Rust:** For high-performance pipeline components

## Best Practices

### When to Use Each Paradigm

**Use Functional when:**
- Processing data transformations
- Building pipelines
- Implementing pure business logic
- Working with collections

**Use OOP when:**
- Modeling entities with identity
- Managing complex stateful systems
- Building UI components
- Implementing game mechanics

**Use Declarative when:**
- Defining configurations
- Specifying workflows
- Setting up automation rules
- Documenting corpus structure

### Anti-Patterns to Avoid

- Don't use OOP for data transformations (use functional)
- Don't use mutable state in functional code
- Don't hardcode configurations (use declarative)
- Don't mix paradigms within a single module

## Testing Strategy

- **Functional code:** Property-based testing, pure function testing
- **OOP code:** Unit tests with mocks, integration tests
- **Declarative configs:** Schema validation tests

## Performance Considerations

- **Functional:** Use lazy evaluation for large datasets (generators, itertools)
- **OOP:** Minimize object creation in hot paths
- **Declarative:** Cache loaded configurations

## Extending the System

### Adding New Transformations (Functional)
```python
# jupityr/core/nlp/transforms.py
def my_transform(text: str) -> str:
    """Pure function for text transformation."""
    return text.upper()
```

### Adding Game Mechanics (OOP)
```python
# jupityr/gamification/models/custom.py
class PowerUp:
    """New game mechanic."""
    def __init__(self, name: str, effect: str):
        self.name = name
        self.effect = effect
```

### Adding Configuration Types (Declarative)
```python
# jupityr/config/schemas/custom_schema.py
@dataclass
class LearningPathSchema:
    """New declarative schema."""
    name: str
    steps: List[str]
```

## Conclusion

This multi-paradigm architecture allows Jupityr to:
- Process data efficiently with functional pipelines
- Provide engaging gamification with OOP
- Enable easy configuration with declarative schemas

Each paradigm is used where it provides the most value, creating a cohesive and maintainable system.
