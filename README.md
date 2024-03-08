# KnowledgeVIS

[![license](https://img.shields.io/badge/License-MIT-A54046)](https://github.com/AdamCoscia/KnowledgeVIS/blob/main/LICENSE)
[![arxiv badge](https://img.shields.io/badge/arXiv-2403.04758-red)](https://arxiv.org/abs/2403.04758)
[![DOI:10.1109/TVCG.2023.3346713](https://img.shields.io/badge/DOI-10.1109/TVCG.2023.3346713-blue)](https://doi.org/10.1109/TVCG.2023.3346713)

Visually compare fill-in-the-blank LLM prompts to uncover learned biases and associations!

🤔🧠📊🌈🫂

![The KnowledgeVIS System](https://github.com/AdamCoscia/KnowledgeVIS/blob/main/images/knowledgevis.png)

## What is KnowledgeVIS?

Large language models (LLMs) such as BERT and GPT-3 have seen significant improvements in performance on natural language tasks, enabling them to help people answer questions, generate essays, summarize long articles, and more.
Yet **understanding what these models have learned and why they work** is still an open challenge.
For natural language processing (NLP) researchers and engineers who increasingly train and deploy LLMs as ``black boxes'' for generating text, exploring how **learned behaviors** during training manifest in downstream tasks can help them improve model development; e.g., by surfacing **harmful stereotypes**.

KnowledgeVIS is a human-in-the-loop visual analytics system for **comparing fill-in-the-blank prompts** to uncover associations from learned text representations.
KnowledgeVIS helps developers create effective sets of prompts, probe multiple types of relationships between words, test for different associations that have been learned, and find insights across several sets of predictions for any BERT-based language model.

1. First, we designed an intuitive visual interface that structures the query process to encourage both creativity and rapid prompt generation and testing.
2. Then, to reduce the complexity of the prompt prediction space, we developed a novel clustering technique that groups predictions by semantic similarity.
3. Finally, we provided several expressive and interactive text visualizations to promote exploration and discovery of insights at multiple levels of data abstraction: a heat map; a set view inspired by parallel tag clouds; and scatterplot with dust-and-magnet positioning of axes.

Collectively, these visualizations help the user identify the likelihood and uniqueness of individual predictions, compare sets of predictions between prompts, and summarize patterns and relationships between predictions across all prompts.

This code accompanies the research paper:

**[KnowledgeVIS: Interpreting Language Models by Comparing Fill-in-the-Blank Prompts][paper]**  
<span style="opacity: 70%">Adam Coscia, Alex Endert</span>  
_IEEE Transactions on Visualization and Computer Graphics (TVCG), 2023 (to appear)_  
| [📖 Paper][paper] | [▶️ Live Demo][demo] | [🎞️ Demo Video][video] | [🧑‍💻 Code][code] |

## Features

<details>
  <summary> 🌈 Rapid, creative and scalable "fill-in-the-blank" prompt generation interface:</summary>
  <img src="https://github.com/AdamCoscia/KnowledgeVIS/blob/main/images/prompt-interface.png">
</details>

<details>
  <summary> 📊 Automatically cluster semantically-similar responses to reveal high-level patterns:</summary>
  <img src="https://github.com/AdamCoscia/KnowledgeVIS/blob/main/images/clustering.png" width="50%">
</details>

<details>
  <summary> 🔍 Visually explore and discover insights at multiple levels of data abstraction:</summary>
  <img src="https://github.com/AdamCoscia/KnowledgeVIS/blob/main/images/visualizations.png">
</details>

### Demo Video

🎞️ Watch the demo video for a full tutorial here: <https://youtu.be/hBX4rSUMr_I>

## Live Demo

🚀 For a live demo, visit: <https://adamcoscia.com/papers/knowledgevis/demo/>

## Getting Started

🌱 You can test our visualizations on your own LLMs in just a few easy steps!

- Install Python `v3.9.x` ([latest release](https://www.python.org/downloads/release/python-3913/))
- Clone this repo to your computer ([instructions](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository))

```bash
git clone git@github.com:AdamCoscia/KnowledgeVIS.git

# use --depth if you don't want to download the whole commit history
git clone --depth 1 git@github.com:AdamCoscia/KnowledgeVIS.git
```

### Interface

- A frontend vanilla HTML/CSS/JavaScript web app powered by D3.js and Semantic UI!
- Additional details can be found in [interface/README.md](interface/README.md)

Navigate to the interface folder:

```bash
cd interface
```

- If you are running Windows:

```bash
py -3.9 -m http.server
```

- If you are running MacOS / Linux:

```bash
python3.9 -m http.server
```

Navigate to [localhost:8000](http://localhost:8000/). You should see KnowledgeVIS running in your browser :)

### Server

- A backend Python 3.9 Flask web app to run local LLM models downloaded from Hugging Face!
- Additional details can be found in [server/README.md](server/README.md)

Navigate to the server folder:

```bash
cd server
```

Create a virtual environment:

- If you are running Windows:

```bash
# Start a virtual environment
py -3.9 -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate
```

- If you are running MacOS / Linux:

```bash
# Start a virtual environment
python3.9 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Install PyTorch `v2.0.x` ([instructions](https://pytorch.org/get-started/locally/))

> PyTorch is installed separately because some systems may support CUDA, which requires a different installation process and can significantly speed up the tool.

1. First, check if your GPU can support CUDA ([link](https://developer.nvidia.com/cuda-gpus))
2. Then, follow the instructions linked above to determine if your system can support CUDA for computation.

Then run the server:

```bash
python main.py
```

## Credits

Led by <a href='https://adamcoscia.com/' target='_blank'>Adam Coscia</a>, KnowledgeVIS is a result of a collaboration between visualization experts in human centered computing and interaction design from
<img src="https://adamcoscia.com/assets/icons/other/gt-logo.png" alt="Interlocking GT" height="21" style="vertical-align: bottom;"/>
Georgia Tech.
KnowledgeVIS is created by
<a href='https://adamcoscia.com/' target='_blank'>Adam Coscia</a>
and
Alex Endert.

## Citation

To learn more about KnowledgeVIS, please read our [research paper][paper] (to appear in [IEEE TVCG](https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=2945)).

```bibtex
@article{Coscia:2023:KnowledgeVIS,
  author={Coscia, Adam and Endert, Alex},
  journal={IEEE Transactions on Visualization and Computer Graphics},
  title={KnowledgeVIS: Interpreting Language Models by Comparing Fill-in-the-Blank Prompts},
  year={2023},
  volume={},
  number={},
  pages={1-13},
  doi={10.1109/TVCG.2023.3346713}
}
```

## License

The software is available under the [MIT License](https://github.com/AdamCoscia/KnowledgeVIS/blob/main/LICENSE).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/AdamCoscia/KnowledgeVIS/issues) or contact [Adam Coscia](https://adamcoscia.com).

[paper]: https://arxiv.org/abs/2403.04758
[demo]: https://adamcoscia.com/papers/knowledgevis/demo/
[video]: https://youtu.be/hBX4rSUMr_I
[code]: https://github.com/AdamCoscia/KnowledgeVIS
