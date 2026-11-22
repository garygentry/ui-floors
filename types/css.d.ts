export type Decl = {
    prop: string;
    value: string;
    line: number;
    context: string[];
};
export declare function stripComments(src: string): string;
export declare function parseCss(src: string): Decl[];
/** Line number (1-based) of a character offset. */
export declare function lineOf(src: string, offset: number): number;
