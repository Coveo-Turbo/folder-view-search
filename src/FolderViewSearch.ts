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
    useFolderViewByDefault?: boolean;
}

declare const require: (svgPath: string) => string;
const folderIcon = require('./Icons/folder.svg');
const magnifierIcon = require('./Icons/magnifier.svg');

@lazyComponent
export class FolderViewSearch extends Component {
    static ID = 'FolderViewSearch';
    static options: IFolderViewSearchOptions = {
        facetField: ComponentOptions.buildStringOption(),
        itemLevelField: ComponentOptions.buildStringOption(),
        useToggleButton: ComponentOptions.buildBooleanOption({ defaultValue: true }),
        useFolderViewByDefault: ComponentOptions.buildBooleanOption({ defaultValue: true }),
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

        this.usingFolderView = this.options.useFolderViewByDefault;

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

        this.isStateVanilla(state);

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

        const toggleButton = (this.usingFolderView) ? $$('div', { className: 'toggleButton folderViewActive' }) : $$('div', { className: 'toggleButton searchViewActive' });
        const toggleButtonSearchContainer = $$('div', { className: 'toggleButtonSearchContainer' });
        const toggleButtonFolderContainer = $$('div', { className: 'toggleButtonFolderContainer' });
        const toggleButtonSearchLabel = $$('div', { className: 'toggleButtonSearchLabel' }, "Using <br/> Search View");
        const toggleButtonFolderLabel = $$('div', { className: 'toggleButtonFolderLabel' }, "Using <br/> Folder View");
        const toggleButtonSearchIcon = $$('div', { className: 'toggleButtonSearchIcon' }, magnifierIcon);
        const toggleButtonFolderIcon = $$('div', { className: 'toggleButtonFolderIcon' }, folderIcon);

        toggleButtonSearchContainer.append(toggleButtonSearchIcon.el)
        toggleButtonSearchContainer.append(toggleButtonSearchLabel.el)
        toggleButtonFolderContainer.append(toggleButtonFolderLabel.el)
        toggleButtonFolderContainer.append(toggleButtonFolderIcon.el)

        toggleButton.append(toggleButtonSearchContainer.el);
        toggleButton.append(toggleButtonFolderContainer.el);

        $$(toggleButton).on('click', () => {

            // Remove the query term and the facets if the user clicks on the toggle button
            Coveo.state(this.root, 'q', '');
            _.each(_.filter(
                Object.keys(Coveo.state(this.root).attributes), (item) => {
                    return (item.toString().substr(0, 2) == "f:" && item.toString() != "f:" + this.options.facetField)
                }
            ), (facet) => {
                if (Coveo.state(this.root).attributes[facet].length > 0) {
                    console.log(facet)
                    Coveo.state(this.root, facet, []);
                }
            });

            if (this.usingFolderView) {

                toggleButton.addClass('searchViewActive');
                toggleButton.removeClass('folderViewActive');
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

                toggleButton.removeClass('searchViewActive');
                toggleButton.addClass('folderViewActive');
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

        if (!isVanilla) {
            this.element.firstElementChild.classList.add('searchViewActive');
            this.element.firstElementChild.classList.remove('folderViewActive');
            this.usingFolderView = false;
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
        const icon = $$('span', { className: 'folderIcon' }, folderIcon);

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