"""
Declarative schema for automation rules.

Defines rules for automatic processing, scheduling, and workflows.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class TriggerType(Enum):
    """Types of automation triggers."""
    SCHEDULE = "schedule"  # Time-based
    EVENT = "event"  # Event-based
    THRESHOLD = "threshold"  # Condition-based
    MANUAL = "manual"  # User-initiated


class ActionType(Enum):
    """Types of actions that can be automated."""
    PROCESS_CORPUS = "process_corpus"
    RUN_PIPELINE = "run_pipeline"
    TRAIN_MODEL = "train_model"
    SEND_NOTIFICATION = "send_notification"
    EXPORT_DATA = "export_data"
    CLEANUP = "cleanup"


@dataclass
class Condition:
    """A condition that must be met for a rule to execute."""
    field: str
    operator: str  # eq, ne, gt, lt, gte, lte, in, contains
    value: Any
    type: str = "simple"  # simple, compound


@dataclass
class TriggerConfig:
    """Configuration for an automation trigger."""
    type: TriggerType
    config: Dict

    # For schedule triggers
    schedule: Optional[str] = None  # Cron expression

    # For event triggers
    event_name: Optional[str] = None

    # For threshold triggers
    conditions: List[Condition] = field(default_factory=list)


@dataclass
class ActionConfig:
    """Configuration for an automation action."""
    type: ActionType
    name: str
    params: Dict = field(default_factory=dict)
    retry_count: int = 0
    retry_delay: int = 60  # seconds
    timeout: Optional[int] = None  # seconds


@dataclass
class AutomationRule:
    """
    Declarative automation rule.

    Defines when (trigger) and what (action) should happen automatically.
    """
    id: str
    name: str
    description: str

    # Trigger configuration
    trigger: TriggerConfig

    # Actions to execute
    actions: List[ActionConfig]

    # Control flags
    enabled: bool = True
    priority: int = 0  # Higher priority rules run first

    # Execution limits
    max_executions: Optional[int] = None
    execution_count: int = 0

    # Metadata
    tags: List[str] = field(default_factory=list)
    created_by: Optional[str] = None
    metadata: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """Convert rule to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'trigger': {
                'type': self.trigger.type.value,
                'config': self.trigger.config,
                'schedule': self.trigger.schedule,
                'event_name': self.trigger.event_name,
                'conditions': [
                    {
                        'field': c.field,
                        'operator': c.operator,
                        'value': c.value,
                        'type': c.type
                    }
                    for c in self.trigger.conditions
                ]
            },
            'actions': [
                {
                    'type': a.type.value,
                    'name': a.name,
                    'params': a.params,
                    'retry_count': a.retry_count,
                    'retry_delay': a.retry_delay,
                    'timeout': a.timeout
                }
                for a in self.actions
            ],
            'enabled': self.enabled,
            'priority': self.priority,
            'max_executions': self.max_executions,
            'execution_count': self.execution_count,
            'tags': self.tags,
            'created_by': self.created_by,
            'metadata': self.metadata
        }


@dataclass
class WorkflowSchema:
    """
    Declarative workflow definition.

    Chains multiple automation rules into a cohesive workflow.
    """
    id: str
    name: str
    description: str

    # Workflow steps (rules execute in order)
    steps: List[AutomationRule]

    # Error handling
    on_error: str = "stop"  # stop, continue, retry

    # Metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """Convert workflow to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'steps': [step.to_dict() for step in self.steps],
            'on_error': self.on_error,
            'tags': self.tags,
            'metadata': self.metadata
        }
