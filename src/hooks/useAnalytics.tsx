// Analytics disabled: Mixpanel removed
function useAnalytics() {
  function trackEvent(_eventName: string, _tags: Record<string, string> = {}) {
    // No-op
  }
  return { trackEvent };
}

export default useAnalytics;
