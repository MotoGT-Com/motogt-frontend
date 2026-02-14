import {  useInfiniteQuery, type QueryKey, type UseInfiniteQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

export function useInfiniteQueryWithScrollPagination<TQueryFnData, TError, TData, TQueryKey extends QueryKey, TPageParam>(queryOptions: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>) {
  const { ref, inView } = useInView();
  const infiniteQuery = useInfiniteQuery(queryOptions);
  useEffect(() => {
    if (inView && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [inView, infiniteQuery.hasNextPage, infiniteQuery.isFetchingNextPage, infiniteQuery.fetchNextPage]);
  return { ...infiniteQuery, paginatorRef: ref };
}