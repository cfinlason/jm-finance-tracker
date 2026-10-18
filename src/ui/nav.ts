import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/** Back if there is history (normal flow); otherwise land on the budget (after a reload or deep link). */
export function goBack(router: AppRouter) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
