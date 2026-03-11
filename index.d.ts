// index.d.ts
export interface ChameleonOptions {
  watch?: boolean;
}

export interface ChameleonAPI {
  version: string;
  init(container?: HTMLElement | Document, options?: ChameleonOptions): void;
  destroy(selectEl: HTMLSelectElement): void;
  refresh(selectEl: HTMLSelectElement): void;
}

declare const Chameleon: ChameleonAPI;
export default Chameleon;
