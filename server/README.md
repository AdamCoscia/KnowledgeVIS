# KnowledgeVIS server

To process prompts written in the KnowledgeVIS interface, we use the Hugging Face Transformers API to download transformer models and run a Python Flask server that recieves prompts from the interface, runs the models, and sends the processed data back to the interface.

This version of the server uses Python `3.9`.

The first time you run `main.py` you will download NLTK packages and the Hugging Face Transformers models. This may take a while depending on your download speed.

- The NLTK packages will take up around 35MB of space.
- The Hugging Face transformers will take up around 6.5GB of space.
  - `bert-large-uncased-whole-word-masking` is ~2.5GB.
  - `roberta-large` is ~2.5GB.
  - `distilbert-base-uncased` is ~500MB.
  - `microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext` is ~500MB.
  - `allenai/scibert_scivocab_uncased` is ~500MB.

## Setup

1. Open a command-line shell (Windows) or Terminal (MacOS, Linux) in a new window
2. Navigate to this folder (`server/`)

Windows:

3. Run `py -3.9 -m venv venv`
4. Run `.\venv\Scripts\activate`

MacOS / Linux:

3. Run `python3.9 -m venv venv`
4. Run `source venv/bin/activate`

Both:

5. Run `python -m pip install -r requirements.txt`
6. Install PyTorch `v2.0.x` ([instructions](https://pytorch.org/get-started/locally/))
   - PyTorch is installed separately because some systems may support CUDA, which requires a different installation process and can significantly speed up the tool.
   - First, check if your GPU can support CUDA ([link](https://developer.nvidia.com/cuda-gpus))
   - Then, follow the instructions linked above to determine if your system can support CUDA for computation.
7. Run `python main.py`

## Packages (as of May 2025)

- Flask `v3.1.x`
- Flask-Cors `v5.0.x`
- nltk `v3.9.x`
- numpy `v2.2.x`
- pandas `v2.2.x`
- scikit-learn `v1.6.x`
- scipy `v1.15.x`
- torch `v2.7.x`
- transformers `v4.51.x`
- waitress `v3.0.x`
