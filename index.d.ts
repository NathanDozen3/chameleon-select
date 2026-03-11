export interface ChameleonOptions {
  watch?: boolean;
  sniff?: boolean;
}

export interface ChameleonAPI {
  version: string;
  init: (container?: HTMLElement | Document, options?: ChameleonOptions) => void;
  destroy: (selectEl: HTMLSelectElement) => void;
  refresh: (selectEl: HTMLSelectElement, options?: ChameleonOptions) => void;
}

declare const Chameleon: ChameleonAPI;
export default Chameleon;
