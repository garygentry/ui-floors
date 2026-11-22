import { type Browser } from "playwright";
import type { Config } from "./config.js";
export type ConfirmResult = {
    name: string;
    ok: boolean;
    file?: string;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    error?: string;
};
export declare function confirm(cfg: Config, o?: {
    names?: string[];
    out?: string;
    browser?: Browser;
}): Promise<ConfirmResult[]>;
