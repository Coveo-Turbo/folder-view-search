import { Component, IComponentBindings, ComponentOptions } from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';

export interface IFolderViewSearchOptions {}

@lazyComponent
export class FolderViewSearch extends Component {
    static ID = 'FolderViewSearch';
    static options: IFolderViewSearchOptions = {};

    constructor(public element: HTMLElement, public options: IFolderViewSearchOptions, public bindings: IComponentBindings) {
        super(element, FolderViewSearch.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, FolderViewSearch, options);
    }
}