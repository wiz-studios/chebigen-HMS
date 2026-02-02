import { useQuery, UseQueryOptions } from 'react-query';
import { createClient } from '@/lib/supabase/client';
import { getCachedListData, setCachedListData, generateCacheKey } from '@/lib/cache';

export interface PaginationParams {
  page: number;
  limit: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function usePaginatedList<T>(
  resource: string,
  params: PaginationParams,
  options?: UseQueryOptions<PaginatedResult<T>, Error>
) {
  const queryKey = [resource, params];
  const supabase = createClient();

  return useQuery<PaginatedResult<T>, Error>(
    queryKey,
    async () => {
      const { page, limit, filters = {}, sortBy, sortOrder = 'desc' } = params;
      const offset = (page - 1) * limit;
      
      // Try to get from cache first
      const cacheKey = generateCacheKey(resource, { page, limit, ...filters, sortBy, sortOrder });
      const cached = getCachedListData<PaginatedResult<T>>(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      let query = supabase
        .from(resource)
        .select('*', { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object') {
            // Handle range filters
            if (value.gte) query = query.gte(key, value.gte);
            if (value.lte) query = query.lte(key, value.lte);
            if (value.like) query = query.ilike(key, `%${value.like}%`);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      const result = {
        data: data as T[],
        meta: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };

      // Cache the result
      setCachedListData(cacheKey, result);

      return result;
    },
    {
      keepPreviousData: true,
      staleTime: 30000, // Consider data fresh for 30 seconds
      ...options,
    }
  );
}

// Example usage:
// const {
//   data,
//   isLoading,
//   error,
//   isFetching,
// } = usePaginatedList('patients', {
//   page: 1,
//   limit: 20,
//   filters: {
//     status: 'active',
//     department_id: selectedDepartment,
//   },
//   sortBy: 'created_at',
//   sortOrder: 'desc',
// });