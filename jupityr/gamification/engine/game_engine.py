"""
Game engine for managing gamification logic.

Central coordinator for player progression, achievements, and challenges.
"""

from typing import Dict, List, Optional, Callable
from datetime import datetime
from ..models.player import Player, Achievement, Challenge, Skill


class AchievementRule:
    """
    Defines a rule for earning an achievement.

    Uses strategy pattern for flexible achievement conditions.
    """

    def __init__(
        self,
        achievement: Achievement,
        condition: Callable[[Player], bool],
        description: str = ""
    ):
        self.achievement = achievement
        self.condition = condition
        self.description = description

    def check(self, player: Player) -> bool:
        """Check if player meets the condition for this achievement."""
        return self.condition(player)


class GameEngine:
    """
    Central game engine managing players and gamification mechanics.

    Uses OOP to maintain game state and orchestrate player interactions.
    """

    def __init__(self):
        self._players: Dict[str, Player] = {}
        self._achievement_rules: List[AchievementRule] = []
        self._challenge_catalog: Dict[str, Challenge] = {}
        self._event_listeners: Dict[str, List[Callable]] = {
            'level_up': [],
            'achievement_earned': [],
            'challenge_completed': []
        }

    def register_player(self, player_id: str, username: str) -> Player:
        """Register a new player in the game."""
        if player_id in self._players:
            raise ValueError(f"Player {player_id} already exists")

        player = Player(player_id, username)
        self._players[player_id] = player
        return player

    def get_player(self, player_id: str) -> Optional[Player]:
        """Get a player by ID."""
        return self._players.get(player_id)

    def add_achievement_rule(self, rule: AchievementRule) -> None:
        """Add a new achievement rule to the engine."""
        self._achievement_rules.append(rule)

    def add_challenge(self, challenge: Challenge) -> None:
        """Add a challenge to the catalog."""
        self._challenge_catalog[challenge.id] = challenge

    def assign_challenge(self, player_id: str, challenge_id: str) -> bool:
        """Assign a challenge from the catalog to a player."""
        player = self.get_player(player_id)
        challenge = self._challenge_catalog.get(challenge_id)

        if player and challenge:
            player.start_challenge(challenge)
            return True
        return False

    def complete_player_challenge(
        self,
        player_id: str,
        challenge_id: str
    ) -> bool:
        """
        Complete a challenge for a player and trigger events.
        """
        player = self.get_player(player_id)
        if not player:
            return False

        # Complete the challenge
        success = player.complete_challenge(challenge_id)
        if success:
            # Trigger event listeners
            self._trigger_event('challenge_completed', player, challenge_id)

            # Check for new achievements
            self._check_achievements(player)

        return success

    def award_experience(self, player_id: str, amount: int) -> bool:
        """
        Award experience to a player.

        Returns:
            True if player leveled up, False otherwise.
        """
        player = self.get_player(player_id)
        if not player:
            return False

        leveled_up = player.add_experience(amount)
        if leveled_up:
            self._trigger_event('level_up', player)

        # Check for achievements after experience gain
        self._check_achievements(player)

        return leveled_up

    def _check_achievements(self, player: Player) -> List[Achievement]:
        """
        Check all achievement rules for a player and award new achievements.

        Returns:
            List of newly earned achievements.
        """
        new_achievements = []

        for rule in self._achievement_rules:
            # Check if player already has this achievement
            has_achievement = any(
                a.id == rule.achievement.id for a in player.achievements
            )

            if not has_achievement and rule.check(player):
                player.earn_achievement(rule.achievement)
                new_achievements.append(rule.achievement)
                self._trigger_event('achievement_earned', player, rule.achievement)

        return new_achievements

    def on(self, event: str, listener: Callable) -> None:
        """Register an event listener."""
        if event in self._event_listeners:
            self._event_listeners[event].append(listener)

    def _trigger_event(self, event: str, *args, **kwargs) -> None:
        """Trigger all listeners for an event."""
        if event in self._event_listeners:
            for listener in self._event_listeners[event]:
                listener(*args, **kwargs)

    def get_leaderboard(self, top_n: int = 10) -> List[Dict]:
        """
        Get top players by total points.

        Returns:
            List of player summaries sorted by points.
        """
        sorted_players = sorted(
            self._players.values(),
            key=lambda p: p.total_points,
            reverse=True
        )

        return [
            {
                'rank': idx + 1,
                **player.get_progress_summary()
            }
            for idx, player in enumerate(sorted_players[:top_n])
        ]

    def get_stats(self) -> Dict:
        """Get overall game statistics."""
        return {
            'total_players': len(self._players),
            'total_achievements_rules': len(self._achievement_rules),
            'total_challenges': len(self._challenge_catalog),
            'average_player_level': sum(p.level for p in self._players.values()) / len(self._players) if self._players else 0
        }
