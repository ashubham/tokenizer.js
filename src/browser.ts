import {detect, BrowserName} from 'detect-browser';

let browserDetails = detect();
let _browserName = browserDetails.name;

export enum Browsers {
    Chrome = 'chrome',
    Firefox = 'firefox',
    Safari = 'safari',
    Edge = 'edge',
    IE = 'ie',
    Phantom = 'phantomjs'
}

if(!Browsers[_browserName]) {
    _browserName = Browsers.Chrome;
}

export const browserName: any = _browserName;
