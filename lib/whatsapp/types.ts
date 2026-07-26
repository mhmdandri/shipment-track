export interface WhatsappCommandContext {
  sender: string;
  alternateSender?: string;
  payload: unknown;
  text: string;
  args: string[];
}
