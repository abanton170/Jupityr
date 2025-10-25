"""
Functional NLP transformations.

Pure functions for text processing, tokenization, and feature extraction.
"""

from typing import List, Dict, Callable, Iterable
from functools import partial
import re


# Pure text transformation functions
def normalize_text(text: str) -> str:
    """Normalize text to lowercase and remove extra whitespace."""
    return ' '.join(text.lower().split())


def remove_punctuation(text: str, keep: str = "") -> str:
    """Remove punctuation except characters in keep."""
    pattern = f"[^\\w\\s{re.escape(keep)}]"
    return re.sub(pattern, '', text)


def tokenize(text: str, pattern: str = r'\w+') -> List[str]:
    """Tokenize text using regex pattern."""
    return re.findall(pattern, text)


def ngrams(tokens: List[str], n: int) -> List[tuple]:
    """Generate n-grams from tokens."""
    return [tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]


def word_frequencies(tokens: List[str]) -> Dict[str, int]:
    """Calculate word frequencies from tokens."""
    freq = {}
    for token in tokens:
        freq[token] = freq.get(token, 0) + 1
    return freq


# Higher-order functions for text processing
def text_pipeline(*transforms: Callable[[str], str]) -> Callable[[str], str]:
    """Create a text processing pipeline from transform functions."""
    def pipeline(text: str) -> str:
        result = text
        for transform in transforms:
            result = transform(result)
        return result
    return pipeline


def batch_transform(transform: Callable[[str], any]) -> Callable[[Iterable[str]], List[any]]:
    """Convert a single-text transform to a batch transform."""
    def batch_fn(texts: Iterable[str]) -> List[any]:
        return [transform(text) for text in texts]
    return batch_fn


# Common NLP pipelines
basic_clean = text_pipeline(
    normalize_text,
    partial(remove_punctuation, keep="'-")
)


def standard_tokenize(text: str) -> List[str]:
    """Standard tokenization pipeline."""
    return tokenize(basic_clean(text))
