"""
Configuration loader for declarative schemas.

Loads YAML/JSON configurations and converts them to schema objects.
"""

import json
import yaml
from pathlib import Path
from typing import Union, Dict, List
from .schemas.corpus_schema import (
    CorpusSchema, CorpusType, ProcessingLevel,
    SourceConfig, TransformConfig
)
from .schemas.automation_schema import (
    AutomationRule, WorkflowSchema, TriggerConfig, ActionConfig,
    TriggerType, ActionType, Condition
)


class ConfigLoader:
    """
    Loads and validates declarative configurations.

    Supports YAML and JSON formats.
    """

    @staticmethod
    def load_file(path: Union[str, Path]) -> Dict:
        """Load configuration from file."""
        path = Path(path)

        if not path.exists():
            raise FileNotFoundError(f"Configuration file not found: {path}")

        with open(path, 'r', encoding='utf-8') as f:
            if path.suffix in ['.yaml', '.yml']:
                return yaml.safe_load(f)
            elif path.suffix == '.json':
                return json.load(f)
            else:
                raise ValueError(f"Unsupported file format: {path.suffix}")

    @staticmethod
    def save_file(config: Dict, path: Union[str, Path]) -> None:
        """Save configuration to file."""
        path = Path(path)

        with open(path, 'w', encoding='utf-8') as f:
            if path.suffix in ['.yaml', '.yml']:
                yaml.safe_dump(config, f, default_flow_style=False)
            elif path.suffix == '.json':
                json.dump(config, f, indent=2)
            else:
                raise ValueError(f"Unsupported file format: {path.suffix}")

    @classmethod
    def load_corpus_schema(cls, path: Union[str, Path]) -> CorpusSchema:
        """Load a corpus schema from configuration file."""
        config = cls.load_file(path)

        return CorpusSchema(
            name=config['name'],
            description=config['description'],
            corpus_type=CorpusType(config.get('corpus_type', 'text')),
            version=config.get('version', '1.0.0'),
            sources=[
                SourceConfig(**source)
                for source in config.get('sources', [])
            ],
            processing_level=ProcessingLevel(
                config.get('processing_level', 'raw')
            ),
            transforms=[
                TransformConfig(**transform)
                for transform in config.get('transforms', [])
            ],
            language=config.get('language', 'en'),
            languages=config.get('languages', []),
            tags=config.get('tags', []),
            license=config.get('license'),
            citation=config.get('citation'),
            output_format=config.get('output_format', 'json'),
            output_location=config.get('output_location'),
            min_text_length=config.get('validation', {}).get('min_text_length', 0),
            max_text_length=config.get('validation', {}).get('max_text_length'),
            required_fields=config.get('validation', {}).get('required_fields', [])
        )

    @classmethod
    def load_automation_rule(cls, path: Union[str, Path]) -> AutomationRule:
        """Load an automation rule from configuration file."""
        config = cls.load_file(path)

        trigger_config = config['trigger']
        trigger = TriggerConfig(
            type=TriggerType(trigger_config['type']),
            config=trigger_config.get('config', {}),
            schedule=trigger_config.get('schedule'),
            event_name=trigger_config.get('event_name'),
            conditions=[
                Condition(**cond)
                for cond in trigger_config.get('conditions', [])
            ]
        )

        actions = [
            ActionConfig(
                type=ActionType(action['type']),
                name=action['name'],
                params=action.get('params', {}),
                retry_count=action.get('retry_count', 0),
                retry_delay=action.get('retry_delay', 60),
                timeout=action.get('timeout')
            )
            for action in config['actions']
        ]

        return AutomationRule(
            id=config['id'],
            name=config['name'],
            description=config['description'],
            trigger=trigger,
            actions=actions,
            enabled=config.get('enabled', True),
            priority=config.get('priority', 0),
            max_executions=config.get('max_executions'),
            execution_count=config.get('execution_count', 0),
            tags=config.get('tags', []),
            created_by=config.get('created_by'),
            metadata=config.get('metadata', {})
        )

    @classmethod
    def save_corpus_schema(cls, schema: CorpusSchema, path: Union[str, Path]) -> None:
        """Save a corpus schema to configuration file."""
        cls.save_file(schema.to_dict(), path)

    @classmethod
    def save_automation_rule(
        cls,
        rule: AutomationRule,
        path: Union[str, Path]
    ) -> None:
        """Save an automation rule to configuration file."""
        cls.save_file(rule.to_dict(), path)
