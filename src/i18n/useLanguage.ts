import { useSyncExternalStore } from 'react'
import { getLanguage, subscribeLanguage } from './index'
export const useLanguage = () => useSyncExternalStore(subscribeLanguage, getLanguage, () => 'en' as const)
