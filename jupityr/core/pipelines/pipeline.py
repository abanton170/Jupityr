"""
Functional data pipeline implementation.

Uses composition and pure functions for data transformation.
Inspired by toolz and functional programming principles.
"""

from typing import Callable, TypeVar, Iterable, Any
from functools import reduce, wraps
import operator

A = TypeVar('A')
B = TypeVar('B')


def compose(*functions: Callable) -> Callable:
    """
    Compose functions right to left.
    compose(f, g, h)(x) == f(g(h(x)))
    """
    return reduce(lambda f, g: lambda x: f(g(x)), functions, lambda x: x)


def pipe(data: A, *functions: Callable) -> Any:
    """
    Pipe data through a series of functions left to right.
    pipe(x, f, g, h) == h(g(f(x)))
    """
    return reduce(lambda acc, func: func(acc), functions, data)


def curry(func: Callable) -> Callable:
    """
    Simple currying decorator for functions.
    """
    @wraps(func)
    def curried(*args, **kwargs):
        if len(args) + len(kwargs) >= func.__code__.co_argcount:
            return func(*args, **kwargs)
        return lambda *more_args, **more_kwargs: curried(
            *(args + more_args), **{**kwargs, **more_kwargs}
        )
    return curried


class Pipeline:
    """
    Immutable pipeline for data transformations.
    """

    def __init__(self, *transforms: Callable):
        self._transforms = transforms

    def __call__(self, data: Any) -> Any:
        """Execute the pipeline on data."""
        return pipe(data, *self._transforms)

    def then(self, transform: Callable) -> 'Pipeline':
        """Add a transformation to the pipeline (returns new pipeline)."""
        return Pipeline(*self._transforms, transform)

    def __repr__(self) -> str:
        return f"Pipeline({len(self._transforms)} transforms)"


# Common functional operators
@curry
def map_fn(func: Callable[[A], B], iterable: Iterable[A]) -> Iterable[B]:
    """Curried map for better composition."""
    return map(func, iterable)


@curry
def filter_fn(predicate: Callable[[A], bool], iterable: Iterable[A]) -> Iterable[A]:
    """Curried filter for better composition."""
    return filter(predicate, iterable)


@curry
def reduce_fn(func: Callable, iterable: Iterable, initial=None) -> Any:
    """Curried reduce for better composition."""
    if initial is None:
        return reduce(func, iterable)
    return reduce(func, iterable, initial)
