import { Component, IComponentBindings, ComponentOptions, $$, isFacetRangeValueFormat } from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';

export interface IToggleFolderViewOptions {}

declare const require: (svgPath: string) => string;
const SVGIcon = require('./save.svg');

@lazyComponent
export class ToggleFolderView extends Component {
    static ID = 'ToggleFolderView';
    static options: IToggleFolderViewOptions = {};

    isActive:boolean;

    constructor(public element: HTMLElement, public options: IToggleFolderViewOptions, public bindings: IComponentBindings) {
        super(element, ToggleFolderView.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, ToggleFolderView, options);

        this.isActive == false;
        
        this.build();
    }

    public build(){
        const container = $$('div', { className: 'container' }, '');
        const caption = $$('div', { className: 'toggleSwitchCaption' }, 'Activate folder view');
        const icon = $$('span', { className: 'folderIcon' }, SVGIcon);
        
        container.append(icon.el);
        container.append(caption.el);
        
        $$(container).on('click', () => {
            if (this.isActive){
                caption.el.innerText = 'Activate folder view';
                container.removeClass('usingFolderView')
                this.isActive = false;
            }else{
                caption.el.innerText = 'Using folder view';
                container.addClass('usingFolderView')
                this.isActive = true;
            }
            console.log('click');
        });

        // debugger

        this.element.append(container.el)
    }
}