// ============================================================
// LINE API Type Definitions
// ============================================================

// --------------------------------------------------
// Webhook Event Types
// --------------------------------------------------

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export type LineWebhookEvent =
  | LineFollowEvent
  | LineUnfollowEvent
  | LineMessageEvent
  | LinePostbackEvent
  | LineJoinEvent
  | LineLeaveEvent;

export interface LineEventBase {
  type: string;
  timestamp: number;
  source: LineEventSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  mode: 'active' | 'standby';
}

export interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineFollowEvent extends LineEventBase {
  type: 'follow';
  replyToken: string;
}

export interface LineUnfollowEvent extends LineEventBase {
  type: 'unfollow';
}

export interface LineMessageEvent extends LineEventBase {
  type: 'message';
  replyToken: string;
  message: LineReceivedMessage;
}

export interface LinePostbackEvent extends LineEventBase {
  type: 'postback';
  replyToken: string;
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
      newRichMenuAliasId?: string;
      status?: string;
    };
  };
}

export interface LineJoinEvent extends LineEventBase {
  type: 'join';
  replyToken: string;
}

export interface LineLeaveEvent extends LineEventBase {
  type: 'leave';
}

// --------------------------------------------------
// Received Message Types
// --------------------------------------------------

export type LineReceivedMessage =
  | LineTextMessage
  | LineImageMessage
  | LineVideoMessage
  | LineAudioMessage
  | LineStickerMessage
  | LineLocationMessage
  | LineFileMessage;

export interface LineTextMessage {
  id: string;
  type: 'text';
  text: string;
  emojis?: LineMessageEmoji[];
  mention?: LineMessageMention;
}

export interface LineImageMessage {
  id: string;
  type: 'image';
  contentProvider: LineContentProvider;
  imageSet?: {
    id: string;
    index: number;
    total: number;
  };
}

export interface LineVideoMessage {
  id: string;
  type: 'video';
  duration: number;
  contentProvider: LineContentProvider;
}

export interface LineAudioMessage {
  id: string;
  type: 'audio';
  duration: number;
  contentProvider: LineContentProvider;
}

export interface LineStickerMessage {
  id: string;
  type: 'sticker';
  packageId: string;
  stickerId: string;
  stickerResourceType: string;
}

export interface LineLocationMessage {
  id: string;
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LineFileMessage {
  id: string;
  type: 'file';
  fileName: string;
  fileSize: number;
}

export interface LineMessageEmoji {
  index: number;
  length: number;
  productId: string;
  emojiId: string;
}

export interface LineMessageMention {
  mentionees: Array<{
    index: number;
    length: number;
    userId: string;
  }>;
}

export interface LineContentProvider {
  type: 'line' | 'external';
  originalContentUrl?: string;
  previewImageUrl?: string;
}

// --------------------------------------------------
// Profile
// --------------------------------------------------

export interface LineProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

// --------------------------------------------------
// Send Message Types
// --------------------------------------------------

export type LineSendMessage =
  | LineSendTextMessage
  | LineSendImageMessage
  | LineSendVideoMessage
  | LineSendAudioMessage
  | LineSendStickerMessage
  | LineSendLocationMessage
  | LineSendTemplateMessage
  | LineFlexMessage;

export interface LineSendTextMessage {
  type: 'text';
  text: string;
  emojis?: LineMessageEmoji[];
  quickReply?: LineQuickReply;
}

export interface LineSendImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
  quickReply?: LineQuickReply;
}

export interface LineSendVideoMessage {
  type: 'video';
  originalContentUrl: string;
  previewImageUrl: string;
  trackingId?: string;
  quickReply?: LineQuickReply;
}

export interface LineSendAudioMessage {
  type: 'audio';
  originalContentUrl: string;
  duration: number;
  quickReply?: LineQuickReply;
}

export interface LineSendStickerMessage {
  type: 'sticker';
  packageId: string;
  stickerId: string;
  quickReply?: LineQuickReply;
}

export interface LineSendLocationMessage {
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  quickReply?: LineQuickReply;
}

export interface LineSendTemplateMessage {
  type: 'template';
  altText: string;
  template: LineTemplate;
  quickReply?: LineQuickReply;
}

// --------------------------------------------------
// Quick Reply
// --------------------------------------------------

export interface LineQuickReply {
  items: LineQuickReplyItem[];
}

export interface LineQuickReplyItem {
  type: 'action';
  imageUrl?: string;
  action: LineAction;
}

// --------------------------------------------------
// Template Types
// --------------------------------------------------

export type LineTemplate =
  | LineButtonsTemplate
  | LineConfirmTemplate
  | LineCarouselTemplate;

export interface LineButtonsTemplate {
  type: 'buttons';
  thumbnailImageUrl?: string;
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: LineAction;
  actions: LineAction[];
}

export interface LineConfirmTemplate {
  type: 'confirm';
  text: string;
  actions: [LineAction, LineAction];
}

export interface LineCarouselTemplate {
  type: 'carousel';
  columns: LineCarouselColumn[];
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
}

export interface LineCarouselColumn {
  thumbnailImageUrl?: string;
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: LineAction;
  actions: LineAction[];
}

// --------------------------------------------------
// Action Types
// --------------------------------------------------

export type LineAction =
  | LinePostbackAction
  | LineMessageAction
  | LineUriAction
  | LineDatetimePickerAction;

export interface LinePostbackAction {
  type: 'postback';
  label: string;
  data: string;
  displayText?: string;
  inputOption?: 'closeRichMenu' | 'openRichMenu' | 'openKeyboard' | 'openVoice';
  fillInText?: string;
}

export interface LineMessageAction {
  type: 'message';
  label: string;
  text: string;
}

export interface LineUriAction {
  type: 'uri';
  label: string;
  uri: string;
  altUri?: {
    desktop: string;
  };
}

export interface LineDatetimePickerAction {
  type: 'datetimepicker';
  label: string;
  data: string;
  mode: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
}

// --------------------------------------------------
// Flex Message Types
// --------------------------------------------------

export interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
  quickReply?: LineQuickReply;
}

export type FlexContainer = FlexBubble | FlexCarousel;

export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  direction?: 'ltr' | 'rtl';
  header?: FlexBox;
  hero?: FlexImage | FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: FlexBubbleStyles;
  action?: LineAction;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexBubbleStyles {
  header?: FlexBlockStyle;
  hero?: FlexBlockStyle;
  body?: FlexBlockStyle;
  footer?: FlexBlockStyle;
}

export interface FlexBlockStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

// --------------------------------------------------
// Flex Components
// --------------------------------------------------

export type FlexComponent =
  | FlexBox
  | FlexButton
  | FlexImage
  | FlexText
  | FlexSeparator
  | FlexFiller
  | FlexSpacer
  | FlexIcon;

export interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  maxHeight?: string;
  flex?: number;
  spacing?: FlexSpacing;
  margin?: FlexSpacing;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  position?: 'relative' | 'absolute';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
  action?: LineAction;
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

export interface FlexButton {
  type: 'button';
  action: LineAction;
  flex?: number;
  margin?: FlexSpacing;
  position?: 'relative' | 'absolute';
  height?: 'sm' | 'md';
  style?: 'link' | 'primary' | 'secondary';
  color?: string;
  gravity?: 'top' | 'bottom' | 'center';
  adjustMode?: 'shrink-to-fit';
}

export interface FlexImage {
  type: 'image';
  url: string;
  flex?: number;
  margin?: FlexSpacing;
  position?: 'relative' | 'absolute';
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  size?: FlexImageSize;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  backgroundColor?: string;
  action?: LineAction;
  animated?: boolean;
}

export interface FlexText {
  type: 'text';
  text: string;
  contents?: FlexSpan[];
  adjustMode?: 'shrink-to-fit';
  flex?: number;
  margin?: FlexSpacing;
  position?: 'relative' | 'absolute';
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  size?: FlexTextSize;
  weight?: 'regular' | 'bold';
  color?: string;
  style?: 'normal' | 'italic';
  decoration?: 'none' | 'underline' | 'line-through';
  wrap?: boolean;
  maxLines?: number;
  action?: LineAction;
  lineSpacing?: string;
}

export interface FlexSpan {
  type: 'span';
  text: string;
  size?: FlexTextSize;
  weight?: 'regular' | 'bold';
  color?: string;
  style?: 'normal' | 'italic';
  decoration?: 'none' | 'underline' | 'line-through';
}

export interface FlexSeparator {
  type: 'separator';
  margin?: FlexSpacing;
  color?: string;
}

export interface FlexFiller {
  type: 'filler';
  flex?: number;
}

export interface FlexSpacer {
  type: 'spacer';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export interface FlexIcon {
  type: 'icon';
  url: string;
  margin?: FlexSpacing;
  position?: 'relative' | 'absolute';
  size?: FlexImageSize;
  aspectRatio?: string;
}

// --------------------------------------------------
// Flex Sizing Types
// --------------------------------------------------

export type FlexSpacing =
  | 'none'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl';

export type FlexTextSize =
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl'
  | '3xl'
  | '4xl'
  | '5xl';

export type FlexImageSize =
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl'
  | '3xl'
  | '4xl'
  | '5xl'
  | 'full';

// --------------------------------------------------
// API Response Types
// --------------------------------------------------

export interface LineApiError {
  message: string;
  details?: Array<{
    message: string;
    property: string;
  }>;
}

export interface LinePushMessageResponse {
  sentMessages: Array<{
    id: string;
    quoteToken: string;
  }>;
}

export interface LineReplyMessageResponse {
  sentMessages: Array<{
    id: string;
    quoteToken: string;
  }>;
}

export interface LineMulticastResponse {
  // Empty on success (HTTP 200)
}

export interface LineBroadcastResponse {
  // Empty on success (HTTP 200)
}

export interface LineMessageQuotaResponse {
  type: 'none' | 'limited';
  value?: number;
}

export interface LineMessageQuotaConsumptionResponse {
  totalUsage: number;
}
