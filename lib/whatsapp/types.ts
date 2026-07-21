export interface WhatsappCommandContext {
  sender: string;
  payload: unknown;
  text: string;
  args: string[];
}
