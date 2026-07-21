export interface WhatsappCommandContext {
  sender: string;
  payload: any;
  text: string;
  args: string[];
}
