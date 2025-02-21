import { useQuery } from '@tanstack/react-query';
import type { TLEData } from '@/types';
import { tleService } from '@/services/tleService';

/**
 * TLEデータを取得・管理するカスタムフック
 * @param noradId 衛星のNORAD ID
 */
export const useTLE = (noradId: string) => {
  return useQuery<TLEData, Error>({
    queryKey: ['tle', noradId],
    queryFn: () => tleService.getTLE(noradId),
    staleTime: 1000 * 60 * 60, // 1時間
    gcTime: 1000 * 60 * 60 * 24, // 24時間
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
