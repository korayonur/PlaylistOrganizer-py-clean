// Test ortamı için gerekli importlar
import "zone.js/testing";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";

// Test ortamını başlat
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Material Dialog test stilleri
const materialStyles = `
  .mat-mdc-dialog-container {
    height: 90vh !important;
    max-height: 90vh !important;
    overflow: hidden !important;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = materialStyles;
document.head.appendChild(styleSheet);
