export type Served = {
    base: string;
    stop: () => void;
};
export declare function serveDir(dir: string, port?: number): Served;
