import {
  Component,
  IComponentBindings,
  ComponentOptions,
  $$,
  DynamicHierarchicalFacet,
  IQuerySuccessEventArgs,
  QueryStateModel,
  SearchEndpoint,
  QueryEvents,
  IDoneBuildingQueryEventArgs,
  IBuildingQueryEventArgs,
  Debug
} from 'coveo-search-ui';

import { lazyComponent } from '@coveops/turbo-core';
import { DefaultResultTemplate } from './DefaultResultTemplate';

export interface IFolderNavigatorOptions {
  facetField: string;
  itemLevelField: string;
}

declare const require: (svgPath: string) => string;
const openFolderIcon = require('./openFolder.svg');
const indicatorIcon = require('./openFolder.svg');

@lazyComponent
export class FolderNavigator extends Component {
  static ID = 'FolderNavigator';
  static options: IFolderNavigatorOptions = {
    facetField: ComponentOptions.buildStringOption(),
    itemLevelField: ComponentOptions.buildStringOption(),
  };

  private cleanedFacetField: string;
  private cleaneItemLevelField: string;

  public usingFolderView: boolean;
  public currentFolderLevel: number;
  public currentFolderPath: string[];
  public generatedHierchichalFacet: DynamicHierarchicalFacet;

  constructor(public element: HTMLElement, public options: IFolderNavigatorOptions, public bindings: IComponentBindings) {
    super(element, FolderNavigator.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, FolderNavigator, options);

    this.cleanedFacetField = this.options.facetField.replace('@', '');
    this.cleaneItemLevelField = this.options.facetField.replace('@', '');
    this.usingFolderView = false;

    // this.generatedHierchichalFacet = new DynamicHierarchicalFacet("")

    this.bind.onRootElement(QueryEvents.buildingQuery, this.handleBuildingQuery);
    this.bind.onRootElement(QueryEvents.doneBuildingQuery, this.handleDoneBuildingQuery);
    // this.bind.onRootElement(QueryEvents.deferredQuerySuccess, this.handleDeferredQuerySuccess);
    this.bind.onRootElement(QueryEvents.preprocessResults, this.handleDeferredQuerySuccess);

    this.buildFolderViewIndicator();

  }

  public handleDoneBuildingQuery(args: IDoneBuildingQueryEventArgs) {
    //Only if using the folder view, we need to have the items sorted by item level to make sure the items from the current level are in the first result set
    if (this.usingFolderView) {
      args.queryBuilder.sortCriteria = this.options.itemLevelField + " ascending";
    }
  }
  public handleBuildingQuery(args: IBuildingQueryEventArgs) {
    let state = Coveo.state(this.root);

    this.currentFolderLevel = 1;
    if (state.attributes["f:" + this.options.facetField]){
      this.currentFolderLevel += state.attributes["f:" + this.options.facetField].length
    }

    if (this.isStateVanilla(state)) {
      this.usingFolderView = true;
      args.queryBuilder.addContextValue('vanillaState', true);
      //this.createFolderStructure();
      //this.generateFolders();

      //this.navigateInsideFolder(this.currentFolderPath);
      // make sure we show folder view
    } else {
      this.usingFolderView = false;
      args.queryBuilder.addContextValue('vanillaState', false);

      // remove folder view items
    }

    // this.toggleView();
    this.updateFolderViewIndicator();
  }

  public handleDeferredQuerySuccess(args: IQuerySuccessEventArgs) {
    if (this.usingFolderView) {
      this.createFolderStructure();
      this.createFolders(args);
      
      debugger
      args.results.results = _.filter(args.results.results, (item) => {
        return item.raw.dtdam_item_level == this.currentFolderLevel;
      });
      


    } else {
      this.removeFolderStructure();
    }

    // let folderContainer = this.element.querySelector('.folderContainer') as HTMLElement;
    // folderContainer.innerText = "";
    // let folderResultsContainer = this.element.querySelector('.folderResultsContainer') as HTMLElement;
    // folderResultsContainer.innerText = "";

    // let folders = _.find(args.results.facets, (item) => {
    //   return item.field == this.cleanedFacetField
    // }).values;

    // _.each(folders, (item) => {
    //   this.generateFolder(item);
    // });

  }

  private buildFolderViewIndicator() {
    const folderViewIndicator = $$('div', { className: 'folderViewIndicator' });
    const folderViewIndicatorIcon = $$('div', { className: 'folderViewIndicatorIcon' }, indicatorIcon);
    const folderViewIndicatorCaption = $$('div', { className: 'folderViewIndicatorCaption' }, 'Using folder view');

    folderViewIndicator.append(folderViewIndicatorIcon.el);
    folderViewIndicator.append(folderViewIndicatorCaption.el);
    this.element.append(folderViewIndicator.el);
  }

  public updateFolderViewIndicator() {
    let indicator = this.element.querySelector('.folderViewIndicator') as HTMLElement;

    if (this.usingFolderView) {
      indicator.classList.add('usingFolderView');
    } else {
      indicator.classList.remove('usingFolderView');
    }
  }

  private toggleView() {
    let CoveoResultList = this.root.querySelector('.CoveoResultList') as HTMLElement;
    let CoveoSummary = this.root.querySelector('.coveo-summary-section') as HTMLElement;
    let folderNavigatorContainer = this.root.querySelector('.folderNavigatorContainer') as HTMLElement;

    if (this.usingFolderView) {
      CoveoResultList.hidden = true;
      CoveoSummary.hidden = true;
      folderNavigatorContainer.hidden = false;
    } else {
      CoveoResultList.hidden = false;
      CoveoSummary.hidden = false;
      folderNavigatorContainer.hidden = true;
      //folderNavigatorContainer.remove();
    }
  }

  private createFolderStructure() {

    const folderContainer = $$('div', { className: 'folderNavigatorContainer' });
    this.element.append(folderContainer.el);

    // const folderResultsContainer = $$('div', { className: 'folderResultsContainer' });
    // this.element.append(folderResultsContainer.el)

    //add a logic to insert the structure in the right list (card, list or table)
    this.root.querySelector('.CoveoResultList').parentElement.insertBefore(folderContainer.el, this.root.querySelector('.CoveoResultList'));
  }

  private removeFolderStructure() {
    const folderContainer = this.root.querySelector('.folderNavigatorContainer');

    if (folderContainer) {
      folderContainer.remove();
    }
  }


  private isStateVanilla(state: QueryStateModel) {
    let isVanilla = true;

    // If there's a query, don't show folderview
    if (state.attributes.q != "") {
      isVanilla = false
    }

    // If there's a facet selected don't show folderview
    _.each(
      _.filter(
        Object.keys(state.attributes), (item) => {
          return (item.toString().substr(0, 2) == "f:" && item.toString() != "f:" + this.options.facetField)
        }
      ), (facet) => {
        if (state.attributes[facet].length > 0) {
          isVanilla = false
        }
      }
    );

    return isVanilla;
  }

  public createFolders(args: IQuerySuccessEventArgs) {

    let folderContainer = this.root.querySelector('.folderNavigatorContainer') as HTMLElement;
    folderContainer.innerText = "";
    // let folderResultsContainer = this.element.querySelector('.folderResultsContainer') as HTMLElement;
    // folderResultsContainer.innerText = "";

    let hierFacet = _.find(args.results.facets, (item) => {
      return item.field == this.cleanedFacetField
    });

    let folders: any;
    if (this.currentFolderLevel == 1) {
      folders = hierFacet.values;
    } else if (this.currentFolderLevel == 2) {
      folders = hierFacet.values[0].children;
    } else if (this.currentFolderLevel == 3) {
      folders = hierFacet.values[0].children[0].children;
    }

    _.each(folders, (item) => {
      this.generateFolder(item);
    });

  }

  public generateFolder(x: any) {
    const folder = $$('div', { className: 'folder' });
    const caption = $$('div', { className: 'folderCaption' }, x.value);
    const icon = $$('span', { className: 'folderIcon' }, openFolderIcon);

    folder.append(icon.el);
    folder.append(caption.el);

    $$(folder).on('click', () => {
      let DynamicFacet = Coveo.get(document.querySelector('#dtdam_parentfolder_facet'), DynamicHierarchicalFacet);
      DynamicFacet['selectPath'](x.path);
      this.queryController.executeQuery();

      console.log('Navigating');
    });
    let folderContainer = this.root.querySelector('.folderNavigatorContainer') as HTMLElement;
    folderContainer.append(folder.el);
  }

  public generateFolders() {

    let endpoint = SearchEndpoint.endpoints['default'];
    debugger
    endpoint.search(this.generateFolderQuery()).then((results) => {
      let folders = _.find(results.facets, (item) => {
        return item.field == this.cleanedFacetField
      }).values;

      _.each(folders, (folder) => {
        this.generateFolder(folder);
      });
    });

  }

  public navigateInsideFolder(currentFolderPath) {
    let endpoint = SearchEndpoint.endpoints['default'];
    debugger
    endpoint.search(this.generateFolderResultsQuery(currentFolderPath)).then((results) => {
      debugger
      //   MaximCusto.sendCustomSearchEvent(results);
      let folderResultsContainer = this.element.querySelector('.folderResultsContainer') as HTMLElement;
      if (results.totalCount > 0) {
        debugger

        // folderResultsContainer.style.display = 'block';

        // Products label
        let banner = `
            <div class="coveo-result-row" style="vertical-align:top;width: 100px;padding-bottom: 10px;margin-top: -1px;">
              <span class="maxim-icon parts-section">${Coveo.l('Products')}</span>
            </div>`;
        let bannerEl = Coveo.$$('div');
        bannerEl.setHtml(banner);
        folderResultsContainer.appendChild(bannerEl.el);

        let r: Coveo.Dom, compiled;
        let template = DefaultResultTemplate.instantiateToString();

        _.forEach(results.results, function (result) {
          r = Coveo.$$('div', { class: "CoveoResult" });

          compiled = _.template(DefaultResultTemplate.formatTemplate(template, result), {
            interpolate: /\{\{(.+?)\}\}/g
          });

          r.setHtml(compiled(result));

          //   MaximCusto.bindClickEventsOnLinks(r, result);

          folderResultsContainer.appendChild(r.el);
        });


      } else {
        const folderContainer = $$('div', { className: 'folderContainer' }, 'Empty folder');
        folderResultsContainer.append(folderContainer.el);
      }
    });
  }

  private generateFolderQuery() {
    debugger
    if (this.currentFolderPath.length > 0) {
      return {
        numberOfResults: 1000,
        q: "",
        aq: '@dtdam_parentfolder_facet="' + this.currentFolderPath.join('|') + '"',
        //   sort: Coveo.state(document.getElementById('search'), 'sort'),
        searchHub: this.root['CoveoSearchInterface'].analyticsOptions.searchHub,
        facets: [{
          "field": this.cleanedFacetField,
          "facetId": "FolderNavigatorFacetRequest",
          "type": <any>"hierarchical",
          "mlDebugTitle": "string",
          "basePath": [],
          "filterByBasePath": false,
          "sortCriteria": <any>"alphanumeric",
          "numberOfValues": 1000,
          "injectionDepth": 1000,
          "freezeCurrentValues": false,
          "currentValues": [],
          "isFieldExpanded": false,
          "generateAutomaticRanges": false,
          "rangeAlgorithm": "even",
          "filterFacetCount": true,
          "delimitingCharacter": "|",
          "preventAutoSelect": false
        }],
        debug: true
      }
    } else {
      return {
        numberOfResults: 1000,
        q: "",
        aq: '@dtdam_parentfolder_facet',
        searchHub: this.root['CoveoSearchInterface'].analyticsOptions.searchHub,
        facets: [{
          "field": this.cleanedFacetField,
          "facetId": "FolderNavigatorFacetRequest",
          "type": <any>"hierarchical",
          "mlDebugTitle": "string",
          "basePath": [],
          "filterByBasePath": false,
          "sortCriteria": <any>"alphanumeric",
          "numberOfValues": 1000,
          "injectionDepth": 1000,
          "freezeCurrentValues": false,
          "currentValues": [],
          "isFieldExpanded": false,
          "generateAutomaticRanges": false,
          "rangeAlgorithm": "even",
          "filterFacetCount": true,
          "delimitingCharacter": "|",
          "preventAutoSelect": false
        }],
        debug: true
      }
    }
  }

  private generateFolderResultsQuery(currentFolder) {
    debugger
    return {
      numberOfResults: 1000,
      q: "@uri",
      aq: (currentFolder.length > 0 ? ('@dtdam_parentfolder_facet="' + currentFolder.join('|') + '" ') : '') + '@dtdam_item_level==' + this.currentFolderLevel,
      //   sort: Coveo.state(document.getElementById('search'), 'sort'),
      searchHub: this.root['CoveoSearchInterface'].analyticsOptions.searchHub,
      debug: true
    }
  }
}