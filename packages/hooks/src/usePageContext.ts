import { useLocation } from 'react-router-dom';

export interface PageContext {
  page: string;
  entityType?: 'ticket' | 'project' | 'kb_article' | 'user' | 'delivery_item' | 'onboarding_item';
  entityId?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function usePageContext(): PageContext {
  const location = useLocation();
  const { pathname } = location;

  // Extract entity IDs from common route patterns
  // Only treat the segment as an entityId if it looks like a UUID,
  // so list pages like /tickets/triage are not mistaken for detail pages.
  const ticketMatch = pathname.match(/^\/tickets\/([^/]+)$/);
  if (ticketMatch && isUuid(ticketMatch[1])) {
    return { page: pathname, entityType: 'ticket', entityId: ticketMatch[1] };
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (projectMatch && isUuid(projectMatch[1])) {
    return { page: pathname, entityType: 'project', entityId: projectMatch[1] };
  }

  const kbMatch = pathname.match(/^\/knowledge\/articles\/([^/]+)$/);
  if (kbMatch && isUuid(kbMatch[1])) {
    return { page: pathname, entityType: 'kb_article', entityId: kbMatch[1] };
  }

  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch && isUuid(userMatch[1])) {
    return { page: pathname, entityType: 'user', entityId: userMatch[1] };
  }

  const deliveryMatch = pathname.match(/^\/delivery\/([^/]+)$/);
  if (deliveryMatch && isUuid(deliveryMatch[1])) {
    return { page: pathname, entityType: 'delivery_item', entityId: deliveryMatch[1] };
  }

  const onboardingMatch = pathname.match(/^\/onboarding\/([^/]+)$/);
  if (onboardingMatch && isUuid(onboardingMatch[1])) {
    return { page: pathname, entityType: 'onboarding_item', entityId: onboardingMatch[1] };
  }

  return { page: pathname };
}
