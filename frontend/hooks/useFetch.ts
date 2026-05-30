// Custom Hook - Generic data fetching wrapper
// Bọc useQuery từ React Query để fetch data từ API
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";

type UseFetchOptions<TData, TError = AxiosError> = Omit<
  UseQueryOptions<TData, TError>,
  "queryKey" | "queryFn"
>;

/**
 * Hook để fetch dữ liệu từ API
 * @param queryKey - Query key cho React Query caching
 * @param queryFn - Async function để fetch data
 * @param options - Tuỳ chọn React Query
 * @returns Object với data, isLoading, error, etc
 *
 * Ví dụ:
 * const { data, isLoading } = useFetch(
 *   ['products'],
 *   () => productService.getProducts()
 * )
 */
export function useFetch<TData, TError = AxiosError>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: UseFetchOptions<TData, TError>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}

export default useFetch;
