export function create<T>(target: T & object, domDelay: boolean | number, observer?: (changes: {
    /**
     * Change type.
     */
    type: "add" | "update" | "delete";
    /**
     * Property name (or symbol).
     */
    property: string | symbol;
    /**
     * Property path with the dot notation (e.g. `foo.0.bar`).
     */
    currentPath: string;
    /**
     * Property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See https://datatracker.ietf.org/doc/html/rfc6901.
     */
    jsonPointer: string;
    /**
     * Target object.
     */
    target: object;
    /**
     * Proxy of the target object.
     */
    proxy: object;
    /**
     * New value of the property.
     */
    newValue: any;
    /**
     * Previous value of the property
     */
    previousValue?: any;
}[]) => void): T;
export function observe<T>(proxy: T & object, observer: (changes: {
    /**
     * Change type.
     */
    type: "add" | "update" | "delete";
    /**
     * Property name (or symbol).
     */
    property: string | symbol;
    /**
     * Property path with the dot notation (e.g. `foo.0.bar`).
     */
    currentPath: string;
    /**
     * Property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See https://datatracker.ietf.org/doc/html/rfc6901.
     */
    jsonPointer: string;
    /**
     * Target object.
     */
    target: object;
    /**
     * Proxy of the target object.
     */
    proxy: object;
    /**
     * New value of the property.
     */
    newValue: any;
    /**
     * Previous value of the property
     */
    previousValue?: any;
}[]) => void): void;
export function pause<T>(proxy: T & object): void;
export function resume<T>(proxy: T & object): void;
export function pauseChanges<T>(proxy: T & object): void;
export function resumeChanges<T>(proxy: T & object): void;
export function remove<T>(proxy: T & object): void;
export function isProxy(obj: any): boolean;
export function getTarget<T>(obj: T & object): T;
export function getPath(proxy: object, { jsonPointer }?: {
    jsonPointer?: boolean;
}): string;
export function getParent(proxy: object, i?: number): object | undefined;
export let symbols: {
    IS_PROXY: symbol;
    TARGET: symbol;
    PARENT: symbol;
    PATH: symbol;
};
