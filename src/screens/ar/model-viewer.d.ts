/**
 * Types for the one custom element the AR gallery uses: Google's <model-viewer> (vendor/model-viewer.min.js, Apache 2.0).
 * Only what the gallery reads or calls is declared.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

export interface ModelViewerElement extends HTMLElement {
  /** True when this device and browser can place the model in the room. Known after the model has loaded. */
  readonly canActivateAR: boolean;
  activateAR(): Promise<void>;
  cameraOrbit: string;
  jumpCameraToGoal(): void;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & Record<string, unknown>;
    }
  }
}
