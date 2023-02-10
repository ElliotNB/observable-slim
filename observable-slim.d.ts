export function create<Source>(target: Source, domDelay: number | boolean, observer?: (mutations: {
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
    target: Source;
    /**
     * Proxy of the target object.
     */
    proxy: Source;
    /**
     * New value of the property.
     */
    newValue: Source;
    /**
     * Previous value of the property
     */
    previousValue?: Source;
}[]) => void): Source;
export function observe<Source>(proxy: Source, observer: (mutations: {
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
    target: Source;
    /**
     * Proxy of the target object.
     */
    proxy: Source;
    /**
     * New value of the property.
     */
    newValue: Source;
    /**
     * Previous value of the property
     */
    previousValue?: Source;
}[]) => void): void;
export function pause<Source>(proxy: Source): void;
export function resume<Source>(proxy: Source): void;
export function pauseChanges<Source>(proxy: Source): void;
export function resumeChanges<Source>(proxy: Source): void;
export function remove<Source>(proxy: Source): void;
