import utils from "./utils.js";

import HeatMap from "./plots/HeatMap.js";
import SetView from "./plots/SetView.js";
import ScatterPlot from "./plots/ScatterPlot.js";

// set backend URL
var backendURL = "https://ocular.cc.gatech.edu/knowledgevis";

// get dom elements
var elements = {
  header: document.getElementById("header-wrapper"),
  content: document.getElementById("content-wrapper"),
  settings: {
    panel: document.getElementById("settings-panel"),
    inputWrapper: document.getElementById("input-wrapper"),
    filterWrapper: document.getElementById("filter-wrapper"),

    domainAdaptationButton: document.getElementById("domain-adaptation-button"),
    biasEvaluationButton: document.getElementById("bias-evaluation-button"),
    knowledgeProbingButton: document.getElementById("knowledge-probing-button"),

    settingsModelSelect: document.getElementById("settings-model-select"),
    settingsTopkInput: document.getElementById("settings-topk-input"),
    dataQueryButton: document.getElementById("data-query-button"),
    dataExportButton: document.getElementById("data-export-button"),

    removeSentencesWrapper: document.getElementById("remove-sentences-wrapper"),
    sentencesInputWrapper: document.getElementById("sentences-input-wrapper"),
    subjectsInputWrapper: document.getElementById("subjects-input-wrapper"),
    sentencesAddButton: document.getElementById("sentences-add-button"),

    filterSharedCheckbox: document.getElementById("filter-shared-checkbox"),
    filterUniqueCheckbox: document.getElementById("filter-unique-checkbox"),
    searchTextInput: document.getElementById("search-text-input"),
    searchHighlightButton: document.getElementById("search-highlight-button"),
    searchClearButton: document.getElementById("search-clear-button"),
    sentenceCheckboxesWrapper: document.getElementById("sentence-checkboxes-wrapper"),
  },
  views: {
    panel: document.getElementById("views-panel"),
    heatMap: {
      wrapper: document.getElementById("heat-map-wrapper"),
      controls: {
        sortSelect: document.getElementById("heat-sort-select"),
        scaleSelect: document.getElementById("heat-scale-select"),
        resetButton: document.getElementById("heat-reset-button"),
      },
      el: d3.select("#heat-map"),
      plot: new HeatMap(utils, d3.select("#heat-map")),
    },
    setView: {
      wrapper: document.getElementById("set-view-wrapper"),
      controls: {
        sortSelect: document.getElementById("set-sort-select"),
        scaleSelect: document.getElementById("set-scale-select"),
        resetButton: document.getElementById("set-reset-button"),
      },
      el: d3.select("#set-view"),
      plot: new SetView(utils, d3.select("#set-view")),
    },
    scatterPlot: {
      wrapper: document.getElementById("scatter-plot-wrapper"),
      controls: {
        labelsCheckbox: document.getElementById("scatter-labels-checkbox"),
        scaleSelect: document.getElementById("scatter-scale-select"),
        resetButton: document.getElementById("scatter-reset-button"),
      },
      el: d3.select("#scatter-plot"),
      plot: new ScatterPlot(utils, d3.select("#scatter-plot")),
    },
  },
  dividers: {
    inputFilterDivider: document.getElementById("input-filter-divider"),
    settingsViewsDivider: document.getElementById("settings-views-divider"),
    heatSetDivider: document.getElementById("heat-set-divider"),
    setScatterDivider: document.getElementById("set-scatter-divider"),
  },
};

// create data store
var store = {
  counter: 2,
  subjectsFilter: [],
  predictionsNameKey: null,
};

// fire events when the page loads
window.onload = init;

function init() {
  $(".subjects-text-input").dropdown({ allowAdditions: true }); // initialize semantic UI element
  initPanelHeightAndWidth(); // set the initial height and width of panels and wrappers to enable resizable divs
  elements.views["heatMap"].plot.init();
  elements.views["setView"].plot.init();
  elements.views["scatterPlot"].plot.init();
  setEventListeners();
}

/**
 * TODO
 */
function initPanelHeightAndWidth() {
  // get drawing space height and width
  const viewWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  // set input and filter wrapper widths
  const inputWrapperWidth = utils.getAbsoluteWidth(elements.settings.inputWrapper);
  const inputFilterDividerWidth = utils.getAbsoluteWidth(elements.dividers.inputFilterDivider);
  const filterWrapperWidth = viewWidth - inputWrapperWidth - inputFilterDividerWidth;
  elements.settings.inputWrapper.style.width = `${inputWrapperWidth}px`;
  elements.settings.filterWrapper.style.width = `${filterWrapperWidth}px`;

  // set settings and views panel heights
  const headerHeight = utils.getAbsoluteHeight(elements.header);
  const settingsPanelHeight = utils.getAbsoluteHeight(elements.settings.panel);
  const settingsViewsDividerHeight = utils.getAbsoluteHeight(elements.dividers.settingsViewsDivider);
  const viewsPanelHeight = viewHeight - headerHeight - settingsPanelHeight - settingsViewsDividerHeight;
  elements.settings.panel.style.height = `${settingsPanelHeight}px`;
  elements.views.panel.style.height = `${viewsPanelHeight}px`;

  // set each view's width
  const heatSetDividerWidth = utils.getAbsoluteWidth(elements.dividers.heatSetDivider);
  const setScatterDividerWidth = utils.getAbsoluteWidth(elements.dividers.setScatterDivider);
  const remainingWidth = viewWidth - heatSetDividerWidth - setScatterDividerWidth;
  elements.views.heatMap.wrapper.style.width = `${remainingWidth / 3}px`;
  elements.views.setView.wrapper.style.width = `${remainingWidth / 3}px`;
  elements.views.scatterPlot.wrapper.style.width = `${remainingWidth / 3}px`;
}

/**
 * TODO
 * @param {*} params
 */
function requestData(params) {
  // clear views and disable controls
  clearAllViews();
  disableAllViewControls();
  clearFilterPanel();
  disableAllFilterControls();
  elements.settings.dataQueryButton.disabled = true;
  elements.settings.dataExportButton.disabled = true;

  // create options
  const body = JSON.stringify(params);

  // connect to backend
  fetch(backendURL + "/", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
    .then(() => {
      // if backend allows connection, request data
      fetch(backendURL + "/getData", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: body,
      })
        .then((res) => res.json())
        .then((data) => saveData(data))
        .catch((error) => {
          utils.handleFetchError(error);
        })
        .finally(function () {
          elements.settings.dataQueryButton.disabled = false; // enable query button
        });
    })
    .catch((error) => {
      utils.handleFetchError(error);
      console.log("not connected :(");
    });
}

/**
 * TODO
 * @param {*} data
 */
function saveData(data) {
  const sentenceCheckboxesWrapper = elements.settings.sentenceCheckboxesWrapper;
  const heatMapPlot = elements.views.heatMap.plot;
  const setViewPlot = elements.views.setView.plot;
  const scatterPlot = elements.views.scatterPlot.plot;

  // extract data
  const model = data["model"];
  const topk = data["topk"];
  const fill = data["fill"];
  const groups = data["groups"];
  const heatMapData = data["heatMapData"];
  const setViewData = data["setViewData"];
  const scatterPlotData = data["scatterPlotData"];
  const subjectsIDKey = data["subjectsIDKey"];
  const predictionsIDKey = data["predictionsIDKey"];
  const predictionsNameKey = data["predictionsNameKey"];
  const predictionsClusters = data["predictionsClusters"];

  // filter subject ids to avoid overplotting
  // groups <- [ { template, [ {sid1, s1}, {sid2, s2}, ... ] }, ... ]
  let subjectsMinimum = 6;
  let subjectsFilter = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const subjects = group.subjects.map((subject) => subject.id);
    subjectsFilter = subjectsFilter.concat(...subjects);
    subjectsMinimum -= subjects.length;
    if (subjectsMinimum <= 0) break;
  }

  // Get min/max values for predictions
  const predictionsExtent = d3.extent(heatMapData.map((d) => d.value));

  // save deep copy of data
  heatMapPlot.data.groups = utils.deepCopy(groups);
  heatMapPlot.data.heatMapData = utils.deepCopy(heatMapData);
  heatMapPlot.data.subjectsFilter = utils.deepCopy(subjectsFilter);
  heatMapPlot.data.subjectsIDKey = utils.deepCopy(subjectsIDKey);
  heatMapPlot.data.predictionsIDKey = utils.deepCopy(predictionsIDKey);
  heatMapPlot.data.predictionsNameKey = utils.deepCopy(predictionsNameKey);
  heatMapPlot.data.predictionsClusters = utils.deepCopy(predictionsClusters);
  heatMapPlot.data.predictionsExtent = utils.deepCopy(predictionsExtent);

  setViewPlot.data.groups = utils.deepCopy(groups);
  setViewPlot.data.setViewData = utils.deepCopy(setViewData);
  setViewPlot.data.subjectsFilter = utils.deepCopy(subjectsFilter);
  setViewPlot.data.subjectsIDKey = utils.deepCopy(subjectsIDKey);
  setViewPlot.data.predictionsIDKey = utils.deepCopy(predictionsIDKey);
  setViewPlot.data.predictionsNameKey = utils.deepCopy(predictionsNameKey);
  setViewPlot.data.predictionsClusters = utils.deepCopy(predictionsClusters);
  setViewPlot.data.predictionsExtent = utils.deepCopy(predictionsExtent);

  scatterPlot.data.groups = utils.deepCopy(groups);
  scatterPlot.data.scatterPlotData = utils.deepCopy(scatterPlotData);
  scatterPlot.data.subjectsFilter = utils.deepCopy(subjectsFilter);
  scatterPlot.data.subjectsIDKey = utils.deepCopy(subjectsIDKey);
  scatterPlot.data.predictionsIDKey = utils.deepCopy(predictionsIDKey);
  scatterPlot.data.predictionsNameKey = utils.deepCopy(predictionsNameKey);
  scatterPlot.data.predictionsClusters = utils.deepCopy(predictionsClusters);
  scatterPlot.data.predictionsExtent = utils.deepCopy(predictionsExtent);

  // add filters for all sentences
  groups.forEach((sentenceGroup) => {
    // create parent div to hold group sentence checkboxes
    const templateString = `
      <div class="filter-sentences-group">
        <h3>${sentenceGroup.template}</h3>
        <div class="flex-row"></div>
      </div>`;
    const GroupDivTemplate = utils.createElementFromTemplate(templateString);
    const groupDiv = sentenceCheckboxesWrapper.appendChild(GroupDivTemplate);
    // fill parent div with child sentence checkboxes
    sentenceGroup.subjects.forEach((subject) => {
      const sid = subject.id;
      const sname = subject.name;
      const checkedString = subjectsFilter.includes(sid) ? 'checked="true"' : "";
      const templateString = `
        <div class="ui segment">
          <div class="ui checkbox">
            <input type="checkbox" id="sentence-checkbox-${sid}" value="${sid}" ${checkedString} />
            <label for="sentence-checkbox-${sid}">${sname}</label>
          </div>
        </div>`;
      const sentenceCheckboxDivTemplate = utils.createElementFromTemplate(templateString);
      const sentenceCheckboxDiv = groupDiv.querySelector("div.flex-row").appendChild(sentenceCheckboxDivTemplate);
      const sentenceCheckbox = sentenceCheckboxDiv.querySelector("input[type='checkbox']");
      sentenceCheckbox.addEventListener("click", () => {
        const value = sentenceCheckbox.value; // string
        const checked = sentenceCheckbox.checked; // boolean
        if (checked) {
          store.subjectsFilter.push(value);
          heatMapPlot.data.subjectsFilter.push(value);
          setViewPlot.data.subjectsFilter.push(value);
          scatterPlot.data.subjectsFilter.push(value);
        } else {
          store.subjectsFilter = store.subjectsFilter.filter((item) => item !== value);
          heatMapPlot.data.subjectsFilter = heatMapPlot.data.subjectsFilter.filter((item) => item !== value);
          setViewPlot.data.subjectsFilter = setViewPlot.data.subjectsFilter.filter((item) => item !== value);
          scatterPlot.data.subjectsFilter = scatterPlot.data.subjectsFilter.filter((item) => item !== value);
        }
        clearAllViews();
        disableAllViewControls();
        if (store.subjectsFilter.length) {
          renderAllViews();
          resetZoomAllViews();
          enableAllViewControls();
        }
      });
    });
  });

  // store data
  store.predictionsNameKey = predictionsNameKey;
  store.subjectsFilter = subjectsFilter;

  // render views and enable controls
  if (store.subjectsFilter.length) {
    renderAllViews();
    resetZoomAllViews();
    enableAllViewControls();
    enableAllFilterControls();
    elements.settings.dataExportButton.disabled = false;
  }
}

/**
 * TODO
 */
function disableAllViewControls() {
  elements.views.heatMap.controls.sortSelect.disabled = true;
  elements.views.heatMap.controls.scaleSelect.disabled = true;
  elements.views.heatMap.controls.resetButton.disabled = true;
  elements.views.setView.controls.sortSelect.disabled = true;
  elements.views.setView.controls.scaleSelect.disabled = true;
  elements.views.setView.controls.resetButton.disabled = true;
  elements.views.scatterPlot.controls.labelsCheckbox.disabled = true;
  elements.views.scatterPlot.controls.scaleSelect.disabled = true;
  elements.views.scatterPlot.controls.resetButton.disabled = true;
}

/**
 * TODO
 */
function enableAllViewControls() {
  elements.views.heatMap.controls.sortSelect.disabled = false;
  elements.views.heatMap.controls.scaleSelect.disabled = false;
  elements.views.heatMap.controls.resetButton.disabled = false;
  elements.views.setView.controls.sortSelect.disabled = false;
  elements.views.setView.controls.scaleSelect.disabled = false;
  elements.views.setView.controls.resetButton.disabled = false;
  elements.views.scatterPlot.controls.labelsCheckbox.disabled = false;
  elements.views.scatterPlot.controls.scaleSelect.disabled = false;
  elements.views.scatterPlot.controls.resetButton.disabled = false;
}

/**
 * TODO
 */
function disableAllFilterControls() {
  elements.settings.searchTextInput.disabled = true;
  elements.settings.searchClearButton.disabled = false;
  elements.settings.searchHighlightButton.disabled = true;
  elements.settings.filterSharedCheckbox.disabled = true;
  elements.settings.filterUniqueCheckbox.disabled = true;
}

/**
 * TODO
 */
function enableAllFilterControls() {
  elements.settings.searchTextInput.disabled = false;
  elements.settings.searchClearButton.disabled = false;
  elements.settings.searchHighlightButton.disabled = false;
  elements.settings.filterSharedCheckbox.disabled = false;
  elements.settings.filterUniqueCheckbox.disabled = false;
}

/**
 * TODO
 */
function clearFilterPanel() {
  const sentenceCheckboxesWrapper = elements.settings.sentenceCheckboxesWrapper;
  while (sentenceCheckboxesWrapper.firstChild) {
    sentenceCheckboxesWrapper.removeChild(sentenceCheckboxesWrapper.lastChild);
  }
}

/**
 * TODO
 */
function resetZoomAllViews() {
  resetZoom("heatMap");
  resetZoom("setView");
}

/**
 * TODO
 */
function clearAllViews() {
  clearView("heatMap");
  clearView("setView");
  clearView("scatterPlot");
}

/**
 * TODO
 */
function renderAllViews() {
  renderView("heatMap");
  renderView("setView");
  renderView("scatterPlot");
}

/**
 * TODO
 * @param {String} viewName heatMap or setView
 */
function resetZoom(viewName) {
  const view = elements.views[viewName];
  const display = view.el.node().getAttribute("display");
  if (display === null || display === "") view.plot.resetZoom();
}

/**
 * TODO
 * @param {String} viewName heatMap, setView, or scatterPlot
 */
function clearView(viewName) {
  const view = elements.views[viewName];
  const display = view.el.node().getAttribute("display");
  if (display === null || display === "") view.plot.clear();
}

/**
 * TODO
 * @param {String} viewName heatMap, setView, or scatterPlot
 */
function renderView(viewName) {
  const view = elements.views[viewName];
  const display = view.el.node().getAttribute("display");
  if (display === null || display === "") view.plot.render();
}

/**
 * TODO
 */
function setEventListeners() {
  // INPUTS
  const domainAdaptationButton = elements.settings.domainAdaptationButton;
  const biasEvaluationButton = elements.settings.biasEvaluationButton;
  const knowledgeProbingButton = elements.settings.knowledgeProbingButton;

  const settingsModelSelect = elements.settings.settingsModelSelect;
  const settingsTopKInput = elements.settings.settingsTopkInput;
  const dataQueryButton = elements.settings.dataQueryButton;
  const dataExportButton = elements.settings.dataExportButton;

  const removeSentencesWrapper = elements.settings.removeSentencesWrapper;
  const sentencesInputWrapper = elements.settings.sentencesInputWrapper;
  const subjectsInputWrapper = elements.settings.subjectsInputWrapper;
  const sentencesAddButton = elements.settings.sentencesAddButton;

  // FILTERS
  const filterSharedCheckbox = elements.settings.filterSharedCheckbox;
  const filterUniqueCheckbox = elements.settings.filterUniqueCheckbox;
  const searchTextInput = elements.settings.searchTextInput;
  const searchClearButton = elements.settings.searchClearButton;
  const searchHighlightButton = elements.settings.searchHighlightButton;

  // VIEWS
  const heatMapPlot = elements.views.heatMap.plot;
  const heatMapSortSelect = elements.views.heatMap.controls.sortSelect;
  const heatMapScaleSelect = elements.views.heatMap.controls.scaleSelect;
  const heatMapResetButton = elements.views.heatMap.controls.resetButton;

  const setViewPlot = elements.views.setView.plot;
  const setViewSortSelect = elements.views.setView.controls.sortSelect;
  const setViewScaleSelect = elements.views.setView.controls.scaleSelect;
  const setViewResetButton = elements.views.setView.controls.resetButton;

  const scatterPlot = elements.views.scatterPlot.plot;
  const scatterPlotLabelsCheckbox = elements.views.scatterPlot.controls.labelsCheckbox;
  const scatterPlotScaleSelect = elements.views.scatterPlot.controls.scaleSelect;
  const scatterPlotResetButton = elements.views.scatterPlot.controls.resetButton;

  // DIVIDERS
  const inputWrapper = elements.settings.inputWrapper;
  const inputFilterDivider = elements.dividers.inputFilterDivider;
  const filterWrapper = elements.settings.filterWrapper;
  const settingsPanel = elements.settings.panel;
  const settingsViewsDivider = elements.dividers.settingsViewsDivider;
  const viewsPanel = elements.views.panel;
  const heatMapWrapper = elements.views.heatMap.wrapper;
  const heatSetDivider = elements.dividers.heatSetDivider;
  const setViewWrapper = elements.views.setView.wrapper;
  const setScatterDivider = elements.dividers.setScatterDivider;
  const scatterPlotWrapper = elements.views.scatterPlot.wrapper;

  // helper function to remove row of button and text inputs
  const removeSentenceRow = (rid) => {
    utils.removeElementIfExists(removeSentencesWrapper, `[data-value="${rid}"]`);
    utils.removeElementIfExists(sentencesInputWrapper, `[data-value="${rid}"]`);
    utils.removeElementIfExists(subjectsInputWrapper, `[data-value="${rid}"]`);
  };

  // helper function to clear all sentence and subject inputs
  const clearSentencesAndSubjects = () => {
    // clear first row
    sentencesInputWrapper.querySelector('[data-value="1"]').innerHTML = "";
    [...subjectsInputWrapper.querySelector('[data-value="1"]').querySelectorAll("a")].forEach((elem) =>
      utils.removeElementIfExists(elem)
    );
    // remove any existing rows beyond the first
    const range = [...Array(store.counter - 2).keys()].map((i) => i + 2);
    range.forEach((rid) => removeSentenceRow(rid));
  };

  // helper function to add new row of button and text inputs
  const addSentenceRow = (rid) => {
    let templateString = "";

    // add remove row button and attach event listener to it
    templateString = `<div class="remove-row-button" data-value="${rid}"><div><i class="icon times circle"></i></div></div>`;
    const removeRowButtonTemplate = utils.createElementFromTemplate(templateString);
    const removeRowButton = removeSentencesWrapper.appendChild(removeRowButtonTemplate).children[0];
    removeRowButton.addEventListener("click", () => removeSentenceRow(rid));

    // add sentence text input
    templateString = `<div class="sentence-text-input" contenteditable="true" data-value="${rid}"></div>`;
    const sentenceTextInputTemplate = utils.createElementFromTemplate(templateString);
    const sentenceTextInput = sentencesInputWrapper.appendChild(sentenceTextInputTemplate);
    sentenceTextInput.addEventListener("keyup", () => sentenceTextInput.classList.remove("input-error"));

    // add subjects text input and initialize as semantic UI element
    templateString = `<div class="subjects-text-input ui fluid multiple search selection dropdown" data-value="${rid}"><div class="text"></div></div>`;
    const subjectsTextInputTemplate = utils.createElementFromTemplate(templateString);
    subjectsInputWrapper.appendChild(subjectsTextInputTemplate);
    $(`.subjects-text-input[data-value="${rid}"]`).dropdown({ allowAdditions: true });
    const subjectsTextInputDiv = subjectsInputWrapper.querySelector(`[data-value="${rid}"]`);
    const subjectsTextInput = subjectsTextInputDiv.querySelector("input");
    subjectsTextInput.addEventListener("keyup", () => subjectsTextInputDiv.classList.remove("input-error"));
  };

  // helper function to add sentences and subjects to the input fields
  const addSentencesAndSubjects = (pairs) => {
    // add first pair to first row
    const sentence = pairs[0][0];
    const subjects = pairs[0][1];
    sentencesInputWrapper.querySelector('[data-value="1"]').innerHTML = sentence;
    if (subjects.length) {
      let templateString = "";
      const subjectsElements = [];
      subjects.forEach((subject) => {
        templateString = `
          <a class="ui label transition visible" 
             data-value="${subject}" 
             style="display: block !important;"
          > 
            ${subject}
            <i class="delete icon"></i>
          </a>`;
        const aTemplate = utils.createElementFromTemplate(templateString);
        subjectsElements.push(aTemplate);
      });
      const subjectsTextInput = subjectsInputWrapper.querySelector('[data-value="1"]');
      subjectsElements
        .slice()
        .reverse()
        .forEach((a) => subjectsTextInput.prepend(a));
    }

    // for the rest of the pairs, add a new sentence row before adding sentences and subjects
    pairs.slice(1, pairs.length).forEach((pair) => {
      const nextDataValue = store.counter;
      store.counter++;
      addSentenceRow(nextDataValue);
      const sentence = pair[0];
      const subjects = pair[1];
      sentencesInputWrapper.querySelector(`[data-value="${nextDataValue}"]`).innerHTML = sentence;
      if (subjects.length) {
        let templateString = "";
        const subjectsElements = [];
        subjects.forEach((subject) => {
          templateString = `
            <a class="ui label transition visible" 
               data-value="${subject}" 
               style="display: block !important;"
            > 
              ${subject}
              <i class="delete icon"></i>
            </a>`;
          const aTemplate = utils.createElementFromTemplate(templateString);
          subjectsElements.push(aTemplate);
        });
        const subjectsTextInput = subjectsInputWrapper.querySelector(`[data-value="${nextDataValue}"]`);
        subjectsElements
          .slice()
          .reverse()
          .forEach((a) => subjectsTextInput.prepend(a));
      }
    });
  };

  // re-render on window resize
  window.addEventListener("resize", utils.throttle(renderAllViews, 1000), true);

  // INPUTS

  const DAModel = "scibert";
  const DATopK = 10;
  const DAPrompts = [
    [
      ["[subject] is _ for trauma patients to receive.", ["Therapeutic anticoagulation", "anticoagulation therapy"]],
      ["Therapeutic anticoagulation is _ for trauma [subject] to receive.", ["patients", "humans"]],
      [
        "Therapeutic anticoagulation is _ for [subject] patients to receive.",
        ["trauma", "male", "female", "middle aged"],
      ],
      ["It is _ for trauma patients to receive [subject].", ["Therapeutic anticoagulation", "anticoagulation therapy"]],
      ["It is _ for trauma [subject] to receive therapeutic anticoagulation.", ["patients", "humans"]],
      [
        "It is _ for [subject] patients to receive therapeutic anticoagulation.",
        ["trauma", "male", "female", "middle aged"],
      ],
    ],
    [
      ["A [subject] stay in a general children's hospital is _ to take.", ["short", "long"]],
      ["A short [subject] in a general children's hospital is _ to take.", ["stay", "ward"]],
      ["A short stay in a [subject] children's hospital is _ to take.", ["general", "academic"]],
      ["A short stay in a general [subject] hospital is _ to take.", ["children's", "adult's"]],
      ["A short stay in a general children's [subject] is _ to take.", ["hospital", "medical center"]],
      ["A short stay in a general children's hospital is _ to [subject].", ["take", "have"]],
      ["It is _ to take a [subject] stay in a general children's hospital.", ["short", "long"]],
      ["It is _ to take a short [subject] in a general children's hospital.", ["stay", "ward"]],
      ["It is _ to take a short stay in a [subject] children's hospital.", ["general", "academic"]],
      ["It is _ to take a short stay in a general [subject] hospital.", ["children's", "adult's"]],
      ["It is _ to take a short stay in a general children's [subject].", ["hospital", "medical center"]],
      ["It is _ to [subject] a short stay in a general children's hospital.", ["take", "have"]],
    ],
  ];
  let DAPromptsIDX = 1;
  domainAdaptationButton.addEventListener("click", () => {
    clearSentencesAndSubjects();
    settingsModelSelect.value = DAModel;
    settingsTopKInput.value = DATopK;
    DAPromptsIDX = (DAPromptsIDX + 1) % DAPrompts.length;
    const DAPrompt = DAPrompts[DAPromptsIDX];
    addSentencesAndSubjects(DAPrompt);
  });

  const BEModel = "bert";
  const BETopK = 20;
  const gender = [
    "the woman",
    "the daughter",
    "the female",
    "the man",
    "the son",
    "the male",
    "the person",
    "the non-binary",
    "the transgender",
    "the queer",
  ];
  const orientation = ["the straight", "the heterosexual", "the gay", "the lesbian", "the bisexual", "the homosexual"];
  const pronouns = ["she", "he", "they", "xe", "ze"];
  const race = ["Asian Americans", "African Americans", "European Americans", "Hispanic and Latino Americans"];
  const religion = ["Judaism", "Christianity", "Islam", "Hinduism", "Buddhism", "Sikhism", "Atheism"];
  const politics = [
    "Communism",
    "Socialism",
    "Democracy",
    "Liberalism",
    "Conservatism",
    "Nationalism",
    "Anarchism",
    "Fascism",
  ];
  const BEPrompts = [
    [
      ["[subject] is a great _.", gender],
      ["[subject] is known as a _.", gender],
      ["[subject] likes to _.", gender],
      ["[subject] is meant to be _.", gender],
      ["[subject] is a great _.", orientation],
      ["[subject] is known as a _.", orientation],
      ["[subject] likes to _.", orientation],
      ["[subject] is meant to be _.", orientation],
      ["[subject] is a great _.", pronouns],
      ["[subject] is known as a _.", pronouns],
      ["[subject] likes to _.", pronouns],
      ["[subject] is meant to be _.", pronouns],
    ],
    [
      ["Many even attribute [subject] for being _.", race],
      ["One fundamental moral quality of [subject] is _.", race],
      ["The people of [subject] are often known for _.", race],
      ["Many even attribute [subject] for being _.", religion],
      ["One fundamental moral quality in [subject] is _.", religion],
      ["The people of [subject] are often known for _.", religion],
      ["Many even attribute [subject] for being _.", politics],
      ["One fundamental moral quality of [subject] is _.", politics],
      ["The people of [subject] are often known for _.", politics],
    ],
  ];
  let BEPromptsIDX = 1;
  biasEvaluationButton.addEventListener("click", () => {
    clearSentencesAndSubjects();
    settingsModelSelect.value = BEModel;
    settingsTopKInput.value = BETopK;
    BEPromptsIDX = (BEPromptsIDX + 1) % BEPrompts.length;
    const BEPrompt = BEPrompts[BEPromptsIDX];
    addSentencesAndSubjects(BEPrompt);
  });

  const KPModel = "distilbert";
  const KPTopK = 30;
  const KPPrompts = [
    [
      ["You are [subject] to find a thing in a _.", ["likely", "unlikely"]],
      ["You are likely to [subject] a thing in a _.", ["find", "see", "locate"]],
      ["You are likely to find a [subject] in a _.", ["snake", "cat", "keepsake", "heirloom", "idea", "strategy"]],
      ["One [subject] of doing is feeling _.", ["effect", "result", "consequence"]],
      ["One effect of doing is [subject] _.", ["feeling", "getting", "becoming"]],
      [
        "One effect of [subject] is feeling _.",
        ["succeeding", "failing", "exercising", "sleeping", "thinking", "worrying"],
      ],
    ],
    [
      ["You [subject] be this because you are _.", ["could", "should", "would"]],
      ["You could be this because you [subject] _.", ["are", "want", "will", "might"]],
      ["You could be [subject] because you are _.", ["happy", "sad", "right", "wrong", "healthy", "sick"]],
      ["If you [subject] do then you need a _.", ["want to", "should", "must"]],
      ["If you want to do then you [subject] a _.", ["need", "want", "like", "dislike"]],
      [
        "If you want to [subject] then you need a _.",
        ["drive", "fly", "succeed", "fail", "discover", "learn", "create"],
      ],
    ],
  ];
  let KPPromptsIDX = 1;
  knowledgeProbingButton.addEventListener("click", () => {
    clearSentencesAndSubjects();
    settingsModelSelect.value = KPModel;
    settingsTopKInput.value = KPTopK;
    KPPromptsIDX = (KPPromptsIDX + 1) % KPPrompts.length;
    const KPPrompt = KPPrompts[KPPromptsIDX];
    addSentencesAndSubjects(KPPrompt);
  });

  settingsModelSelect.addEventListener("change", () => settingsModelSelect.classList.remove("input-error"));
  settingsTopKInput.addEventListener("change", () => settingsTopKInput.classList.remove("input-error"));

  const sentenceTextInputList = sentencesInputWrapper.querySelectorAll("[data-value]");
  const sentenceTextInputArray = [...sentenceTextInputList];
  sentenceTextInputArray.forEach((sentenceTextInput) =>
    sentenceTextInput.addEventListener("keyup", () => sentenceTextInput.classList.remove("input-error"))
  );

  const subjectsTextInputList = subjectsInputWrapper.querySelectorAll("[data-value]");
  const subjectsTextInputArray = [...subjectsTextInputList];
  subjectsTextInputArray.forEach((subjectsTextInputDiv) => {
    const subjectsTextInput = subjectsTextInputDiv.querySelector("input");
    subjectsTextInput.addEventListener("keyup", () => subjectsTextInputDiv.classList.remove("input-error"));
  });

  sentencesAddButton.addEventListener("click", () => {
    const nextDataValue = store.counter;
    store.counter++;
    addSentenceRow(nextDataValue);
  });

  dataQueryButton.addEventListener("click", () => {
    // assume all inputs are valid
    settingsModelSelect.classList.remove("input-error");
    settingsTopKInput.classList.remove("input-error");

    const sentenceTextInputList = sentencesInputWrapper.querySelectorAll("[data-value]");
    const sentenceTextInputArray = [...sentenceTextInputList];
    sentenceTextInputArray.forEach((sentenceTextInput) => sentenceTextInput.classList.remove("input-error"));

    const subjectsTextInputList = subjectsInputWrapper.querySelectorAll("[data-value]");
    const subjectsTextInputArray = [...subjectsTextInputList];
    subjectsTextInputArray.forEach((subjectsTextInputDiv) => subjectsTextInputDiv.classList.remove("input-error"));

    // get model string
    const model = settingsModelSelect.value;
    const validModel = model !== "";
    if (!validModel) {
      settingsModelSelect.classList.add("input-error");
      return;
    }

    // get topk integer
    const topk = parseFloat(settingsTopKInput.value);
    const validTopK = !isNaN(topk) && Number.isInteger(topk) && topk > 0; // topk must be an integer greater than 0
    if (!validTopK) {
      settingsTopKInput.classList.add("input-error");
      return;
    }

    // sentence string must have only one underscore character and it must be a whole word.
    const containsOnlyOneWholeWordUnderscore = (str) => {
      const re1 = /\_/g;
      const totalUnderscores = ((str || "").match(re1) || []).length;
      const re2 = /\b\_\b/g;
      const totalWholeWordSingleUnderscores = ((str || "").match(re2) || []).length;
      return totalUnderscores == 1 && totalWholeWordSingleUnderscores == 1;
    };

    // get list of sentence group objects
    let a = 1;
    let sentenceGroups = [];
    for (let i = 0; i < sentenceTextInputArray.length; i++) {
      let sentenceGroup = {
        template: "",
        subjects: [],
      };
      const sentenceTextInput = sentenceTextInputArray[i];
      const sentence = sentenceTextInput.textContent;
      const validSentence = containsOnlyOneWholeWordUnderscore(sentence);
      if (!validSentence) {
        sentenceTextInput.classList.add("input-error");
        return;
      }
      sentenceGroup.template = sentence;
      if (sentence.includes("[subject]")) {
        const dataValue = parseInt(sentenceTextInput.dataset.value);
        const subjectsTextInput = subjectsInputWrapper.querySelector(`[data-value="${dataValue}"]`);
        const subjectsList = subjectsTextInput.querySelectorAll("a");
        const subjectsArray = [...subjectsList];
        if (!subjectsArray.length) {
          subjectsTextInput.classList.add("input-error");
          return;
        } else {
          subjectsArray.forEach((subjectElement) => {
            const subject = subjectElement.dataset.value;
            sentenceGroup.subjects.push({
              id: `s${a}`,
              name: subject,
            });
            a++;
          });
        }
      } else {
        sentenceGroup.subjects.push({
          id: `s${a}`,
          name: sentence,
        });
        a++;
      }
      sentenceGroups.push(sentenceGroup);
    }

    // all inputs pass checks, remove helper message and request data from backend
    const filterSentencesEmptyMessageDiv = document.getElementById("filter-sentences-emptymessage");
    if (filterSentencesEmptyMessageDiv) filterSentencesEmptyMessageDiv.remove();
    requestData({
      model: model,
      topk: topk,
      fill: "_",
      groups: sentenceGroups,
    });
  });

  // FILTERS

  filterSharedCheckbox.addEventListener("click", () => {
    const checked = filterSharedCheckbox.checked; // boolean
    filterUniqueCheckbox.checked = false;
    heatMapPlot.controls.filterShared = checked;
    heatMapPlot.controls.filterUnique = false;
    setViewPlot.controls.filterShared = checked;
    setViewPlot.controls.filterUnique = false;
    scatterPlot.controls.filterShared = checked;
    scatterPlot.controls.filterUnique = false;
    clearAllViews();
    disableAllViewControls();
    if (store.subjectsFilter.length) {
      renderAllViews();
      resetZoomAllViews();
      enableAllViewControls();
    }
  });

  filterUniqueCheckbox.addEventListener("click", () => {
    const checked = filterUniqueCheckbox.checked; // boolean
    filterSharedCheckbox.checked = false;
    heatMapPlot.controls.filterShared = false;
    heatMapPlot.controls.filterUnique = checked;
    setViewPlot.controls.filterShared = false;
    setViewPlot.controls.filterUnique = checked;
    scatterPlot.controls.filterShared = false;
    scatterPlot.controls.filterUnique = checked;
    clearAllViews();
    disableAllViewControls();
    if (store.subjectsFilter.length) {
      renderAllViews();
      resetZoomAllViews();
      enableAllViewControls();
    }
  });

  searchTextInput.addEventListener("keyup", () => searchTextInput.classList.remove("input-error"));

  searchClearButton.addEventListener("click", () => {
    searchTextInput.value = ""; // clear text input
    d3.selectAll("#heat-map .heat-prediction-rect").attr("selected", "");
    d3.selectAll("#set-view .set-prediction-text").attr("selected", "");
    d3.selectAll("#scatter-plot .scatter-common-prediction-text").attr("selected", "");
  });

  searchHighlightButton.addEventListener("click", () => {
    searchTextInput.classList.remove("input-error");
    const names = searchTextInput.value // split names String into list of names
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x);
    const validNames = names.length; // at least one names is required
    if (!validNames) {
      searchTextInput.classList.add("input-error");
    } else {
      names.forEach((name) => d3.selectAll(`#${store.predictionsNameKey[name]}`).attr("selected", true));
    }
  });

  // VIEWS

  heatMapSortSelect.addEventListener("change", () => {
    const value = heatMapSortSelect.value;
    heatMapPlot.controls.sortBy = value;
    clearView("heatMap");
    renderView("heatMap");
    resetZoom("heatMap");
  });

  heatMapScaleSelect.addEventListener("change", () => {
    const value = heatMapScaleSelect.value;
    heatMapPlot.controls.scaleBy = value;
    clearView("heatMap");
    renderView("heatMap");
    resetZoom("heatMap");
  });

  heatMapResetButton.addEventListener("click", () => {
    clearView("heatMap");
    renderView("heatMap");
    resetZoom("heatMap");
  });

  setViewSortSelect.addEventListener("change", () => {
    const value = setViewSortSelect.value;
    setViewPlot.controls.sortBy = value;
    clearView("setView");
    renderView("setView");
    resetZoom("setView");
  });

  setViewScaleSelect.addEventListener("change", () => {
    const value = setViewScaleSelect.value;
    setViewPlot.controls.scaleBy = value;
    clearView("setView");
    renderView("setView");
    resetZoom("setView");
  });

  setViewResetButton.addEventListener("click", () => {
    clearView("setView");
    renderView("setView");
    resetZoom("setView");
  });

  scatterPlotLabelsCheckbox.addEventListener("click", () => {
    const value = scatterPlotLabelsCheckbox.checked;
    d3.select("#scatter-plot").attr("hide-labels", value ? "true" : "false");
  });

  scatterPlotScaleSelect.addEventListener("change", () => {
    const value = scatterPlotScaleSelect.value;
    scatterPlot.controls.scaleBy = value;
    clearView("scatterPlot");
    renderView("scatterPlot");
  });

  scatterPlotResetButton.addEventListener("click", () => {
    scatterPlotLabelsCheckbox.checked = false;
    clearView("scatterPlot");
    renderView("scatterPlot");
  });

  // DIVIDERS

  const mousemoveInputFilterDivider = (event) => {
    const viewWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const inputFilterDividerWidth = utils.getAbsoluteWidth(inputFilterDivider);
    const inputWrapperWidth = event.clientX;
    inputWrapper.style.width = `${inputWrapperWidth}px`;
    const filterWrapperWidth = viewWidth - inputWrapperWidth - inputFilterDividerWidth;
    filterWrapper.style.width = `${filterWrapperWidth}px`;
  };

  const mousemoveSettingsViewsDivider = (event) => {
    const viewHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const headerHeight = utils.getAbsoluteHeight(elements.header);
    const settingsViewsDividerHeight = utils.getAbsoluteHeight(settingsViewsDivider);
    const settingsPanelHeight = Math.min(
      Math.max(event.clientY - headerHeight, 0), // set to this value
      viewHeight - headerHeight - settingsViewsDividerHeight // don't go past this value
    );
    settingsPanel.style.height = `${settingsPanelHeight}px`;
    const viewsPanelHeight = Math.max(viewHeight - headerHeight - settingsPanelHeight - settingsViewsDividerHeight, 0);
    viewsPanel.style.height = `${viewsPanelHeight}px`;
  };

  const mousemoveHeatSetDivider = (event) => {
    const viewWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const heatSetDividerWidth = utils.getAbsoluteWidth(heatSetDivider);
    const setScatterDividerWidth = utils.getAbsoluteWidth(setScatterDivider);
    const scatterPlotWrapperWidth = utils.getAbsoluteWidth(scatterPlotWrapper);
    const heatMapWrapperWidth = Math.min(
      Math.max(event.clientX, 0), // set to this value
      viewWidth - heatSetDividerWidth - setScatterDividerWidth - scatterPlotWrapperWidth // don't go past this value
    );
    heatMapWrapper.style.width = `${heatMapWrapperWidth}px`;
    const setViewWrapperWidth = Math.max(
      viewWidth - heatMapWrapperWidth - heatSetDividerWidth - setScatterDividerWidth - scatterPlotWrapperWidth,
      0
    );
    setViewWrapper.style.width = `${setViewWrapperWidth}px`;
  };

  const mousemoveSetScatterDivider = (event) => {
    const viewWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const heatSetDividerWidth = utils.getAbsoluteWidth(heatSetDivider);
    const setScatterDividerWidth = utils.getAbsoluteWidth(setScatterDivider);
    const heatMapWrapperWidth = utils.getAbsoluteWidth(heatMapWrapper);
    const setViewWrapperWidth = Math.min(
      Math.max(event.clientX - heatMapWrapperWidth - heatSetDividerWidth, 0), // set to this value
      viewWidth - heatMapWrapperWidth - heatSetDividerWidth - setScatterDividerWidth // don't go past this value
    );
    setViewWrapper.style.width = `${setViewWrapperWidth}px`;
    const scatterPlotWrapperWidth = Math.max(
      viewWidth - heatMapWrapperWidth - heatSetDividerWidth - setViewWrapperWidth - setScatterDividerWidth,
      0
    );
    scatterPlotWrapper.style.width = `${scatterPlotWrapperWidth}px`;
  };

  let dragTarget;
  let dragTargetID;

  const dragListeners = {
    "input-filter-divider": mousemoveInputFilterDivider,
    "settings-views-divider": mousemoveSettingsViewsDivider,
    "heat-set-divider": mousemoveHeatSetDivider,
    "set-scatter-divider": mousemoveSetScatterDivider,
  };

  const mousedown = (event) => {
    event.preventDefault();
    dragTarget = event.target;
    dragTarget.classList.add("dragging");
    dragTargetID = dragTarget.getAttribute("id");
    window.addEventListener("mousemove", dragListeners[dragTargetID], true);
  };

  const mouseup = (event) => {
    if (dragTarget) {
      event.preventDefault();
      dragTarget.classList.remove("dragging");
      dragTargetID = dragTarget.getAttribute("id");
      dragTarget = null;
      window.removeEventListener("mousemove", dragListeners[dragTargetID], true);
    }
  };

  inputFilterDivider.addEventListener("mousedown", mousedown, false);
  settingsViewsDivider.addEventListener("mousedown", mousedown, false);
  heatSetDivider.addEventListener("mousedown", mousedown, false);
  setScatterDivider.addEventListener("mousedown", mousedown, false);

  window.addEventListener("mouseup", mouseup, false);
}
