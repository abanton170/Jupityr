"""
Setup configuration for Jupityr.

A multi-paradigm NLP and gamified learning platform.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README for long description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

setup(
    name="jupityr",
    version="0.1.0",
    author="Jupityr Team",
    description="A multi-paradigm NLP and gamified learning platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/abanton170/Jupityr",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Education",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Text Processing :: Linguistic",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "numpy>=1.21.0",
        "pyyaml>=6.0",
        "toolz>=0.12.0",
        "funcy>=2.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
            "black>=23.0",
            "flake8>=6.0",
            "mypy>=1.0",
        ],
        "ml": [
            "scikit-learn>=1.0",
            "torch>=2.0",
            "transformers>=4.30",
        ],
        "nlp": [
            "spacy>=3.5",
            "nltk>=3.8",
        ],
        "all": [
            "scikit-learn>=1.0",
            "torch>=2.0",
            "transformers>=4.30",
            "spacy>=3.5",
            "nltk>=3.8",
        ],
    },
    entry_points={
        "console_scripts": [
            "jupityr=jupityr.cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)
