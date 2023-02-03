export function create<T extends unknown>(target: T, domDelay: boolean | number, observer?: (changes: {
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
export function observe<T extends unknown>(proxy: T, observer: (changes: {
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
export function pause<T extends unknown>(proxy: T): void;
export function resume<T extends unknown>(proxy: T): void;
export function pauseChanges<T extends unknown>(proxy: T): void;
export function resumeChanges<T extends unknown>(proxy: T): void;
export function remove<T extends unknown>(proxy: T): void;
export function isProxy(obj: any): boolean;
export function getTarget<T extends unknown>(obj: T): T;
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
