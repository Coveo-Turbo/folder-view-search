export class DefaultResultTemplate {

    static instantiateToString(): string {
        let template: string = `
            <div class="coveo-result-cell" style="vertical-align:top;text-align:center;width:32px;">
            <span class="CoveoIcon" data-small="true" data-with-label="false"></span>
            <div class="CoveoQuickview"></div>
            </div>
            <div class="coveo-result-cell" style="vertical-align: top;padding-left: 16px;">
            <div class="coveo-result-row" style="margin-top:0;">
                <div class="coveo-result-cell" style="vertical-align:top;font-size:16px;" role="heading" aria-level="2">
                <a class="CoveoResultLink" href="{{- clickUri }}" data-always-open-in-new-window="true" target="_blank">{{- clickUri }}</a>
                </div>
                <div class="coveo-result-cell" style="width:120px;text-align:right;font-size:12px">
                <div class="coveo-result-row">
                <span class="CoveoFieldValue" data-field="@date" data-helper="date">{{- Coveo.date(raw.common_date, {
                    predefinedFormat: "M/yyyy"
                }) }}</span>
                </div>
                </div>
            </div>
            <div class="coveo-result-row" style="margin-top:10px;">
                <div class="coveo-result-cell">
                <span class="CoveoExcerpt"></span>
                </div>
            </div>
            <div class="coveo-result-row" style="margin-top:10px;">
                <div class="coveo-result-cell">
                <span class="CoveoFieldValue" data-field="@dtdam_item_level" data-text-caption="dtdam_item_level" style="margin-right:30px;"></span>
                <span class="CoveoFieldValue" data-field="@dtdam_item_type" data-text-caption="dtdam_item_type" style="margin-right:30px;"></span>
                </div>
            </div>
            </div>
        </div>
      `
        return template;
    }

    static formatTemplate(template: string, result: Coveo.IQueryResult): string {
        // Datesheet link replacement
        if (!!result.raw.datasheet_showmodal && result.raw.datasheet_showmodal == 'true') {
            if (!!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                template = template.replace('%datasheetlink%', `<span><a class="CoveoResultLink" href="javascript: void(0);" onclick="openModal('{{- raw.datasheet_menulabel }}', '{{- raw.datasheet_docgrouplabel }}', [{
                    'date': '{{- raw.datasheet_date }}',
                    'fileName': '{{- raw.datasheet_filename }}',
                    'title': '{{- raw.datasheet_title }}',
                    'version': '{{- raw.datasheet_version }}'
                }], '{{- raw.datasheet_requestgrouplink }}', '', '{{- raw.datasheet_requestgrouptitle }}', '{{- raw.datasheet_language }}')">{{- Coveo.l('Data Sheet') }}</a></span>`);
            } else {
                template = template.replace('%datasheetlink%', `<span><a class="CoveoResultLink" href="javascript: void(0);" onclick="openModal('{{- raw.datasheet_menulabel }}', '{{- raw.datasheet_docgrouplabel }}', [{
                    'date': '{{- raw.datasheet_date }}',
                    'fileName': '{{- raw.datasheet_filename }}',
                    'title': '{{- raw.datasheet_title }}',
                    'version': '{{- raw.datasheet_version }}'
                }], '{{- raw.datasheet_requestgrouplink }}'` + ", `{{- raw.datasheet_erratalist }}`" + `, '{{- raw.datasheet_requestgrouptitle }}', '{{- raw.datasheet_language }}')">{{- Coveo.l('Data Sheet') }}</a></span>`);
            }
        } else if (!!result.raw.datasheet_viewpdf && result.raw.common_lang == "cn") {
            template = template.replace('%datasheetlink%', `<span><a class="CoveoResultLink" data-always-open-in-new-window="true" target="_blank" href="{{- raw.datasheet_menulink }}">${result.raw.datasheet_menulabel ? result.raw.datasheet_menulabel : 'No Data Sheet'}</a></span>`);
        } else {
            template = template.replace('%datasheetlink%', `<span><a class="CoveoResultLink" data-always-open-in-new-window="true" target="_blank" href="{{- raw.datasheet_menulink }}">${result.raw.datasheet_menulabel ? result.raw.datasheet_menulabel : 'No Data Sheet'}</a></span>`);
        }

        // EE-Sim
        if (!!result.raw.datasheet_eesim) {
            template = template.replace('%eesim%',
                `<div class="coveo-result-cell link">
                <span><a class="CoveoResultLink" data-always-open-in-new-window="true" target="_blank" href="{{- raw.datasheet_eesim }}">{{- Coveo.l('EE-Sim') }}&reg;</a></span>
            </div>`);
        } else {
            template = template.replace('%eesim%', '');
        }

        return template;
    }
}
