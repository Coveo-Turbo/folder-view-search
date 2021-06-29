import {
    Component,
    IComponentBindings,
    ComponentOptions,
    $$,
    DynamicHierarchicalFacet,
    IQuerySuccessEventArgs,
    QueryStateModel,
    QueryEvents,
    IDoneBuildingQueryEventArgs,
    IBuildingQueryEventArgs,
    analyticsActionCauseList
} from 'coveo-search-ui';

import { lazyComponent } from '@coveops/turbo-core';

export interface IFolderViewSearchOptions {
    facetField: string;
    itemLevelField: string;
    useToggleButton?: boolean;
}

declare const require: (svgPath: string) => string;
const openFolderIcon = require('./openFolder.svg');
const toggleIcon = require('./toggle.svg');

@lazyComponent
export class FolderViewSearch extends Component {
    static ID = 'FolderViewSearch';
    static options: IFolderViewSearchOptions = {
        facetField: ComponentOptions.buildStringOption(),
        itemLevelField: ComponentOptions.buildStringOption(),
        useToggleButton: ComponentOptions.buildBooleanOption({ defaultValue: true }),
    };

    private cleanedFacetField: string;
    private cleaneItemLevelField: string;

    public usingFolderView: boolean;
    public currentFolderLevel: number;
    public currentFolderPath: string[];
    public generatedHierchichalFacet: DynamicHierarchicalFacet;

    constructor(public element: HTMLElement, public options: IFolderViewSearchOptions, public bindings: IComponentBindings) {
        super(element, FolderViewSearch.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, FolderViewSearch, options);

        this.cleanedFacetField = this.options.facetField.replace('@', '');
        this.cleaneItemLevelField = this.options.facetField.replace('@', '');
        this.usingFolderView = true;

        this.bind.onRootElement(QueryEvents.buildingQuery, this.handleBuildingQuery);
        this.bind.onRootElement(QueryEvents.doneBuildingQuery, this.handleDoneBuildingQuery);
        this.bind.onRootElement(QueryEvents.deferredQuerySuccess, this.handleDeferredQuerySuccess);
        this.bind.onRootElement(QueryEvents.preprocessResults, this.handlePreprocessResults);

        this.buildToggleButton();
    }

    public handleDeferredQuerySuccess(args: IQuerySuccessEventArgs) {
        if (this.usingFolderView) {
            this.hideNoResults();
        } else {
            this.showNoResults();
        }
    }

    public handleDoneBuildingQuery(args: IDoneBuildingQueryEventArgs) {
        //Only if using the folder view, we need to have the items sorted by item level to make sure the items from the current level are in the first result set
        if (this.usingFolderView) {
            args.queryBuilder.sortCriteria = this.options.itemLevelField + " ascending";
        }
    }

    public handleBuildingQuery(args: IBuildingQueryEventArgs) {
        let state = Coveo.state(this.root);

        if (!this.options.useToggleButton) {
            this.isStateVanilla(state);
        }

        this.currentFolderLevel = 1;
        if (state.attributes["f:" + this.options.facetField]) {
            this.currentFolderLevel += state.attributes["f:" + this.options.facetField].length
        }

        if (this.usingFolderView) {
            args.queryBuilder.addContextValue('vanillaState', true);
        } else {
            args.queryBuilder.addContextValue('vanillaState', false);
        }

    }

    //Here, we should handle the noResult message coming from the CoveoQuerySummary if need be
    private hideNoResults() {
        let noResultdiv = this.root.querySelectorAll('.coveo-show-if-no-results');
        let facetColm = this.root.querySelector('.coveo-facet-column') as HTMLElement;
        let fixedhead = this.root.querySelector('#fixedhead') as HTMLElement;
        _.each(noResultdiv, (item: HTMLElement) => {
            item.hidden = true;
            item.classList.add("folderViewHide");
        });
        if (facetColm) {
            facetColm.classList.remove("coveo-no-results");
        }
        if (fixedhead) {
            fixedhead.classList.add("folderViewHide");
        }
    }

    //Here, we should handle the noResult message coming from the CoveoQuerySummary if need be
    private showNoResults() {
        let noResultdiv = this.root.querySelectorAll('.coveo-show-if-no-results');
        let fixedhead = this.root.querySelector('#fixedhead') as HTMLElement;
        _.each(noResultdiv, (item: HTMLElement) => {
            item.hidden = false;
            item.classList.remove("folderViewHide");
        });
        if (fixedhead) {
            fixedhead.classList.remove("folderViewHide");
        }
    }

    public handlePreprocessResults(args: IQuerySuccessEventArgs) {
        if (this.usingFolderView) {
            this.createFolderStructure();
            this.createFolders(args);

            args.results.results = _.filter(args.results.results, (item) => {
                return item.raw.dtdam_item_level == this.currentFolderLevel;
            });

        } else {
            this.removeFolderStructure();
        }
    }

    private buildToggleButton() {
        const toggleButton = $$('div', { className: 'toggleButton' });
        const iLabel = $$('label', { className: 'cf', for: 'checkbox1' });
        let toggleInput;
        if (this.options.useToggleButton) {
            toggleInput = $$('input', { type: 'checkbox', id: 'checkbox1', checked: true });
        } else {
            toggleInput = $$('input', { type: 'checkbox', id: 'checkbox1', checked: true, disabled: true });
        }
        const iIndicator = $$('i', { className: 'indicator' }, toggleIcon);
        const labelActive = $$('span', { className: 'folderViewIndicatorIcon' }, "Using <br/> folder view");
        const labelInactive = $$('span', { className: 'folderViewIndicatorIcon' }, "Using <br/> search");


        iLabel.append(toggleInput.el);
        iLabel.append(labelActive.el);
        iLabel.append(iIndicator.el);
        iLabel.append(labelInactive.el);
        toggleButton.append(iLabel.el);

        if (this.options.useToggleButton) {
            $$(toggleButton).on('click', () => {
                let checkbox = toggleButton.findId('checkbox1') as HTMLInputElement;
                if (checkbox.checked) {
                    checkbox.checked = false;
                    this.usingFolderView = false;
                    this.queryController.deferExecuteQuery({
                        beforeExecuteQuery: () => {
                            Coveo.logCustomEvent(this.root, analyticsActionCauseList.facetSelect, {
                                folderViewSearch: 'false'
                            });
                            Coveo.logSearchEvent(this.root, analyticsActionCauseList.facetSelect, {
                                folderViewSearch: 'false'
                            });
                        }
                    });
                } else {
                    checkbox.checked = true;
                    this.usingFolderView = true;
                    this.queryController.deferExecuteQuery({
                        beforeExecuteQuery: () => {
                            Coveo.logCustomEvent(this.root, analyticsActionCauseList.triggerQuery, {
                                folderViewSearch: 'true'
                            });
                            Coveo.logSearchEvent(this.root, analyticsActionCauseList.triggerQuery, {
                                folderViewSearch: 'true'
                            });
                        }
                    });
                }
            });
        }

        this.element.append(toggleButton.el);
    }

    private createFolderStructure() {
        const folderContainer = this.root.querySelector('.folderNavigatorContainer');

        if (!folderContainer) {
            const folderContainer = $$('div', { className: 'folderNavigatorContainer' });
            this.element.append(folderContainer.el);

            this.root.querySelector('.CoveoResultList').parentElement.insertBefore(folderContainer.el, this.root.querySelector('.CoveoResultList'));
        }

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

        let checkboxEl = this.element.querySelector('#checkbox1') as HTMLInputElement;

        if (isVanilla) {
            this.usingFolderView = true;
            checkboxEl.checked = true;
        } else {
            this.usingFolderView = false;
            checkboxEl.checked = false;
        }
    }

    public createFolders(args: IQuerySuccessEventArgs) {

        let folderContainer = this.root.querySelector('.folderNavigatorContainer') as HTMLElement;
        folderContainer.innerText = "";

        let hierFacet = _.find(args.results.facets, (item) => {
            return item.field == this.cleanedFacetField
        });

        let folders: any;
        if (this.currentFolderLevel == 1) {
            folders = hierFacet.values;
        } else {
            folders = this.getFolderchildren(hierFacet.values[0]);
        }

        _.each(folders, (item) => {
            this.generateFolder(item);
        });

    }

    // Recursive method which dives down into the folder structure and returns the folders
    private getFolderchildren(item: any) {
        if (item.state == "selected") {
            return item.children;
        } else {
            return this.getFolderchildren(item.children[0]);
        }
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
            this.queryController.deferExecuteQuery({
                beforeExecuteQuery: () => {
                    Coveo.logCustomEvent(this.root, analyticsActionCauseList.facetSelect, {
                        folderViewSearch: 'true'
                    });
                    Coveo.logSearchEvent(this.root, analyticsActionCauseList.facetSelect, {
                        folderViewSearch: 'true'
                    });
                }
            });

            console.log('Navigating');
        });
        let folderContainer = this.root.querySelector('.folderNavigatorContainer') as HTMLElement;
        folderContainer.append(folder.el);
    }
}