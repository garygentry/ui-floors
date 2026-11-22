import type { Finding } from "./report.js";
export type BudgetResult = {
    totalGzip: number;
    limit: number;
    files: {
        file: string;
        raw: number;
        gzip: number;
    }[];
    findings: Finding[];
};
export declare function checkBudget(dist: string, entry?: string, limitBytes?: number): BudgetResult;
