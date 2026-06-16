export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  variables: string[];
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    title: 'Welcome to TheOneTrade!',
    body: 'Hi {name}, welcome aboard! Start exploring trading signals now.',
    variables: ['name'],
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    title: 'Subscription Expiring Soon',
    body: 'Hi {name}, your {segment} {plan} plan is expiring soon. Renew now to continue receiving signals.',
    variables: ['name', 'segment', 'plan'],
  },
  {
    id: 'market_alert',
    name: 'Market Alert',
    title: 'Market Alert',
    body: '{message}',
    variables: ['message'],
  },
  {
    id: 'custom',
    name: 'Custom',
    title: '{title}',
    body: '{body}',
    variables: ['title', 'body'],
  },
];

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}
