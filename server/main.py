import logging
from os import path, environ
from pathlib import Path

environ["TRANSFORMERS_CACHE"] = "./transformers/"


#
# Data processing packges
#
import pandas as pd
import numpy as np
from sklearn.metrics import silhouette_score
from scipy.cluster.hierarchy import ward, fcluster
from scipy.spatial.distance import squareform


#
# NLP packages
#
import nltk

print("* LOADING WORDNET ...\n")

file_dir_path = path.dirname(path.realpath(__file__))
nltk_data_dir_path = path.join(file_dir_path, "nltk")

Path(nltk_data_dir_path).mkdir(parents=True, exist_ok=True)

nltk.data.path.append(nltk_data_dir_path)
nltk.download("wordnet", download_dir=nltk_data_dir_path)
nltk.download("omw-1.4", download_dir=nltk_data_dir_path)

from nltk.corpus import wordnet as wn


#
# Transformers packages
#
import torch
from transformers import AutoTokenizer, AutoModelForMaskedLM

# Initialize tokenizers and models
print("\n* LOADING TOKENIZERS AND MODELS ...\n")

tok_mod = {
    "bert": {
        "tokenizer": AutoTokenizer.from_pretrained("bert-large-uncased-whole-word-masking"),
        "model_default": AutoModelForMaskedLM.from_pretrained("bert-large-uncased-whole-word-masking"),
    },
    "roberta": {
        "tokenizer": AutoTokenizer.from_pretrained("roberta-large"),
        "model_default": AutoModelForMaskedLM.from_pretrained("roberta-large"),
    },
    "distilbert": {
        "tokenizer": AutoTokenizer.from_pretrained("distilbert-base-uncased"),
        "model_default": AutoModelForMaskedLM.from_pretrained("distilbert-base-uncased"),
    },
    "pubmedbert": {
        "tokenizer": AutoTokenizer.from_pretrained(
            "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext",
        ),
        "model_default": AutoModelForMaskedLM.from_pretrained(
            "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext",
        ),
    },
    "scibert": {
        "tokenizer": AutoTokenizer.from_pretrained("allenai/scibert_scivocab_uncased"),
        "model_default": AutoModelForMaskedLM.from_pretrained("allenai/scibert_scivocab_uncased"),
    },
}

tok_mod["bert"]["model_default"].eval()
tok_mod["roberta"]["model_default"].eval()
tok_mod["distilbert"]["model_default"].eval()
tok_mod["pubmedbert"]["model_default"].eval()
tok_mod["scibert"]["model_default"].eval()

print("\n* TOKENIZERS AND MODELS LOADED.\n")


def get_lch_cluster_labels(unlabeled_groups):
    """Compute the Lowest Common Hypernym (LCH) between all words in an unlabeled group.

    - See: https://www.nltk.org/howto/wordnet_lch.html#wordnet-lowest-common-hypernyms
    - See: https://stackoverflow.com/questions/70026324/looking-for-a-word-web-library-preferably-python?noredirect=1&lq=1

    Returns the same word groups labeled with the LCH or 'other' if no LCH exists.
    """

    def get_lch_all_words(words):
        lch = "other"
        all_hypernyms = {}
        for word in words:
            synsets = wn.synsets(word)  # get synsets of word
            if synsets:
                all_hypernyms[word] = set(
                    self_synset
                    for synset in synsets
                    for self_synsets in synset._iter_hypernym_lists()
                    for self_synset in self_synsets
                )
        if all_hypernyms:
            common_hypernyms = set.intersection(*all_hypernyms.values())
            if common_hypernyms:
                # sort common hypernyms to get lowest common hypernym (LCH)
                lch = sorted(common_hypernyms, key=lambda x: -x.max_depth())[0]
                lch = lch.name().split(".")[0]
        return lch

    print(f"  * Getting LCH of each cluster of words...\n")

    predictions_clusters = []
    labeled_groups = {"other": []}
    for words in unlabeled_groups.values():
        lch = get_lch_all_words(words)
        predictions_clusters += list(map(lambda x: (x, lch), words))
        if lch in labeled_groups:
            labeled_groups[lch] += words
        else:
            labeled_groups[lch] = words

    return predictions_clusters


def get_unlabeled_clusters(matrix, index):
    """Perform clustering on symmetric similarity matrix.

    Option #1: Affinity Propagation
    - See: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AffinityPropagation.html#sklearn.cluster.AffinityPropagation
    - See: https://datascience.stackexchange.com/questions/103/clustering-based-on-similarity-scores
    - See: https://stats.stackexchange.com/questions/123060/clustering-a-long-list-of-strings-words-into-similarity-groups
    - See: https://stats.stackexchange.com/questions/398087/clustering-documents-based-on-pairwise-similarity-and-without-access-to-features

    Option #2: Hierarchical clustering (Ward's method)
    - See: https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.ward.html
    - See: https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.fcluster.html#scipy.cluster.hierarchy.fcluster
    - See: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.silhouette_score.html

    Returns dictionary of numbered (unlabeled) clusters and words belonging to the cluster.
    """
    df = pd.DataFrame(matrix, index=index, columns=index)
    df = df.dropna(how="all").dropna(axis=1, how="all")  # drop columns/rows where word doesn't have score
    df = df.apply(lambda x: 1 - abs(x))  # convert similarity to distance (1 - similarity)

    print(f"  * Performing clustering...\n")

    Z = ward(squareform(df, force="tovector"))  # perform clustering, getting entire linkage matrix

    # get labels for max number of clusters (irrespective of score)
    # labels = fcluster(Z, t=7, criterion="maxclust")

    labels = []
    best_score = 0
    best_n = 2
    max_n = 15
    converged = True
    for n in range(2, df.shape[0] + 1):
        # get labels for optimal number of clusters by selecting cluster with highest silhouette score
        curr_labels = fcluster(Z, t=n, criterion="maxclust")
        curr_score = silhouette_score(df, curr_labels, metric="precomputed")
        if best_score < curr_score:
            # current number of clusters is best so far
            print(f"    * n: {n}, score: {curr_score}")
            best_score = curr_score
            best_n = n
            labels = curr_labels
        if best_n > max_n:
            # stop computing cluster scores if best clusters is above max clusters
            print(f"\n    * Clusters did not converge.\n")
            converged = False
            break

    unlabeled_groups = {}
    if converged:
        print(f"\n  * Clusters converged!\n")
        predictions_clusters_unlabeled = list(zip(df.columns, labels))  # combine label and name lists
        unlabeled_groups = {label: [] for label in labels}  # map labels to list of words sharing that label
        for name, label in predictions_clusters_unlabeled:
            unlabeled_groups[label].append(name)

    return unlabeled_groups, converged


def get_semantic_similarity_matrix(predictions):
    """Calculate similarity pairwise for each unique predicted word.

    Use Wu-Palmer Similarity (taxonomic)
    - See: https://www.nltk.org/howto/wordnet.html#similarity
    - See: https://stackoverflow.com/questions/18629469/what-is-least-common-subsumer-and-how-to-compute-it
    - Return a score denoting how similar two word senses are, based on the
      depth of the two senses in the taxonomy and that of their Least Common
      Subsumer (most specific ancestor node).

    Returns symmetric 2d array of similarity scores.
    """
    n = len(predictions)  # number of words
    matrix = [[1 for _ in range(n)] for _ in range(n)]
    others = set()  # capture words that are not in WordNet as 'other' group

    print(f"  * Calculating similarity scores...\n")

    for i in range(n):
        prediction1 = predictions[i]
        synset1 = wn.synsets(prediction1)  # get set of synonyms
        if len(synset1):
            word1 = synset1[0]  # take first synonym
            for j in range(i + 1, n):
                prediction2 = predictions[j]
                synset2 = wn.synsets(prediction2)  # get set of synonyms
                if len(synset2):
                    word2 = synset2[0]  # take first synonym
                    score = wn.wup_similarity(word1, word2)  # get similarity score
                    matrix[i][j] = score
                    matrix[j][i] = score
                else:
                    # prediction2 is not an "open-class word" (i.e. nouns, verbs, adjectives, and adverbs)
                    others.add(prediction2)
                    matrix[j][j] = np.nan
                    matrix[i][j] = np.nan
                    matrix[j][i] = np.nan
        else:
            # prediction1 is not an "open-class word" (i.e. nouns, verbs, adjectives, and adverbs)
            others.add(prediction1)
            matrix[i][i] = np.nan
            for j in range(i + 1, n):
                matrix[i][j] = np.nan
                matrix[j][i] = np.nan

    return matrix, others


def predict(topk, model_checkpoint, output):
    # get preloaded tokenizer, model
    tokenizer = tok_mod[model_checkpoint]["tokenizer"]
    model_default = tok_mod[model_checkpoint]["model_default"]

    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    model = model_default.to(device)

    # print debug information
    print(f"* RUNNING {model_checkpoint}...\n")
    print(f"  * Returning top {topk} results.")

    # query sentences in each sentence group
    for group in output["groups"]:
        template = group["template"]
        subjects = group["subjects"]

        print("\n  * Sentences:")
        for subject in subjects:
            # get subject and sentence
            sid = subject["id"]
            sname = subject["name"]
            output["subjectsIDKey"][sid] = sname  # save id:subject mapping

            # Pre-process text
            if "[subject]" in template:
                sentence = template.replace("[subject]", sname)
            else:
                sentence = template
            text = sentence.replace("_", tokenizer.mask_token)
            print(f"    * {text}")
            inputs = tokenizer(
                text, add_special_tokens=False, return_tensors="pt"
            )  # tokenize input without special tokens
            # input_ids = inputs.input_ids[0].tolist()
            # input_text_decoded = tokenizer.decode(input_ids)

            # Run the model, find the location of [MASK], and extract its logits
            token_logits = model(**inputs).logits
            mask_token_index = torch.where(inputs["input_ids"] == tokenizer.mask_token_id)[1]
            mask_token_logits = token_logits[0, mask_token_index, :]
            mask_token_probs = torch.nn.functional.softmax(mask_token_logits, dim=-1)

            # Pick the [MASK] candidates with the highest logits (probabilities)
            if topk:
                candidates = torch.topk(mask_token_probs, topk, dim=1, sorted=True)
            else:
                candidates = torch.topk(mask_token_probs, mask_token_probs.size(dim=1), dim=1, sorted=True)

            # Get probabilites
            top_probs = candidates.values[0].tolist()

            # Get words
            top_tokens = candidates.indices[0].tolist()
            top_words = [tokenizer.decode([token]).strip() for token in top_tokens]
            predictions = [{"parent": sid, "name": x[0], "value": x[1]} for x in list(zip(top_words, top_probs))]

            # save data
            output["setViewData"]["children"].append(
                {
                    "id": sid,
                    "name": sname,
                    "template": template,
                    "children": predictions,
                }
            )
            output["heatMapData"] += predictions

    # assign unique ids to each prediction
    i = 1
    index = []
    helper = {}
    for prediction in output["heatMapData"]:
        name = prediction["name"]  # word
        parent = prediction["parent"]  # subject id
        value = prediction["value"]  # percentage
        pid = f"p{i}"  # word id
        if name in helper:
            # word already exists
            helper[name][parent] = value  # {prediction: {subject1: value, subject2: value, ...}, ...}
            pid = helper[name]["id"]  # get existing id
        else:
            # new word
            helper[name] = {"id": pid, "name": name, parent: value}  # create entry
            output["predictionsIDKey"][pid] = name  # save id:name mapping
            output["predictionsNameKey"][name] = pid  # save name:id mapping
            index.append(name)  # save word as index for computing semantic similarity
            i += 1  # increment id
        prediction["id"] = pid  # save id for prediction

    # save scatter plot data
    output["scatterPlotData"] += list(helper.values())

    print(f"\n* {model_checkpoint} FINISHED.")

    print(f"\n* COMPUTING CLUSTERS...\n")

    matrix, other_words = get_semantic_similarity_matrix(index)
    unlabeled_clusters, converged = get_unlabeled_clusters(matrix, index)
    labeled_clusters = []
    if converged:
        labeled_clusters += get_lch_cluster_labels(unlabeled_clusters)
        labeled_clusters += list(map(lambda x: (x, "other"), other_words))
    else:
        labeled_clusters += list(map(lambda x: (x, "other"), index))
    output["predictionsClusters"] = dict(labeled_clusters)

    print(f"* CLUSTERS COMPUTED.\n")


#
# Web app packages
#
from flask import Flask, jsonify, request
from flask_cors import CORS
from waitress import serve

# Start logging
logger = logging.getLogger("waitress")
logger.setLevel(logging.INFO)

# Create Flask app
app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def get_connected():
    return jsonify("Connected!")


@app.route("/getData", methods=["POST"])
def get_explorer_data():
    print("\n\n===\n\n* /getData called\n")

    data_in = request.json  # request is sent as JSON, which is converted to a dict

    print(f"  * data_in: {data_in}\n")

    model = data_in["model"]  #    (String) model type
    topk = int(data_in["topk"])  # (Int)    return top k results
    fill = data_in["fill"]  #      (String) underscore '_'
    groups = data_in["groups"]  #  (List)   [{ template, [{sid1, s1}, {sid2, s2}, ...] }, ...]

    out = {
        "model": model,
        "topk": topk,
        "fill": fill,
        "groups": groups,
        "heatMapData": [],
        "setViewData": {"name": "_root_", "children": []},
        "scatterPlotData": [],
        "subjectsIDKey": {},
        "predictionsIDKey": {},
        "predictionsNameKey": {},
        "predictionsClusters": {},
    }

    predict(topk, model, out)

    return out


if __name__ == "__main__":
    print("* STARTING SERVER ...\n")
    serve(app, port=int(environ.get("PORT", 3000)))
