# Jupityr

A multi-paradigm NLP and gamified learning platform that combines functional programming for data processing, object-oriented design for gamification, and declarative configuration for automation.

## Features

- **Functional Data Pipelines**: Compose pure, testable transformations for NLP and ML
- **Gamified Learning**: Engage users with achievements, challenges, and progression systems
- **Declarative Configuration**: Define corpora, automation rules, and workflows with YAML/JSON
- **Multi-Paradigm Design**: Each paradigm used where it shines most

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/abanton170/Jupityr.git
cd Jupityr

# Install dependencies
pip install -r requirements.txt

# Or install in development mode
pip install -e ".[dev]"
```

### Basic Usage

#### 1. Functional Data Processing

```python
from jupityr.core.pipelines import Pipeline
from jupityr.core.nlp.transforms import normalize_text, standard_tokenize

# Create a functional pipeline
pipeline = Pipeline(
    normalize_text,
    standard_tokenize
)

# Process text
tokens = pipeline("Hello, World! This is Jupityr.")
print(tokens)  # ['hello', 'world', 'this', 'is', 'jupityr']
```

#### 2. Gamification System

```python
from jupityr.gamification.engine.game_engine import GameEngine
from jupityr.gamification.models.player import Achievement

# Initialize game engine
engine = GameEngine()

# Register a player
player = engine.register_player("user123", "alice")

# Award experience and check for level up
leveled_up = engine.award_experience("user123", 150)

# Get player progress
progress = player.get_progress_summary()
print(f"Level: {progress['level']}, Points: {progress['total_points']}")
```

#### 3. Declarative Configuration

```yaml
# corpus_config.yaml
name: "My NLP Corpus"
corpus_type: text
sources:
  - name: "texts"
    type: file
    location: "./data/texts.json"
    format: json

transforms:
  - name: "normalize"
    function: "normalize_text"
  - name: "tokenize"
    function: "standard_tokenize"
```

```python
from jupityr.config.loader import ConfigLoader

# Load configuration
corpus = ConfigLoader.load_corpus_schema("corpus_config.yaml")
print(corpus.name)  # "My NLP Corpus"
```

## Architecture

Jupityr uses a **multi-paradigm approach**:

### Functional Programming (Primary)
- **For:** Data pipelines, NLP processing, ML transformations
- **Why:** Immutability, composability, testability
- **Location:** `jupityr/core/`

### Object-Oriented Programming (Supporting)
- **For:** Gamified learning environment, UI components
- **Why:** State encapsulation, entity modeling
- **Location:** `jupityr/gamification/`

### Declarative Configuration
- **For:** Corpus structure, automation rules
- **Why:** Separation of concerns, non-programmer friendly
- **Location:** `jupityr/config/`

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design philosophy.

## Project Structure

```
jupityr/
├── core/                    # Functional core (pipelines, NLP, ML)
├── gamification/           # OOP gamification engine
├── config/                 # Declarative configuration
├── frontend/               # TypeScript/React UI
├── utils/                  # Shared utilities
└── tests/                  # Test suites

examples/                   # Example configurations
├── corpus_example.yaml
└── automation_example.yaml
```

## Development

### Running Tests

```bash
pytest
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

### Installing Development Dependencies

```bash
pip install -r requirements-dev.txt
```

## Examples

### Functional Pipeline Composition

```python
from jupityr.core.pipelines import pipe, compose
from jupityr.core.nlp.transforms import normalize_text, remove_punctuation, tokenize

# Using pipe (left to right)
result = pipe(
    "Hello, World!",
    normalize_text,
    remove_punctuation,
    tokenize
)

# Using compose (right to left)
text_processor = compose(tokenize, remove_punctuation, normalize_text)
result = text_processor("Hello, World!")
```

### ML Transformations

```python
from jupityr.core.ml.transformers import learn_transform, normalize
import numpy as np

# Learn normalization parameters
data = np.array([[1, 2], [3, 4], [5, 6]])
normalizer = learn_transform(data, normalize, name="normalizer")

# Apply to new data
new_data = np.array([[2, 3]])
normalized = normalizer(new_data)
```

### Game Engine Events

```python
from jupityr.gamification.engine.game_engine import GameEngine

engine = GameEngine()

# Register event listener
def on_level_up(player):
    print(f"{player.username} leveled up to {player.level}!")

engine.on('level_up', on_level_up)

# Award experience triggers event
player = engine.register_player("user1", "bob")
engine.award_experience("user1", 1000)  # Prints: "bob leveled up to 2!"
```

## Language Support

- **Python 3.8+**: Core backend, ML/NLP processing
- **TypeScript**: Frontend UI (coming soon)
- **YAML/JSON**: Configuration files

## Contributing

Contributions welcome! Please read our contributing guidelines and code of conduct.

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] Frontend TypeScript/React UI
- [ ] Advanced NLP transformations (spaCy, transformers)
- [ ] ML model training pipelines
- [ ] Real-time collaboration features
- [ ] API server with FastAPI
- [ ] Extended gamification mechanics
- [ ] Learning path recommendations

## Contact

For questions and support, please open an issue on GitHub.

---

Built with a multi-paradigm philosophy: Functional for data, OOP for interaction, Declarative for configuration
