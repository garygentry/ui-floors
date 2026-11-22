export declare const CHECKS: {
    readonly hscroll: {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly "overflow-right": {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly "text-size": {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly clipped: {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly overlap: {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly "label-collision": {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly "target-size": {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly "focus-ring": {
        readonly command: "sweep";
        readonly kind: "floor";
    };
    readonly contrast: {
        readonly command: "contrast";
        readonly kind: "floor";
    };
    readonly "reduced-motion": {
        readonly command: "lint";
        readonly kind: "floor";
    };
    readonly "body-size": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "line-length": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "numeric-columns": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "hidden-columns": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "touch-action": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "search-input": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "theme-color": {
        readonly command: "sweep";
        readonly kind: "opinion";
    };
    readonly "dark-theme": {
        readonly command: "contrast";
        readonly kind: "opinion";
    };
    readonly "literal-colour": {
        readonly command: "lint";
        readonly kind: "opinion";
    };
    readonly "transition-all": {
        readonly command: "lint";
        readonly kind: "opinion";
    };
    readonly "break-all": {
        readonly command: "lint";
        readonly kind: "opinion";
    };
    readonly "remote-font": {
        readonly command: "lint";
        readonly kind: "opinion";
    };
    readonly "font-fallback": {
        readonly command: "lint";
        readonly kind: "opinion";
    };
    readonly budget: {
        readonly command: "budget";
        readonly kind: "opinion";
    };
};
export type CheckId = keyof typeof CHECKS;
export type OpinionId = {
    [K in CheckId]: (typeof CHECKS)[K]["kind"] extends "opinion" ? K : never;
}[CheckId];
export type RuleLevel = "error" | "warn" | "off";
export declare const FLOORS: ("body-size" | "break-all" | "budget" | "clipped" | "contrast" | "dark-theme" | "focus-ring" | "font-fallback" | "hidden-columns" | "hscroll" | "label-collision" | "line-length" | "literal-colour" | "numeric-columns" | "overflow-right" | "overlap" | "reduced-motion" | "remote-font" | "search-input" | "target-size" | "text-size" | "theme-color" | "touch-action" | "transition-all")[];
export declare const OPINIONS: OpinionId[];
