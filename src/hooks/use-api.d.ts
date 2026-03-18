import { type SWRConfiguration } from "swr";
export declare function fetcher<T>(url: string): Promise<T>;
export declare function useRuns(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useOps(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useOp(
	opId: string,
	opts?: SWRConfiguration<any, Error>,
): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useScores(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useHealth(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useCron(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useMemory(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useActors(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
export declare function useDlq(opts?: SWRConfiguration<any, Error>): {
	data: any;
	error: Error;
	isLoading: boolean;
	mutate: import("swr").KeyedMutator<any>;
};
//# sourceMappingURL=use-api.d.ts.map
