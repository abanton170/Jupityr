"""
Declarative schema for corpus configuration.

Defines the structure and validation rules for corpus definitions.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class CorpusType(Enum):
    """Types of corpus data."""
    TEXT = "text"
    DIALOGUE = "dialogue"
    ANNOTATED = "annotated"
    MULTILINGUAL = "multilingual"


class ProcessingLevel(Enum):
    """Levels of text processing."""
    RAW = "raw"
    TOKENIZED = "tokenized"
    LEMMATIZED = "lemmatized"
    PARSED = "parsed"


@dataclass
class SourceConfig:
    """Configuration for a data source."""
    name: str
    type: str  # file, url, database, api
    location: str
    format: str  # json, csv, txt, xml
    encoding: str = "utf-8"
    metadata: Dict = field(default_factory=dict)


@dataclass
class TransformConfig:
    """Configuration for a transformation step."""
    name: str
    function: str  # Function name to apply
    params: Dict = field(default_factory=dict)
    enabled: bool = True


@dataclass
class CorpusSchema:
    """
    Declarative schema for defining a corpus.

    This allows users to define corpora using configuration
    rather than imperative code.
    """
    name: str
    description: str
    corpus_type: CorpusType
    version: str = "1.0.0"

    # Data sources
    sources: List[SourceConfig] = field(default_factory=list)

    # Processing pipeline
    processing_level: ProcessingLevel = ProcessingLevel.RAW
    transforms: List[TransformConfig] = field(default_factory=list)

    # Metadata
    language: str = "en"
    languages: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    license: Optional[str] = None
    citation: Optional[str] = None

    # Output configuration
    output_format: str = "json"
    output_location: Optional[str] = None

    # Validation rules
    min_text_length: int = 0
    max_text_length: Optional[int] = None
    required_fields: List[str] = field(default_factory=list)

    def __post_init__(self):
        """Validate configuration after initialization."""
        if not self.sources:
            raise ValueError("At least one source must be defined")

        if not self.languages and self.language:
            self.languages = [self.language]

    def to_dict(self) -> Dict:
        """Convert schema to dictionary for serialization."""
        return {
            'name': self.name,
            'description': self.description,
            'corpus_type': self.corpus_type.value,
            'version': self.version,
            'sources': [
                {
                    'name': s.name,
                    'type': s.type,
                    'location': s.location,
                    'format': s.format,
                    'encoding': s.encoding,
                    'metadata': s.metadata
                }
                for s in self.sources
            ],
            'processing_level': self.processing_level.value,
            'transforms': [
                {
                    'name': t.name,
                    'function': t.function,
                    'params': t.params,
                    'enabled': t.enabled
                }
                for t in self.transforms
            ],
            'languages': self.languages,
            'tags': self.tags,
            'license': self.license,
            'citation': self.citation,
            'output_format': self.output_format,
            'output_location': self.output_location,
            'validation': {
                'min_text_length': self.min_text_length,
                'max_text_length': self.max_text_length,
                'required_fields': self.required_fields
            }
        }
