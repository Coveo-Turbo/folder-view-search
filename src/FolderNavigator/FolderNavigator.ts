import { Component, IComponentBindings, ComponentOptions, $$, isFacetRangeValueFormat } from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';
import { DefaultResultTemplate } from './DefaultResultTemplate';

export interface IFolderNavigatorOptions {
    facetField: string;
}

declare const require: (svgPath: string) => string;
const openFolderIcon = require('./openFolder.svg');
const indicatorIcon = require('./openFolder.svg');

@lazyComponent
export class FolderNavigator extends Component {
    static ID = 'FolderNavigator';
    static options: IFolderNavigatorOptions = {
        facetField: ComponentOptions.buildStringOption(),
    };

    private cleanedField: string;
    public usingFolderView: boolean;
    public currentFolderLevel: number;

    constructor(public element: HTMLElement, public options: IFolderNavigatorOptions, public bindings: IComponentBindings) {
        super(element, FolderNavigator.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, FolderNavigator, options);

        this.cleanedField = this.options.facetField.replace('@', '');
        this.usingFolderView = false;

        this.currentFolderLevel = 1;

        // this.bind.onRootElement(Coveo.QueryEvents.buildingQuery, this.handleBuildingQuery);
        this.bind.onRootElement(Coveo.QueryEvents.deferredQuerySuccess, this.handleDeferredQuerySuccess);

        this.build()

    }

    public build(){
        const folderViewIndicator = $$('div', { className: 'folderViewIndicator' });
        const folderViewIndicatorIcon = $$('div', { className: 'folderViewIndicatorIcon' }, indicatorIcon);
        const folderViewIndicatorCaption = $$('div', { className: 'folderViewIndicatorCaption' }, 'Using folder view');

        folderViewIndicator.append(folderViewIndicatorIcon.el);
        folderViewIndicator.append(folderViewIndicatorCaption.el);
        this.element.append(folderViewIndicator.el);

        const folderContainer = $$('div', { className: 'folderContainer' });
        this.element.append(folderContainer.el);

        const folderResultsContainer = $$('div', { className: 'folderResultsContainer' });
        this.element.append(folderResultsContainer.el)

        this.updateFolderViewIndicator(false);
    }

    public handleDeferredQuerySuccess(args: Coveo.IQuerySuccessEventArgs) {

        let folderContainer = this.element.querySelector('.folderContainer') as HTMLElement;
        folderContainer.innerText = "";
        let folderResultsContainer = this.element.querySelector('.folderResultsContainer') as HTMLElement;
        folderResultsContainer.innerText = "";

        let folders = _.find(args.results.categoryFacets, (item) => {
            return item.field == this.cleanedField
        }).values;

        _.each(folders, (item) => {
            this.generateFolder(item);
        });

    }

    public updateFolderViewIndicator(state:boolean){
        let indicator = this.element.querySelector('.folderViewIndicator') as HTMLElement;
        let folderResultsContainer = this.element.querySelector('.folderResultsContainer') as HTMLElement;
        let CoveoResultList = this.root.querySelector('.CoveoResultList') as HTMLElement;
        let coveoResultsHeader = this.root.querySelector('.coveo-results-header') as HTMLElement;

        if (state){
            this.usingFolderView = true;
            indicator.classList.add('usingFolderView');
            CoveoResultList.hidden = true;
            coveoResultsHeader.hidden = true;
            folderResultsContainer.hidden = false;
        }else{
            this.usingFolderView = false;
            indicator.classList.remove('usingFolderView');
            CoveoResultList.hidden = false;
            coveoResultsHeader.hidden = false;
            folderResultsContainer.hidden = true;
        }
    }

    public generateFolder(item: any) {

        const folder = $$('div', { className: 'folder' });
        const caption = $$('div', { className: 'folderCaption' }, item.value);
        const icon = $$('span', { className: 'folderIcon' }, openFolderIcon);

        folder.append(icon.el);
        folder.append(caption.el);

        $$(folder).on('click', () => {
            this.usingFolderView = true;
            this.updateFolderViewIndicator(true);

            this.currentFolderLevel++;

            this.navigateInsideFolder(item.value);

            console.log('Navigating');
        });

        let container = this.element.querySelector('.folderContainer') as HTMLElement;

        container.append(folder.el);
    }

    public navigateInsideFolder(currentFolder){
        let endpoint = Coveo.SearchEndpoint.endpoints['default'];
        endpoint.search(this.generateFolderQuery(currentFolder)).then( (results) => {
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
    
            _.forEach(results.results, function(result) {
              r = Coveo.$$('div', { class: "CoveoResult" });
    
              compiled = _.template(DefaultResultTemplate.formatTemplate(template, result), {
                interpolate: /\{\{(.+?)\}\}/g
              });
    
              r.setHtml(compiled(result));
    
            //   MaximCusto.bindClickEventsOnLinks(r, result);
    
            folderResultsContainer.appendChild(r.el);
            });
    
            
          }else{
            const folderContainer = $$('div', { className: 'folderContainer' }, 'Empty folder');
            folderResultsContainer.append(folderContainer.el);
          }
        });
    }

    private generateFolderQuery(currentFolder) {
        // debugger
        return {
          numberOfResults: 1000,
          q: Coveo.state(document.getElementById('search'), 'q'),
          aq: '@dtdam_parentfolder_facet="' + currentFolder + '" @dtdam_item_level==' + this.currentFolderLevel,
        //   sort: Coveo.state(document.getElementById('search'), 'sort'),
          searchHub: this.root['CoveoSearchInterface'].analyticsOptions.searchHub,
          debug: true
        }
      }
}