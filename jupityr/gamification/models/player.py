"""
Player model for gamified learning environment.

Uses OOP principles for state management and behavior encapsulation.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set
from datetime import datetime
from enum import Enum


class Skill(Enum):
    """Player skill categories."""
    NLP = "nlp"
    ML = "machine_learning"
    DATA_ANALYSIS = "data_analysis"
    PROGRAMMING = "programming"


@dataclass
class Achievement:
    """Represents an achievement earned by a player."""
    id: str
    name: str
    description: str
    category: str
    points: int
    earned_at: datetime = field(default_factory=datetime.now)
    metadata: Dict = field(default_factory=dict)


@dataclass
class Challenge:
    """Represents a learning challenge."""
    id: str
    name: str
    description: str
    difficulty: int
    skills: List[Skill]
    points: int
    completed: bool = False
    completed_at: datetime = None


class Player:
    """
    Represents a player in the gamified learning environment.

    Uses OOP to encapsulate player state and provide methods for
    progression, achievements, and skill tracking.
    """

    def __init__(self, player_id: str, username: str):
        self.player_id = player_id
        self.username = username
        self.level = 1
        self.experience = 0
        self.total_points = 0
        self._achievements: List[Achievement] = []
        self._challenges: Dict[str, Challenge] = {}
        self._skill_levels: Dict[Skill, int] = {skill: 0 for skill in Skill}
        self.created_at = datetime.now()
        self.last_active = datetime.now()

    @property
    def achievements(self) -> List[Achievement]:
        """Get all earned achievements."""
        return self._achievements.copy()

    @property
    def active_challenges(self) -> List[Challenge]:
        """Get all active (incomplete) challenges."""
        return [c for c in self._challenges.values() if not c.completed]

    @property
    def completed_challenges(self) -> List[Challenge]:
        """Get all completed challenges."""
        return [c for c in self._challenges.values() if c.completed]

    def add_experience(self, amount: int) -> bool:
        """
        Add experience points and check for level up.

        Returns:
            True if player leveled up, False otherwise.
        """
        self.experience += amount
        self.last_active = datetime.now()

        # Level up formula: 100 * level for next level
        required_exp = 100 * self.level
        if self.experience >= required_exp:
            self.level += 1
            self.experience -= required_exp
            return True
        return False

    def earn_achievement(self, achievement: Achievement) -> None:
        """Award an achievement to the player."""
        if achievement.id not in {a.id for a in self._achievements}:
            self._achievements.append(achievement)
            self.total_points += achievement.points
            self.add_experience(achievement.points)

    def start_challenge(self, challenge: Challenge) -> None:
        """Add a new challenge for the player."""
        if challenge.id not in self._challenges:
            self._challenges[challenge.id] = challenge

    def complete_challenge(self, challenge_id: str) -> bool:
        """
        Mark a challenge as completed and award points/experience.

        Returns:
            True if challenge was completed, False if not found.
        """
        if challenge_id in self._challenges:
            challenge = self._challenges[challenge_id]
            if not challenge.completed:
                challenge.completed = True
                challenge.completed_at = datetime.now()
                self.total_points += challenge.points
                self.add_experience(challenge.points)

                # Increase skill levels
                for skill in challenge.skills:
                    self._skill_levels[skill] += 1

                return True
        return False

    def get_skill_level(self, skill: Skill) -> int:
        """Get current level for a specific skill."""
        return self._skill_levels[skill]

    def get_progress_summary(self) -> Dict:
        """Get a summary of player progress."""
        return {
            'username': self.username,
            'level': self.level,
            'experience': self.experience,
            'total_points': self.total_points,
            'achievements_count': len(self._achievements),
            'completed_challenges': len(self.completed_challenges),
            'active_challenges': len(self.active_challenges),
            'skills': {skill.value: level for skill, level in self._skill_levels.items()},
            'days_active': (datetime.now() - self.created_at).days
        }

    def __repr__(self) -> str:
        return f"Player(username={self.username}, level={self.level}, points={self.total_points})"
