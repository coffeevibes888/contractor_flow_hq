// Client-side analytics tracking system
// Tracks page views, clicks, scroll depth, time on page, and form interactions

interface AnalyticsConfig {
  enabled: boolean;
  trackClicks: boolean;
  trackScrollDepth: boolean;
  trackFormInteractions: boolean;
  apiEndpoint: string;
}

interface PageViewData {
  sessionId: string;
  path: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  device: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  timeOnPage?: number;
  scrollDepth?: number;
  exitPage?: boolean;
}

interface ClickEventData {
  sessionId: string;
  path: string;
  elementId?: string;
  elementClass?: string;
  elementTag: string;
  elementText?: string;
  xPosition: number;
  yPosition: number;
}

class AnalyticsTracker {
  private config: AnalyticsConfig;
  private sessionId: string;
  private pageStartTime: number;
  private maxScrollDepth: number = 0;
  private clickBuffer: ClickEventData[] = [];
  private pageViewId: string | null = null;
  private isExiting: boolean = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      trackClicks: true,
      trackScrollDepth: true,
      trackFormInteractions: true,
      apiEndpoint: '/api/analytics',
      ...config,
    };

    this.sessionId = this.getOrCreateSessionId();
    this.pageStartTime = Date.now();

    // Only initialize if we're in a browser environment
    if (this.config.enabled && typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Track page view on load
    this.trackPageView();

    // Track clicks
    if (this.config.trackClicks) {
      document.addEventListener('click', this.handleClick.bind(this));
    }

    // Track scroll depth
    if (this.config.trackScrollDepth) {
      window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    // Track form interactions
    if (this.config.trackFormInteractions) {
      this.initFormTracking();
    }

    // Track page exit
    window.addEventListener('beforeunload', this.handlePageExit.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Flush click buffer periodically
    setInterval(() => this.flushClickBuffer(), 5000);
  }

  private getOrCreateSessionId(): string {
    const key = 'analytics_session_id';
    let sessionId = sessionStorage.getItem(key);
    
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, sessionId);
    }
    
    return sessionId;
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Other';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  }

  private getUTMParams(): Record<string, string | undefined> {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
    };
  }

  private async trackPageView() {
    // Guard against SSR - only track in browser
    if (typeof window === 'undefined') {
      return;
    }

    const data: PageViewData = {
      sessionId: this.sessionId,
      path: window.location.pathname,
      referrer: document.referrer,
      ...this.getUTMParams(),
      device: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    try {
      const response = await fetch(`${this.config.apiEndpoint}/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        this.pageViewId = result.id;
      } else {
        console.warn('Analytics pageview tracking failed:', response.status, response.statusText);
      }
    } catch (error) {
      // Silently fail in development to avoid console noise
      if (process.env.NODE_ENV === 'development') {
        console.debug('Analytics tracking error (non-critical):', error);
      }
    }
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // SVG elements expose `className` as a `SVGAnimatedString`, not a string.
    // Coerce defensively so we never throw on a page with SVG icons.
    let elementClass: string | undefined;
    const rawClass = (target as any)?.className;
    if (typeof rawClass === 'string') {
      elementClass = rawClass || undefined;
    } else if (rawClass && typeof rawClass === 'object' && 'baseVal' in rawClass) {
      elementClass = (rawClass as any).baseVal || undefined;
    } else if (rawClass) {
      elementClass = String(rawClass);
    }
    
    const clickData: ClickEventData = {
      sessionId: this.sessionId,
      path: window.location.pathname,
      elementId: target.id || undefined,
      elementClass,
      elementTag: target.tagName.toLowerCase(),
      elementText: target.textContent?.substring(0, 100) || undefined,
      xPosition: event.clientX,
      yPosition: event.clientY + window.scrollY,
    };

    this.clickBuffer.push(clickData);

    // Flush immediately for important clicks (buttons, links)
    if (['button', 'a'].includes(clickData.elementTag)) {
      this.flushClickBuffer();
    }
  }

  private async flushClickBuffer(useBeacon: boolean = false) {
    if (this.clickBuffer.length === 0) return;

    const clicks = [...this.clickBuffer];
    this.clickBuffer = [];

    const url = `${this.config.apiEndpoint}/clicks`;
    const payload = JSON.stringify({ clicks });

    // Use sendBeacon on page-exit paths so we don't drop the trailing batch.
    if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      } catch {
        // Fall through to fetch with keepalive below.
      }
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    } catch {
      // Network unavailable — put the clicks back so the next flush has a chance.
      // Do not log: Failed to fetch is expected when the server is briefly unreachable.
      this.clickBuffer = clicks.concat(this.clickBuffer);
    }
  }

  private handleScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const scrollPercent = Math.round((scrolled / scrollHeight) * 100);
    
    if (scrollPercent > this.maxScrollDepth) {
      this.maxScrollDepth = Math.min(scrollPercent, 100);
    }
  }

  private async handlePageExit() {
    if (this.isExiting) return;
    this.isExiting = true;

    const timeOnPage = Date.now() - this.pageStartTime;

    // Update page view with exit data
    if (this.pageViewId) {
      const data = {
        id: this.pageViewId,
        timeOnPage,
        scrollDepth: this.maxScrollDepth,
        exitPage: true,
      };

      // Use sendBeacon for reliable exit tracking
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(`${this.config.apiEndpoint}/pageview/exit`, blob);
    }

    // Flush any remaining clicks reliably — fetch() fires during unload are
    // unreliable, sendBeacon is the supported path.
    await this.flushClickBuffer(true);
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.handlePageExit();
    }
  }

  private initFormTracking() {
    // Track all form interactions
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.trackFormInteraction(target, 'focus');
      }
    });

    document.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.trackFormInteraction(target, 'blur');
      }
    });

    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      this.trackFormInteraction(form, 'submit');
    });
  }

  private async trackFormInteraction(element: HTMLElement, action: string) {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return;
    }

    const form = element.closest('form');
    const formId = String(form?.id || form?.getAttribute('name') || 'unknown');
    const formName = String(form?.getAttribute('data-form-name') || formId);
    const el = element as HTMLInputElement;

    // Explicitly extract only primitive values — never pass DOM nodes or
    // React fiber-attached objects into JSON.stringify.
    const data: Record<string, string | boolean> = {
      sessionId: String(this.sessionId ?? ''),
      formId,
      formName,
      fieldName: String(el.name || el.id || el.getAttribute('name') || el.getAttribute('id') || ''),
      action: String(action),
      completed: action === 'submit',
    };

    try {
      await fetch(`${this.config.apiEndpoint}/form-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Form tracking error (non-critical):', error);
      }
    }
  }

  /**
   * Re-trigger a page view on client-side navigation.
   * Resets per-page state (start time, max scroll depth) so subsequent exit
   * metrics are correct.
   */
  public async trackRouteChange(_nextPath?: string) {
    // Flush anything outstanding from the previous page before resetting.
    await this.flushClickBuffer();
    this.isExiting = false;
    this.pageStartTime = Date.now();
    this.maxScrollDepth = 0;
    this.pageViewId = null;
    await this.trackPageView();
  }

  // Public method to track conversions
  public async trackConversion(type: string, value?: number) {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await fetch(`${this.config.apiEndpoint}/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          conversionType: type,
          conversionValue: value,
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Conversion tracking error (non-critical):', error);
      }
    }
  }

  // Public method to track funnel steps
  public async trackFunnelStep(step: string, stepOrder: number, metadata?: Record<string, any>) {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await fetch(`${this.config.apiEndpoint}/funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          step,
          stepOrder,
          metadata,
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Funnel tracking error (non-critical):', error);
      }
    }
  }
}

// Export singleton instance
let trackerInstance: AnalyticsTracker | null = null;

export function initAnalytics(config?: Partial<AnalyticsConfig>): AnalyticsTracker {
  if (!trackerInstance && typeof window !== 'undefined') {
    trackerInstance = new AnalyticsTracker(config);
  }
  return trackerInstance!;
}

export function getAnalytics(): AnalyticsTracker | null {
  return trackerInstance;
}

export default AnalyticsTracker;
