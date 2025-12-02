import { helpScoutAPI } from '@/modules/helpscout';

interface SupportMessageOptions {
  subject: string;
  text?: string;
}

/**
 * Open HelpScout support beacon with a pre-filled message
 * @param options - Subject and optional pre-filled text for the message
 */
export function openSupportMessage(options: SupportMessageOptions): void {
  helpScoutAPI.open();
  helpScoutAPI.navigate('/ask/message/');
  helpScoutAPI.prefill(options);
}
