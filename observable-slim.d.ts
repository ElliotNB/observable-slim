// Type by StackOverflow user jcakz
// https://stackoverflow.com/a/58436959/10843516
type Paths<T> = T extends object
    ? {
          [K in keyof T]: `${Exclude<K, symbol>}${"" | `.${Paths<T[K]>}`}`;
      }[keyof T]
    : never;

type PathToJSONPointer<S> = S extends string
    ? S extends `${infer T}.${infer U}`
        ? `/${T}${PathToJSONPointer<U>}`
        : `/${S}`
    : never;

type Split<S extends string, D extends string> = string extends S
    ? string
    : S extends `${infer T}${D}${infer U}`
    ? U extends Split<U, D>
        ? T
        : Split<U, D>
    : S;

type LastSegment<S> = S extends string ? Split<S, "."> : never;

export interface Mutation<Source extends object, CurrentPath = Paths<Source>> {
    /**
     * Change type.
     */
    type: "add" | "update" | "delete";
    /**
     * Property name.
     */
    property: LastSegment<CurrentPath>;
    /**
     * Property path with the dot notation (e.g. `foo.0.bar`).
     */
    currentPath: CurrentPath;
    /**
     * Property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See https://datatracker.ietf.org/doc/html/rfc6901.
     */
    jsonPointer: PathToJSONPointer<CurrentPath>;
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
}

export function create<Source extends object>(
    target: Source,
    domDelay: number | boolean,
    observer?: (mutations: Mutation<Source>[]) => void
): Source;
export function observe<Source extends object>(
    proxy: Source,
    observer: (mutations: Mutation<Source>[]) => void
): void;
export function pause<Source>(proxy: Source): void;
export function resume<Source>(proxy: Source): void;
export function pauseChanges<Source>(proxy: Source): void;
export function resumeChanges<Source>(proxy: Source): void;
export function remove<Source>(proxy: Source): void;
