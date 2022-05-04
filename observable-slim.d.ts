export function create(target: any, domDelay: number | boolean, observer?: (arg0: {
    /**
     * Change type.
     */
    type: "add" | "update" | "delete";
    /**
     * Property name.
     */
    property: string;
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
    target: any;
    /**
     * Proxy of the target object.
     */
    proxy: ProxyConstructor;
    /**
     * New value of the property.
     */
    newValue: any;
    /**
     * Previous value of the property
     */
    previousValue?: any;
}[]) => any): ProxyConstructor;
export function observe(proxy: ProxyConstructor, observer: (arg0: {
    /**
     * Change type.
     */
    type: "add" | "update" | "delete";
    /**
     * Property name.
     */
    property: string;
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
    target: any;
    /**
     * Proxy of the target object.
     */
    proxy: ProxyConstructor;
    /**
     * New value of the property.
     */
    newValue: any;
    /**
     * Previous value of the property
     */
    previousValue?: any;
}[]) => any): void;
export function pause(proxy: ProxyConstructor): void;
export function resume(proxy: ProxyConstructor): void;
export function pauseChanges(proxy: ProxyConstructor): void;
export function resumeChanges(proxy: ProxyConstructor): void;
export function remove(proxy: ProxyConstructor): void;
