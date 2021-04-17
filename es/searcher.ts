import { DjolarField } from "./djolar";
import { defaultWebSearchFunc } from "./adapter_web";

/**
 * the AxiosError 
 */
type AxiosError = any

/**
 * the AxiosInstance
 */
type AxiosInstance = any

/**
 * the AxiosRequestConfig
 */
type AxiosRequestConfig = any

/**
 * the AxiosResponse
 */
type AxiosResponse = any

export interface SearcherSortBy {
  name: string;
  descend?: boolean;
}

export interface SearcherResponse<T = any> {
  result: T[];
  count: number;
  msg?: string;
}

export interface SearcherPagination {
  sortBy: SearcherSortBy[];
  page: number;
  rowsPerPage: number;
  rowsNumber: number;
}

export function createSearcherPagination(initialRowsPerPage = 10) {
  return {
    sortBy: [],
    descending: false,
    page: 1,
    rowsPerPage: initialRowsPerPage,
    rowsNumber: 0,
  };
}

export declare type SearcherPaginationOptions = Partial<SearcherPagination>;

export interface SearcherResolves<T = any> {
  response: SearcherResponse<T> | any;
  axiosResponse?: AxiosResponse | any;
}

// CastFunc is a function called when the result got, it can set default values for result
export declare type CastFunc<T = any> = (data : T[]) => T[]

export interface SearchOption<T = any> {
  listUrl: string;
  filter: Record<string, DjolarField>;
  config: AxiosRequestConfig;
  extraQuery: Record<string, any>;
  extraData: Record<string, any>;
  pagination: SearcherPaginationOptions;
  castFunc : CastFunc<T>;
}

export declare type SearchOptions = Partial<SearchOption>;

export interface SearcherContextOptions<T = any> {
  pagination?: SearcherPaginationOptions;
  globalSearchOption?: SearchOptions;
  searchFunc?: SearchFunc<T>;
}

export declare type FailHook<T = any> = (
  err: AxiosError | any,
  searcher: DjolarSearcher<T>
) => void;

export declare type SuccessHook<T = any> = (
  resolves: SearcherResolves<T>,
  searcher: DjolarSearcher<T>
) => void;

export declare type SearchFunc<T = any> = (
  searcher: DjolarSearcher<T>,
  axios: AxiosInstance,
  option: SearchOption
) => Promise<SearcherResolves<T>>;

export declare type SearcherAdapter<T = any> = (searcher: DjolarSearcher<T>) => void;

export const SearcherDefaults: {
  searchFunc: SearchFunc<any>;
} = {
  searchFunc: defaultWebSearchFunc,
};

class DjolarSearcher<O = any> {
  pagination: SearcherPagination = createSearcherPagination();
  globalOption: SearchOptions = {};
  searchFunc: SearchFunc<O> = SearcherDefaults.searchFunc;
  hooks = {
    onFail: [] as FailHook<SearcherResolves<O>>[],
    onSuccess: [] as SuccessHook<SearcherResolves<O>>[],
  };

  addHook(
    type: "onFail" | "onSuccess",
    hook: FailHook<SearcherResolves<O>> | SuccessHook<SearcherResolves<O>>
  ) {
    // @ts-ignore
    this.hooks[type].push(hook);
    return this;
  }

  setAdapter(a: SearcherAdapter<O>) {
    a(this);
    return this;
  }

  setOption(opt: SearcherContextOptions<O>) {
    if (opt.pagination)
      this.pagination = Object.assign(this.pagination, opt.pagination);
    if (opt.globalSearchOption)
      this.globalOption = Object.assign(
        this.globalOption,
        opt.globalSearchOption
      );
    if (opt.searchFunc) this.searchFunc = opt.searchFunc;
    return this;
  }

  resetPagination(pagination?: SearcherPaginationOptions) {
    this.setOption({
      pagination: Object.assign(
        {
          page: 1,
          rowsNumber: 0,
        },
        pagination
      ),
    });
  }

  constructor(opt?: SearcherContextOptions<O>) {
    if (opt) this.setOption(opt);
  }

  searchWithPagination(axios: AxiosInstance, option: SearchOptions) {
    return new Promise<SearcherResolves<O>>((resolve, reject) => {
      this.searchOnly(axios, option)
        .then((resolves) => {
          const resolvedPagination =
            (resolves.response.count || 0) > 0
              ? {
                  rowsNumber: resolves.response.count,
                }
              : {};
          this.pagination = Object.assign(
            this.pagination,
            option.pagination,
            resolvedPagination
          );
          resolve(resolves);
        })
        .catch(reject);
    });
  }

  searchOnly(
    axios: AxiosInstance,
    option: SearchOptions
  ): Promise<SearcherResolves<O>> {
    return this.searchFunc(
      this,
      axios,
      Object.assign(option, {
        pagination: Object.assign(this.pagination, option.pagination),
        filter: Object.assign({}, this.globalOption.filter, option.filter),
        listUrl: option.listUrl || this.globalOption.listUrl || "",
        extraQuery: Object.assign(
          {},
          this.globalOption.extraQuery,
          option.extraQuery
        ),
        extraData: Object.assign({}, this.globalOption.extraData, option.extraData),
        config: Object.assign({}, this.globalOption.config, option.config),
        castFunc: option.castFunc || this.globalOption.castFunc || (data => data),
      })
    );
  }
}

export default DjolarSearcher;
