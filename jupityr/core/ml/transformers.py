"""
Functional ML transformations and feature engineering.

Emphasizes pure, composable transformation functions.
"""

from typing import List, Callable, TypeVar, Union
import numpy as np
from dataclasses import dataclass

T = TypeVar('T')


@dataclass(frozen=True)
class Transform:
    """Immutable transformation with learned parameters."""
    name: str
    params: dict
    transform_fn: Callable

    def __call__(self, data):
        """Apply the transformation."""
        return self.transform_fn(data, self.params)


def normalize(data: np.ndarray, params: dict = None) -> np.ndarray:
    """
    Normalize data to zero mean and unit variance.
    If params provided, use those; otherwise calculate from data.
    """
    if params is None:
        mean = np.mean(data, axis=0)
        std = np.std(data, axis=0) + 1e-8
    else:
        mean = params['mean']
        std = params['std']

    return (data - mean) / std


def min_max_scale(data: np.ndarray, params: dict = None) -> np.ndarray:
    """
    Scale data to [0, 1] range.
    If params provided, use those; otherwise calculate from data.
    """
    if params is None:
        min_val = np.min(data, axis=0)
        max_val = np.max(data, axis=0)
    else:
        min_val = params['min']
        max_val = params['max']

    range_val = max_val - min_val + 1e-8
    return (data - min_val) / range_val


def vectorize(texts: List[str], vocabulary: dict = None) -> np.ndarray:
    """
    Convert texts to bag-of-words vectors.
    If vocabulary provided, use it; otherwise build from texts.
    """
    if vocabulary is None:
        # Build vocabulary
        words = set()
        for text in texts:
            words.update(text.split())
        vocabulary = {word: idx for idx, word in enumerate(sorted(words))}

    vectors = np.zeros((len(texts), len(vocabulary)))
    for i, text in enumerate(texts):
        for word in text.split():
            if word in vocabulary:
                vectors[i, vocabulary[word]] += 1

    return vectors


def learn_transform(
    data,
    transform_fn: Callable,
    name: str = "transform"
) -> Transform:
    """
    Learn transformation parameters from data and return immutable Transform.
    """
    if transform_fn == normalize:
        params = {
            'mean': np.mean(data, axis=0),
            'std': np.std(data, axis=0) + 1e-8
        }
    elif transform_fn == min_max_scale:
        params = {
            'min': np.min(data, axis=0),
            'max': np.max(data, axis=0)
        }
    else:
        params = {}

    return Transform(name=name, params=params, transform_fn=transform_fn)


def compose_transforms(*transforms: Transform) -> Callable:
    """Compose multiple transforms into a single function."""
    def composed(data):
        result = data
        for transform in transforms:
            result = transform(result)
        return result
    return composed
